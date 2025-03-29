import React from "react";
import './Title.css'
import PrePalPhoto from "./PrePalPhoto.jpg";

const Title = () => {
    return (
        <div className="title">
            <h1>PrePal</h1>
            <img src={PrePalPhoto} alt="PrePalPhoto"/>


        </div>

    );
};

export default Title;
