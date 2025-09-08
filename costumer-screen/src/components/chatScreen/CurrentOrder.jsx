import React from "react";
import './CurrentOrder.css';

const placeholderImg = "https://img.icons8.com/ios-filled/50/cccccc/shopping-cart.png";


const CurrentOrder = ({ items }) => {
  console.log('CurrentOrder items:', items);

  const totalCents = items.reduce((sum, it) => {
    const qty = Number(it?.quantity ?? 1);
    const unitCents = Math.ceil(Number(it?.price ?? 0) * 100); // עיגול למעלה של המחיר ליח'
    return sum + unitCents * qty;
  }, 0);
  const total = (totalCents / 100).toFixed(2);

  return (
    <div className="current-order">
      <div className="order-total">
        <span>Total:</span>
        <span className="order-total-price">₪{total}</span>
      </div>

      {items.length === 0 ? (
        <p>No items in the order yet.</p>
      ) : (
        <div className="order-scroll">
          <ul className="order-list">
            {items.map((item, i) => (
              <li key={i} className="order-item">
                <span>{item.name}</span>
                <span className="order-item-quantity"> {item.quantity} </span>
                <span className="order-item-price">₪{(Math.ceil(item.price * 100) / 100).toFixed(2)}</span>
                <img
                  src={item.image || placeholderImg}
                  alt={item.name}
                  className="order-item-img"
                />
              </li>
            ))}
          </ul>
        </div>
      )}


    </div>
  );
};

export default CurrentOrder;
