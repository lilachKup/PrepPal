import React from "react";
import "./ActiveOrders.css";

function normalizeItem(it) {
  if (typeof it === "string") {
    const m = it.match(/^(.+?)[\s:×x]+(\d+)\s*$/);
    if (m) return { name: m[1].trim(), quantity: Number(m[2]) || 1 };
    return { name: it, quantity: 1 };
  }
  if (it && typeof it === "object") {
    const name = it.name ?? it.product ?? it.Product ?? it.Name ?? it.title ?? "item";
    const qty  = it.quantity ?? it.qty ?? it.count ?? it.Quantity ?? 1;
    return { name: String(name), quantity: Number(qty) || 1 };
  }
  return { name: String(it), quantity: 1 };
}

const ActiveOrders = ({ orders }) => {
  const safe = Array.isArray(orders) ? orders : [];

  return (
    <div className="active-order">
      <h2 className="section-title">Active Orders</h2>
      {safe.length === 0 ? (
        <p>No active orders yet.</p>
      ) : (
        <ul className="orders-list">
          {safe.map((order, idx) => {
            const rawItems =
              order.items ?? order.Items ?? order.products ?? order.Products ?? [];
            const items = Array.isArray(rawItems) ? rawItems.map(normalizeItem) : [];
            return (
              <li key={idx} className="orders-item">
                <strong>Order {idx + 1}</strong>
                <ul>
                  {items.map((it, i) => (
                    <li key={i}>{it.name} × {it.quantity}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ActiveOrders;
