import React, { useState, useEffect, useRef } from "react";
import OrderChat from "./OrderChat";
import CurrentOrder from "./CurrentOrder";
import "./CustomerScreen.css";
import TopBar from "../ToolBar/TopBar";
import PreviousOrders from "./PreviousOrders";
import ActiveOrders from "./ActiveOrders";

// Israel-only address validation utils
import {
    validateILAddress,
    geoErrorToMessage,
} from "../utils/checkValidAddress";

// Parse "City, Street, Number" into parts
function parseAddress3(s = "") {
    const parts = String(s).split(",").map(p => p.trim()).filter(Boolean);
    return { city: parts[0] || "", street: parts[1] || "", apt: parts[2] || "" };
}



export default function CustomerScreen() {
    const [orderItems, setOrderItems] = useState([]);
    const [orderSent, setOrderSent] = useState(false);
    const [customerAddressOrder, setCustomerAddressOrder] = useState(null);
    const [coords, setCoords] = useState(null); // {lat, lng} when validated
    const [storeId, setStoreId] = useState(null);
    const [olderOrderItems, setOlderOrderItems] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const chatPanelRef = useRef(null);
    const [chatPrefill, setChatPrefill] = useState("");
    const [chatKey, setChatKey] = useState(1);
    const [startingChatId, setStartingChatId] = useState("");
    const [newChat, setNewChat] = useState(true);
    const handleProfileSaved = (u) => {
        setCustomerAddressOrder(u?.address || null); 
        setCoords(null);                       
    };

    useEffect(() => { 
        try {
            const saved = localStorage.getItem("pp_order_items");
            if (saved) {
                const items = JSON.parse(saved);
                console.log(`items:`,items)
                if (Array.isArray(items)) setOrderItems(items);

            }
        } catch { }
    }, []);

    useEffect(() => { 
        try {
            localStorage.setItem("pp_order_items", JSON.stringify(orderItems));
        } catch { }
    }, [orderItems]); 

    const startNewChat = async (addrOverride) => {
        try {
            // clear order
            setOrderItems([]);
            localStorage.removeItem("pp_order_items");
            setOrderSent(false);
            setStoreId(null);

            // clear local chat
            localStorage.removeItem("pp_chat_id");
            setChatPrefill("");

            
            const addressToUse = addrOverride ?? customerAddressOrder ?? customer_address ?? "";

            const res = await fetch(
                `https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/client/createchat?client_id=${customer_id}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address: addressToUse }),
                }
            );

            const json = await res.json();
            const newId = json?.chat_id || "";
            if (newId) {
                localStorage.setItem("pp_chat_id", newId);
                setStartingChatId(newId);
            } else {
                setStartingChatId("");
            }

            setChatKey(prev => prev + 1); // force re-mount
            chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
            console.error("Start new chat failed:", err);
        }
    };

    const loadOrderToChat = (arg) => {

        const order = Array.isArray(arg?.items) ? arg : arg?.order;
        const explicitText = arg?.chatText;

        let line = explicitText;
        if (!line && order) {
            const parts = (order.items || []).map((it) => {
                if (typeof it === "string") {
                    const [name, qty] = it.split(":").map(s => String(s || "").trim());
                    return `${name} x ${qty || 1}`;
                }
                const name = String(it?.name ?? it?.product ?? "item");
                const qty = Number(it?.quantity ?? it?.qty ?? 1);
                return `${name} x ${qty}`;
            });
            line = parts.join(", ");
        }

        setChatPrefill(line ? `${line}` : "");
        // Do NOT setOrderItems here – user will send to the bot first
        chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // Session guard
    useEffect(() => {
        const userStr = localStorage.getItem("pp_user");
        if (!userStr) {
            window.location.href = "/login";
            return;
        }
        try {
            const user = JSON.parse(userStr);
            const token = user.idToken;
            const payload = JSON.parse(atob(token.split(".")[1]));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                localStorage.removeItem("pp_user");
                window.location.href = "/login";
            }
        } catch {
            localStorage.removeItem("pp_user");
            window.location.href = "/login";
        }
    }, []);

    // Current user (after guard)
    const user = (() => {
        try {
            return JSON.parse(localStorage.getItem("pp_user") || "null");
        } catch {
            return null;
        }
    })();

    const customer_id = user?.sub;
    const customerName = user?.name;
    const customerMail = user?.email;
    const customer_address = user?.address;

    // Ask for delivery address on mount
    useEffect(() => {
        if (!customer_address) return;
        (async () => {
            if (newChat) {
                setNewChat(false);
                setCustomerAddressOrder(customer_address);
                // Ask until valid address in Israel or user cancels to saved address
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer_address]);

    // Load previous + active orders
    useEffect(() => {
        (async () => {
            try {
                const oldestRes = await fetch(
                    `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/getOldestsOrders/${customer_id}`,
                    { method: "GET", headers: { "Content-Type": "application/json" } }
                );
                const oldestJson = await oldestRes.json();
                const oldestOrdersArr = Array.isArray(oldestJson?.orders) ? oldestJson.orders : [];
                const parsedOldest = oldestOrdersArr.map(order => ({
                    items: (order.items || []).map(it => {
                        if (typeof it === "string") {
                            const [name, quantity] = it.split(":").map(s => s.trim());
                            return { name, quantity: Number.parseInt(quantity || "1", 10) || 1 };
                        }
                        if (it && typeof it === "object") {
                            return {
                                name: String(it.name ?? it.product ?? "item"),
                                quantity: Number(it.quantity ?? it.qty ?? 1),
                            };
                        }
                        return { name: String(it), quantity: 1 };
                    }),
                }));
                setOlderOrderItems(parsedOldest);

                const activeRes = await fetch(
                    `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/activeOrders/${customer_id}`,
                    { method: "GET", headers: { "Content-Type": "application/json" } }
                );
                const activeJson = await activeRes.json();
                console.log(`activeJson:`, activeJson);
                setActiveOrders(Array.isArray(activeJson?.orders) ? activeJson.orders : []);
            } catch (e) {
                console.error("Load orders failed:", e);
            }
        })();
    }, [customer_id]);

    // Bot returned items -> now we do update Current Order
    const handleNewItems = (itemsList, store_id) => {
        if (!Array.isArray(itemsList)) return;
        console.log(`itemsList from bot:`, itemsList);

        (async () => {
            const newItems = await Promise.all(
                itemsList.map(async (item) => {
                    const ENDPOINT = "https://oa608utwwh.execute-api.us-east-1.amazonaws.com/dev/getProductImage";
                    const PLACEHOLDER = "https://img.icons8.com/ios-filled/50/cccccc/shopping-cart.png";

                    const storeId   = item.Store_id || item.store_id || store_id;
                    const productId = item.Id ?? item.id ?? item.product_id;

                    let imageUrl = PLACEHOLDER;
                    try {
                        const res = await fetch(ENDPOINT, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            // שימי לב: אם ה-Lambda שלך מצפה ל-id, שלחי id (כאן).
                            // אם הוא מצפה ל-product_id, החליפי את המפתח לשם.
                            body: JSON.stringify({ store_id: storeId, id: productId })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data?.image_url) imageUrl = data.image_url;
                        } else {
                            console.warn("getProductImage failed:", res.status);
                        }
                    } catch (e) {
                        console.warn("getProductImage error:", e);
                    }

                    const qty = parseInt(item.Quantity, 10) || 0;
                    const priceNum = parseFloat(item.Price) || 0;

                    return {
                        name: item.Name,
                        image: imageUrl,                                   // ← כאן שמנו את התמונה שחזרה מהלמבדה
                        quantity: qty,
                        price: +(priceNum * qty).toFixed(2),
                    };
                })
            );

            console.log(`newItems:`, newItems);
            setOrderItems(newItems);
            setStoreId(store_id);
        })();
    };

    const sendOrder = async () => {
        if (!customerAddressOrder) {
            alert("Missing delivery address.");
            return;
        }

        // Ensure coords exist
        let coordsToUse = coords;
        if (!coordsToUse) {
            const parsed = parseAddress3(customerAddressOrder);
            try {
                const { coords: c } = await validateILAddress({
                    city: parsed.city,
                    street: parsed.street,
                    apt: parsed.apt,
                });
                coordsToUse = c;
            } catch (err) {
                alert(geoErrorToMessage(err));
                return;
            }
        }

        const orderData = {
            storeId,
            customerName,
            customerMail,
            customerId: customer_id,
            customerLocation: customerAddressOrder,
            customerLat: coordsToUse.lat,
            customerLng: coordsToUse.lng,
            totalPrice: orderItems.reduce((sum, item) => sum + item.price, 0),
            items: orderItems.map(item => `${item.name}: ${item.quantity}`),
        };

        try {
            const res = await fetch(
                "https://yv6baxe2i0.execute-api.us-east-1.amazonaws.com/dev/addOrderToStore",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(orderData),
                }
            );
            await res.json().catch(() => ({}));
            setOrderSent(true);
            await startNewChat(customerAddressOrder);
            const activeRes = await fetch(
                `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/activeOrders/${customer_id}`,
                { method: "GET", headers: { "Content-Type": "application/json" } }
            );
            const activeJson = await activeRes.json();
            setActiveOrders(Array.isArray(activeJson?.orders) ? activeJson.orders : []);
            alert("Order sent successfully!, we open a new chat for you.");
        } catch (err) {
            console.error("Send order failed:", err);
            alert("Failed to send order. Please try again.");
        }
    };

    return (
        <>
            <TopBar
                onLogin={() => console.log("Login clicked")}
                onLogout={() => console.log("Logout clicked")}
                onAddLocation={() => console.log("Add Location clicked")}
                onNewChat={startNewChat}
                onProfileSaved={handleProfileSaved}
            />

            <div className="customer-layout">
                <div className="old-orders">
                    <PreviousOrders
                        orders={olderOrderItems}
                        onSelectOrder={loadOrderToChat}
                    />
                    <ActiveOrders orders={activeOrders} />
                </div>

                {/* Chat Area */}
                <div className="chat-panel" ref={chatPanelRef}>
                    <h2 className="section-title">Chat with PrepPal</h2>
                    <OrderChat
                        key={chatKey}
                        onNewItem={handleNewItems}
                        customer_id={customer_id}
                        customer_address={customerAddressOrder}
                        prefillText={chatPrefill}
                        startingChatId={startingChatId}
                    />
                </div>

                <div className="order-panel">
                    <h2 className="section-title">Current Order</h2>
                    <CurrentOrder items={orderItems}/>
                    <button
                        onClick={sendOrder}
                        className="send-order-btn"
                        disabled={orderItems.length === 0 || orderSent}
                    >
                        {orderSent ? "✅ Order Sent" : "Send Order"}
                    </button>
                </div>
            </div>
        </>
    );
}
