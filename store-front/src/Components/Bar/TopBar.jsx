import React from "react";
import { CognitoUserPool } from "amazon-cognito-identity-js";
import "./TopBar.css";
import { useNavigate, useLocation } from "react-router-dom";
import { getStoreSession } from "../utils/storeSession";
import prepal_logo from "../utils/prepal_logo.png";




const poolData = {
    UserPoolId: "us-east-1_TpeA6BAZD",
    ClientId: "56ic185te584076fcsarbqq93m"
};

const userPool = new CognitoUserPool(poolData);

const TopBar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const session = getStoreSession();
    const storeName = session?.storeName ?? "PrepPal";

    const handleLogout = () => {
        localStorage.removeItem("pp_user");
        localStorage.removeItem("pp_store");
        sessionStorage.clear();

        const user = userPool.getCurrentUser();
        if (user) user.signOut();

        window.location.href = "/login";
    };

    return (
        <div className="topbar">
            <div className="brand">
                <h2 className="logo">PrePal</h2>
                <img src={prepal_logo} alt="PrePal Logo" className="logo-image" />
            </div>

            <div className="actions">
                <button onClick={handleLogout}>Logout</button>
                {location.pathname !== "/home" &&
                    <button onClick={() => navigate("/home")}>Store Info</button>
                }
                {location.pathname !== "/inventory" &&
                    <button onClick={() => navigate("/inventory")}>Inventory</button>
                }
                {location.pathname !== "/orders" &&
                    <button onClick={() => navigate("/orders")}>Orders</button>
                }
                
            </div>
        </div>
    );
};

export default TopBar;
