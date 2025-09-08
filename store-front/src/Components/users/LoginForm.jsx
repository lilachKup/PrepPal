import React, { useState } from 'react';
import {
  AuthenticationDetails, CognitoUser, CognitoUserPool
} from 'amazon-cognito-identity-js';
import './RegisterForm.css';

const poolData = { UserPoolId: 'us-east-1_cs31KzbTS', ClientId: '797di13hgmlrd5lthlpkelbgll' };
const userPool = new CognitoUserPool(poolData);

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const onLogin = (e) => {
    e.preventDefault(); setMsg(''); setBusy(true);
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const auth = new AuthenticationDetails({ Username: email, Password: pwd });

    user.authenticateUser(auth, {
      onSuccess: (session) => {
        setBusy(false);
        const idToken = session.getIdToken();
        const p = idToken.payload; // sub, email, name...
        localStorage.setItem('pp_user', JSON.stringify({
          sub: p.sub,
          name: p.name || p.email,
          email: p.email,
          idToken: idToken.getJwtToken()
        }));
        window.location.href = '/home';
      },
      onFailure: (err) => {
        setBusy(false);
        console.log('Cognito error:', err?.code, err?.message);

        if (err?.code === 'UserNotConfirmedException') {
          setNeedsConfirm(true);
          setMsg('The email is not confirmed, please click the button to confirm.');
          return;

        }
        if (err?.code === 'PasswordResetRequiredException') {
          window.location.href = `/forgot?email=${encodeURIComponent(email)}`;
          return;
        }

        setMsg(`${err?.code || 'Error'}: ${err?.message || 'Login failed'}`);
      },
      newPasswordRequired: () => {
        window.location.href = `/forgot?email=${encodeURIComponent(email)}`;
      }
    });
  };

  return (
    <form className="register-form" onSubmit={onLogin}>
      <h2 className="form-title">Login</h2>

      <input
        className="form-input"
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value.trim())}
        required
      />

      <div className="password-container">
        <input
          className="form-input password-input"
          type={show ? 'text' : 'password'}
          placeholder="Password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          required
          autoComplete="current-password"
        />
        <span
          className="toggle-password"
          onClick={() => setShow(s => !s)}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? '🙈' : '👁'}
        </span>
      </div>

      <button className="submit-btn" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Login'}
      </button>

      {needsConfirm && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button
            type="button"
            className="confirm-account-btn"
            onClick={() => window.location.href = `/confirm?email=${encodeURIComponent(email)}`}
          >
            Confirm Acount
          </button>
        </div>
      )}

      {msg && <p className="form-message">{msg}</p>}

      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <a
          href={`/forgot?email=${encodeURIComponent(email || '')}`}
          className="forgot-password-link"
        >
          Forgot password?
        </a>
      </div>
    </form>
  );
}
