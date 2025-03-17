import React from "react";
import "./CustomerScreen.css";
import Title from "./Title.jsx";
import HistoryOrder from "./HistoryOrder.jsx";
import OrderChat from "./OrderChat.jsx";

const CustomerScreen = () => {
    return (
        <div className="CustomerScreen">

            <Title />
            <div className="content-container">
                <HistoryOrder />
                <OrderChat />
            </div>
        </div>
    );
};

export default CustomerScreen;
