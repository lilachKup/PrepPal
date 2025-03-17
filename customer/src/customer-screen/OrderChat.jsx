import React, {useEffect, useState} from "react";
import "./OrderChat.css";
import axios from 'axios';

const OrderChat = () => {
    const [message, setMessage] = useState("");

    const [oldMessages, setOldMessages] = useState([]);
    const [isUserTurn, setIsUserTurn] = useState(true); // start with user

    const sendMessage = async () => {
        if (message.trim() === "" ) return;


            await userResponse(message);
            await botResponse(message);

        console.log("all mssg", oldMessages)


    };

    const userResponse = async (msg) => {
        try {
            console.log(msg);
            setOldMessages(prevMessages => [...prevMessages, { sender: "user", text: msg }]);
            setMessage(""); // מנקה את תיבת ההודעה
            console.log(msg)

            /*await axios.post("http://localhost:5001/chat", {msg},{ headers: { 'Content-Type': 'application/json' }}).then((res) => {
                console.log(res.data);
            })*/

        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            //setIsUserTurn(false);
        }
    };

    const botResponse = async (msg) => {
        //setOldMessages(prevMessages => [...prevMessages, { sender: "bot", text: "hello world" }]);
        console.log("hey******");
        try {
            let botResponse;
            await axios.post("http://localhost:5001/chat", {msg},{ headers: { 'Content-Type': 'application/json' }}).then((res) => {
                botResponse = res.data;
            })
            //console.log(response.data);

            console.log("with content" ,botResponse.content);
            console.log("without content", botResponse);
            setOldMessages(prevMessages => [...prevMessages, { sender: "bot", text: botResponse.content }]);
            console.log("all bot mssg" ,[...oldMessages]);


        } catch (error) {
            console.error("Error receiving bot response:", error);
        } finally {

            //setIsUserTurn(true);
        }
    };



    return (
        <div className="order">
            <div className="chat-box">
                {oldMessages.map((msg, index) => (
                    <div key={index} className="message">
                        {msg.sender === "user" ? "👤" : "🤖"} {msg.text}
                    </div>
                ))}
            </div>
            <input
                onChange={(e) => setMessage(e.target.value)}
                value={message}
                type="text"
                placeholder="what do you want to know..."
                disabled={!isUserTurn} // מונע הקלדה כשהבוט מגיב
            />
            <button className="sendText" onClick={sendMessage} disabled={!isUserTurn}>
                Send
            </button>
            <button className="Checkout" onClick={() => console.log("Checkout")}>
                Checkout
            </button>
        </div>
    );
};

export default OrderChat;
