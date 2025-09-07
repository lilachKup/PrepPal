// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PaymentThankYouPage from "./pages/PaymentThankYouPage";
import PaymentFailedPage from "./pages/PaymentFailedPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/payment-success" element={<PaymentThankYouPage />} />
        <Route path="/payment-cancel" element={<PaymentFailedPage />} />
      </Routes>
    </BrowserRouter>
  );
}
