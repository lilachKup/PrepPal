import React from "react";
import { useState } from "react";
import { CognitoUserPool } from "amazon-cognito-identity-js";
import "./TopBar.css";
import ProfileModal from "./ProfileModal";
import prepal_logo from "../utils/prepal_logo.png";


const poolData = {
  UserPoolId: "us-east-1_TpeA6BAZD",
  ClientId: "56ic185te584076fcsarbqq93m"
};

const userPool = new CognitoUserPool(poolData);

const TopBar = ({ onNewChat, onProfileSaved }) => {

  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("pp_user");
    localStorage.removeItem("pp_chat_id");
    localStorage.removeItem("pp_order_items");
    Object.keys(localStorage)
      .filter(k => k.startsWith("pp_chat_log_"))
      .forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();


    const user = userPool.getCurrentUser();
    if (user) {
      user.signOut();
    }


    window.location.href = "/login";
  };



  const handleOrderLocation = () => {
    alert("Order Location pressed");
  };

  return (
    <div className="topbar">
      <div className="brand">
        <h2 className="logo">PrePal</h2>
        <img src={prepal_logo} alt="PrePal Logo" className="logo-image" />
      </div>
      <div className="actions">
        <button onClick={handleLogout}>Logout</button>
        <button onClick={() => setShowProfile(true)}>Profile</button>
        <button onClick={() => onNewChat()}>new chat</button>

        <ProfileModal
          open={showProfile}
          onClose={() => setShowProfile(false)}
          onSaved={onProfileSaved}
          onNewChat={onNewChat}
        />
      </div>
    </div>
  );
};

export default TopBar;
