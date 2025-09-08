import React from "react";
import "./PreviousOrders.css";

export default function PreviousOrders({ orders = [], onSelectOrder }) {
    // Build a readable single line for the chat input
    const buildChatLine = (order) => {
        const parts = (order.items || []).map((it) => {
            if (typeof it === "string") {
                const [name, qty] = it.split(":").map(s => String(s || "").trim());
                return `${name} x ${qty || 1}`;
            }
            const name = String(it?.name ?? it?.product ?? "item");
            const qty  = Number(it?.quantity ?? it?.qty ?? 1);
            return `${name} x ${qty}`;
        });
        return parts.join(", ");
    };

    return (
        <div className="orders-box previous-orders">
            <h2 className="section-title">
                Previous Orders
                <small className="section-hint">Press a previous order to add to cart</small>
            </h2>


            {(!orders || orders.length === 0) ? (
                <p>No previous orders.</p>
            ) : (
                <ul className="orders-list">
                    {orders.map((order, index) => {
                        const count = Array.isArray(order.items) ? order.items.length : 0;
                        const chatText = buildChatLine(order);

                        const handleSelect = () => {
                            onSelectOrder?.({
                                order,
                                chatText: chatText ? `Please add: ${chatText}` : "",
                            });
                        };

                        return (
                            <li
                                key={index}
                                className="orders-item open"     // always open
                                role="button"
                                tabIndex={0}
                                onClick={handleSelect}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        handleSelect();
                                    }
                                }}
                                title="Prefill chat with this order"
                            >
                                <div className="order-title">Order {index + 1}</div>
                                <div className="order-sub">{count} items</div>

                                <div className="order-preview">
                                    <ul className="order-preview-list">
                                        {(order.items || []).map((it, i) => {
                                            let name, qty;
                                            if (typeof it === "string") {
                                                const [n, q] = it.split(":").map(s => String(s || "").trim());
                                                name = n; qty = q || 1;
                                            } else {
                                                name = String(it?.name ?? it?.product ?? "item");
                                                qty  = Number(it?.quantity ?? it?.qty ?? 1);
                                            }
                                            return (
                                                <li key={i} className="order-preview-item">
                                                    {name} × {qty}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
