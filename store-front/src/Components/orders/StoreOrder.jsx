import React, {useEffect, useState} from "react";
import "./StoreOrder.css";
import {useNavigate} from "react-router-dom";
import {requireStoreSessionOrRedirect} from "../utils/storeSession";
import TopBar from "../Bar/TopBar";


const StoreOrder = () => {
    const navigate = useNavigate();
    const session = requireStoreSessionOrRedirect();
    const storeId = session?.storeId;
    const storeName = session?.storeName;

    const [orders, setOrders] = useState([]);
    const [expandedOrders, setExpandedOrders] = useState({});

    useEffect(() => {
        if (!storeId) return;

        let intervalId;
        const fetchOrders = async () => {
            try {
                const response = await fetch(
                    `https://yv6baxe2i0.execute-api.us-east-1.amazonaws.com/dev/getAllOrdersFromStore/${storeId}`
                );
                const data = await response.json();
                if (!data.orders) {
                    console.log("❌ No orders found");
                } else {
                    seperateOrders(data.orders);
                }
            } catch (error) {
                console.error("Error fetching orders:", error);
            }
        };

        fetchOrders();
        intervalId = setInterval(fetchOrders, 1000);
        return () => clearInterval(intervalId);
    }, [storeId]);

    const seperateOrders = (allOrdersFromStore) => {
        const formatted = allOrdersFromStore.map(order => ({
            id: order.order_num,
            clientName: order.customer_name,
            totalPrice: order.total_price,
            location: order.customer_Location,
            customerMail: order.customer_mail,
            street: "",
            status: order.status,
            products: order.items.map(item => {
                const [name, quantity] = item.split(":").map(s => s.trim());
                return {name, quantity: parseInt(quantity, 10)};
            })
        }));
        setOrders(formatted);
    };

    const toggleExpand = (id) => {
        setExpandedOrders(prev => ({...prev, [id]: !prev[id]}));
    };

    const handleStatusChange = async (order, status) => {
        await fetch("https://yv6baxe2i0.execute-api.us-east-1.amazonaws.com/dev/updateOrderFromStore", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                order_num: order.id,
                store_id: storeId,
                order_status: status,
            }),
        });

        await fetch("https://oa608utwwh.execute-api.us-east-1.amazonaws.com/dev/decreaseProductsFromStoreAfterSell", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                store_id: storeId,
                order: order.products.map(p => `${p.name}: ${p.quantity}`)
            }),
        });

        await fetch("https://2h3yf1xica.execute-api.us-east-1.amazonaws.com/dev/mailToCustomer/infoCustomerAboutOrder", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                customerMail: order.customerMail,
                customerName: order.clientName,
                orderId: order.id,
                orderInfo: `Dear ${order.clientName},

Your order is #${order.id} from ${storeName} store.

Summary:
- Total Price: ₪${order.totalPrice}
- Status: ${status === "ready" ? "Ready for delivery" : "Cancelled by store and will not be charged"}

If you have any questions, please contact us through the PrepPal app.

This is an automated message — please do not reply.

Best regards,
PrepPal Team`
            }),
        });
    };

    if (!session) return null;

    return (
        <>
            <TopBar/>
            <div className="store-orders-wrapper">

                <h2 className="store-title">{storeName} orders</h2>
                <div className="orders-container">
                    {orders.length === 0 ? (
                        <p>no orders</p>
                    ) : (
                        orders.map((order) => (
                            <div key={order.id} className={`order-card ${expandedOrders[order.id] ? "expanded" : ""}`}>
                                <h3>Order #{order.id}</h3>
                                <p><strong>Name:</strong> {order.clientName}</p>
                                <p><strong>Price:</strong> ₪{order.totalPrice}</p>
                                <p><strong>Location:</strong> {order.location}, {order.street}</p>
                                <p><strong>Status:</strong> {order.status}</p>
                                <p><strong>Email:</strong> {order.customerMail}</p>

                                <button className="toggle-button" onClick={() => toggleExpand(order.id)}>
                                    {expandedOrders[order.id] ? "Hide Products" : "Show Products"}
                                </button>

                                {expandedOrders[order.id] && (
                                    <div className="product-grid">
                                        {order.products.map((p, idx) => (
                                            <div key={idx} className="product-chip">
                                                <span className="product-name">{p.name}</span>
                                                <span className="product-qty">× {p.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {order.status === "pending" && (
                                    <div className="card-buttons">
                                        <button className="ready-btn"
                                                onClick={() => handleStatusChange(order, "ready")}>
                                            Mark as Ready
                                        </button>
                                        <button className="reject-btn"
                                                onClick={() => handleStatusChange(order, "rejected")}>
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default StoreOrder;
