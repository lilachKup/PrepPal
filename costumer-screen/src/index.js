import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from "react-oidc-context";
import { BrowserRouter } from "react-router-dom";

const cognitoAuthConfig = {
  authority: "https://us-east-1tpea6bazd.auth.us-east-1.amazoncognito.com",
  client_id: "56ic185te584076fcsarbqq93m",
  redirect_uri: window.location.origin + "/callback",
  response_type: "code",
  scope: "openid email phone profile",
  loadUserInfo: true,
  metadata: {
    issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_tpea6bazd",
    authorization_endpoint: "https://us-east-1tpea6bazd.auth.us-east-1.amazoncognito.com/oauth2/authorize",
    token_endpoint: "https://us-east-1tpea6bazd.auth.us-east-1.amazoncognito.com/oauth2/token",
    userinfo_endpoint: "https://us-east-1tpea6bazd.auth.us-east-1.amazoncognito.com/oauth2/userInfo",
    end_session_endpoint: "https://us-east-1tpea6bazd.auth.us-east-1.amazoncognito.com/logout",
    jwks_uri: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_tpea6bazd/.well-known/jwks.json"
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  
    <AuthProvider {...cognitoAuthConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  
);

reportWebVitals();

