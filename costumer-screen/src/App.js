import './App.css';
import CustomerScreen from './components/chatScreen/CustomerScreen.jsx';
import AuthTabs from './components/users/AuthTabs';
import ConfirmRegistration from './components/users/ConfirmRegistration.jsx';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import CallbackPage from './CallbackPage';
import ForgotPassword from './components/users/ForgotPassword.jsx';


function App() {
  const auth = useAuth();
  const location = useLocation();
  const cached = (() => { try { return JSON.parse(localStorage.getItem('pp_user') || 'null'); } catch { return null; } })();

  return (
    <Routes>
      <Route path="/" element={<AuthTabs />} />
      <Route path="/confirm" element={<ConfirmRegistration />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/customerScreen"
        element={

          (auth.user?.profile || cached) ? (
            <CustomerScreen
              customer_id={(auth.user?.profile?.sub) || cached?.sub}
              customerName={(auth.user?.profile?.name) || cached?.name}
              customerMail={(auth.user?.profile?.email) || cached?.email}
              customer_address={(auth.user?.profile?.address.formatted.split(",".trim())) || cached?.address || ''}
            />
          ) : (
            <Navigate to="/?tab=login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
