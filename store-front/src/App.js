import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import StoreInventory from './Components/inventory/StoreInventory';
import AuthTabs from './Components/users/AuthTabs';
import CallbackPage from './CallbackPage';
import { useAuth } from 'react-oidc-context';
import ConfirmRegistration from "./Components/users/ConfirmRegistration";
import StoreOrder from './Components/orders/StoreOrder';
import ForgotPassword from "./Components/users/ForgotPassword";
import HomePage from "./Components/Home/HomePage";

function App() {
  const auth = useAuth();
  const location = useLocation();

  const oidcUser = auth.user?.profile || null;
  const cached = (() => {
    try { return JSON.parse(localStorage.getItem('pp_user') || 'null'); }
    catch { return null; }
  })();

  const effectiveUser = oidcUser || cached; // אם אין OIDC – נשתמש במטמון מהלוגין המקומי

  return (
    <Routes>
      <Route path="/" element={<AuthTabs />} />
      <Route path="/confirm" element={<ConfirmRegistration />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/callback" element={<CallbackPage />} />
        <Route
            path="/home"
            element={
                effectiveUser ? (
                    <HomePage
                        storeId={(effectiveUser.sub)}
                    />
                ) : (
                    <Navigate to="/" replace />
                )
            }
        />

      <Route
        path="/inventory"
        element={
          effectiveUser ? (
            <StoreInventory
              storeId={(effectiveUser.sub)}
              storeName={(effectiveUser.name)}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route path="/orders" element={<StoreOrder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
