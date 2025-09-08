import React, { useState, useRef, useEffect } from "react";
import "./OrderChat.css";

export default function OrderChat({
  onNewItem,
  customer_id,
  customer_address,
  prefillText,
  startingChatId,  
}) {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatId, setChatId] = useState("");
  const [isNewChat, setIsNewChat] = useState(true);

  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);
  const lastPrefillRef = useRef("");

  useEffect(() => {
    if (startingChatId) {
      setChatId(startingChatId);
      setIsNewChat(false);
      setChatLog([]);
      return;
    }
    const saved = localStorage.getItem("pp_chat_id");
    if (saved) {
      setChatId(saved);
      setIsNewChat(false);
    } else {
      setChatId("");
      setIsNewChat(true);
      setChatLog([]); 
    }
  }, [startingChatId]);

  const chatLogKey = (id) => (id ? `pp_chat_log_${id}` : null);

  useEffect(() => { 
    if (!chatId) return;
    try {
      const key = chatLogKey(chatId);
      const saved = key && localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setChatLog(parsed);
      }
    } catch { }
  }, [chatId]); 

  useEffect(() => { 
    if (!chatId) return;
    try {
      const key = chatLogKey(chatId);
      if (key) localStorage.setItem(key, JSON.stringify(chatLog));
    } catch { }
  }, [chatId, chatLog]);

  // Prefill input (do not auto send)
  useEffect(() => {
    const txt = String(prefillText || "").trim();
    if (txt && txt !== lastPrefillRef.current) {
      setMessage(txt);
      lastPrefillRef.current = txt;
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [prefillText]);

  useEffect(() => {
    if (!customer_id) {
      console.warn("Missing customer_id");
    }
  }, [customer_id]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatLog]);

  const handleSend = async () => {
    console.log(
      `handleSend: message: ${message}, customer_address: ${customer_address}, customer_id: ${customer_id}, chatId: ${chatId}, isNewChat: ${isNewChat}`
    );
    if (isBotTyping) return;
    if (!message.trim()) return;

    const userMessage = { role: "user", content: message };
    setMessage("");
    setChatLog((prev) => [...prev, userMessage, { role: "bot-typing" }]);
    setIsBotTyping(true);

    try {
      let currentChatId = chatId;

      if (isNewChat) {
        const initRes = await fetch(
          `https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/client/createchat?client_id=${customer_id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: customer_address }),
          }
        );
        const initData = await initRes.json();

        if (!initRes.ok || !initData?.chat_id) {
          throw new Error("Failed to create chat");
        }

        currentChatId = initData.chat_id;
        setChatId(currentChatId);
        setIsNewChat(false);

        localStorage.setItem("pp_chat_id", currentChatId); 
      }

      const res = await fetch(
        "https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/client/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: currentChatId,
            client_id: customer_id,
            message: userMessage.content,
            create_chat: false,
          }),
        }
      );

      const data = await res.json();

      const botMessage =
        data.message ||
        data.response?.message ||
        data.choices?.[0]?.message?.content;

      setChatLog((prev) => [
        ...prev.slice(0, -1),
        { role: "bot", content: botMessage || "I'm here, try again!" },
      ]);

      // Items suggested by the bot (if present)
      let products = data.products;
      if (!Array.isArray(products) && typeof products === "string") {
        try { products = JSON.parse(products); } catch { products = []; }
      }
      if (Array.isArray(products)) {
        onNewItem?.(products, data.store_id);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatLog((prev) => [
        ...prev.slice(0, -1),
        { role: "bot", content: "⚠️ Something went wrong. Please try again." },
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <div>
      <div className="chat-box" ref={chatBoxRef}>
        {chatLog.map((msg, i) => (
          <div
            key={i}
            className={msg.role === "user" ? "chat-row user" : "chat-row bot"}
          >
            {msg.role === "bot-typing" ? (
              <div className="msg-box typing-indicator">
                <span></span><span></span><span></span>
              </div>
            ) : (
              <div className="msg-box">{msg.content}</div>
            )}
          </div>
        ))}
      </div>


      <div className="chat-input-container">
        <input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isBotTyping && message.trim()) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your order..."
          className="chat-input"
          aria-busy={isBotTyping}
        />
        <button
          onClick={handleSend}
          className={`chat-send-btn ${isBotTyping ? "disabled-btn" : ""}`}
          disabled={isBotTyping || !message.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
