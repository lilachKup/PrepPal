import React, { useState } from 'react';
import {
  CognitoUserPool,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';
import './RegisterForm.css';
import { useAuth } from 'react-oidc-context';
import {
  validateILAddress,
  formatAddress,
  geoErrorToMessage,
} from '../utils/checkValidAddress';

const poolData = {
  UserPoolId: 'us-east-1_cs31KzbTS',
  ClientId: '797di13hgmlrd5lthlpkelbgll'
};

const userPool = new CognitoUserPool(poolData);

const hoursOptions = [
  '', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'
];

export default function RegisterForm() {
  const auth = useAuth();

  // auth + form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [storeName, setStoreName] = useState('');
  const [message, setMessage] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showLoginButton, setShowLoginButton] = useState(false);

  // address split to 3 inputs
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [addressError, setAddressError] = useState(''); // show address-specific errors

  // opening hours state
  const [openingHours, setOpeningHours] = useState({
    Sunday: { open: '', close: '', closed: false },
    Monday: { open: '', close: '', closed: false },
    Tuesday: { open: '', close: '', closed: false },
    Wednesday: { open: '', close: '', closed: false },
    Thursday: { open: '', close: '', closed: false },
    Friday: { open: '', close: '', closed: false },
    Saturday: { open: '', close: '', closed: false }
  });

  // sanitize store name
  const sanitizeText = (txt) =>
    (txt || '')
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
      .replace(/[^\p{L}\p{N}\s'-]/gu, '')
      .trim();

  // change hours helper
  const handleHoursChange = (day, updated) => {
    setOpeningHours((prev) => ({ ...prev, [day]: updated }));
  };

  // format hours to single string
  const buildStoreHoursString = () =>
    Object.entries(openingHours)
      .map(([day, { open, close, closed }]) =>
        closed ? `${day}: Closed` : `${day}: ${open}–${close}`
      )
      .join(', ');

  // create market call (expects coords from validateILAddress)
  const createMarketInDB = async ({ store_id, name, address, email, storeHours, coords }) => {
    const res = await fetch(
      "https://5uos9aldec.execute-api.us-east-1.amazonaws.com/dev/createNewMarket",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id,
          name,
          location: address,
          email,
          store_hours: storeHours,
          store_coordinates: `${coords.lat},${coords.lng}`
        })
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create market");
    }
  };

  // submit register
  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setAddressError('');
    setShowLoginButton(false);


    // basic client validations
    if (!/^\d{9}$/.test(phoneNumber)) {
      setMessage("Invalid phone number (must be 9 digits)");
      return;
    }

    const cleanStoreName = sanitizeText(storeName);

    for (const [day, { open, close, closed }] of Object.entries(openingHours)) {
      if (!closed && open && close && open >= close) {
        setMessage(`${day}: Opening time cannot be later or equal to closing time`);
        return;
      }
      else if (!closed && (open === '' || close === '')) {
        setMessage(`${day}: Please fill in both opening and closing times, or mark as closed`);
        return;
      }
    }

    // build hours string
    const storeHours = buildStoreHoursString();

    // validate address in Israel (via utils)
    const addressStr = formatAddress({
      city,
      street: `${street} ${houseNumber}`,
      apt: ""
    });

    let coords;
    try {
      const { coords: _coords } = await validateILAddress({
        city,
        street: `${street} ${houseNumber}`,
        apt: ""
      });
      coords = _coords; // {lat,lng}
    } catch (err) {
      // Address is invalid / outside Israel -> DO NOT clear user inputs
      const msg = geoErrorToMessage(err);
      setAddressError(msg);
      setMessage(msg);
      // keep city/street/houseNumber so user can fix typos
      return;
    }

    // sign up in Cognito
    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'phone_number', Value: `+972${phoneNumber}` }),
      new CognitoUserAttribute({ Name: 'name', Value: cleanStoreName }),
    ];

    userPool.signUp(email, password, attributes, null, async (err, result) => {
      if (err) {
        console.error(err);
        setMessage(err.message || "Sign up failed");

        if (err.code === 'UsernameExistsException') {
          // If user already exists, show login button
          setShowLoginButton(true);
        }
        return;
      }

      // insert market to DB with verified coords
      try {
        await createMarketInDB({
          store_id: result.userSub,
          name: cleanStoreName,
          address: addressStr,
          email,
          storeHours,
          coords
        });

        setMessage('Registered successfully!');
        setRegistrationSuccess(true);

        setTimeout(() => {
          window.location.href = `/confirm?email=${encodeURIComponent(email)}`;
        }, 500);
      } catch (dbErr) {
        console.error("❌ Error creating market in DB:", dbErr);
        setMessage("Failed to create market. Please try again.");
      }
    });
  };

  const handleLoginButton = () => {
    // This button only appears for UsernameExistsException; no address validation needed here
    window.location.href = '/?tab=login';
  };

  return (
    <form className="register-form" onSubmit={handleRegister}>
      <h2 className="form-title">Store Sign Up</h2>

      <label>
        Email <span className="req" aria-hidden="true">*</span>
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="form-input"
        required
      />

      <label>Password:<span className="req" aria-hidden="true">*</span>
      </label>
      <div className="password-container">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input password-input"
          required
        />
        <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? "🙈" : "👁"}
        </span>
      </div>

      <label>Phone number:<span className="req" aria-hidden="true">*</span>
      </label>
      <div className="phone-container">
        <span className="phone-prefix">+972</span>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
          maxLength={9}
          className="phone-input"
          required
        />
      </div>

      {/* Address (3 inputs) */}
      <div className="address-row">
        <div className="address-field">
          <label>City:<span className="req" aria-hidden="true">*</span></label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={`form-input ${addressError ? 'input-error' : ''}`}
            required
          />
        </div>

        <div className="address-field">
          <label>Street:</label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className={`form-input ${addressError ? 'input-error' : ''}`}
          />
        </div>

        <div className="address-field">
          <label>House Number:</label>
          <input
            type="text"
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            className={`form-input ${addressError ? 'input-error' : ''}`}
          />
        </div>
      </div>

      {/* Inline address error (keeps user inputs) */}
      {addressError && (
        <p className="form-message error">{addressError}</p>
      )}



      <label>Store name:<span className="req" aria-hidden="true">*</span>
      </label>
      <input
        type="text"
        value={storeName}
        onChange={(e) => setStoreName(e.target.value)}
        className="form-input"
        required
      />

      {/* Opening hours */}
      <div className="opening-hours-box">
        <h3>Opening Hours<span className="req" aria-hidden="true">*</span>
        </h3>
        {Object.entries(openingHours).map(([day, { open, close, closed }]) => (
          <div key={day} className="day-hours-row">
            <label>{day}:</label>
            <select
              value={open}
              onChange={(e) => handleHoursChange(day, { open: e.target.value, close, closed })}
              disabled={closed}
              className="form-select"
            >
              {hoursOptions.map((hour) => (
                <option key={hour} value={hour}>{hour}</option>
              ))}
            </select>
            <span>to</span>
            <select
              value={close}
              onChange={(e) => handleHoursChange(day, { open, close: e.target.value, closed })}
              disabled={closed}
              className="form-select"
            >
              {hoursOptions.map((hour) => (
                <option key={hour} value={hour}>{hour}</option>
              ))}
            </select>
            <label style={{ marginLeft: '10px' }}>
              <input
                type="checkbox"
                checked={closed}
                onChange={(e) => handleHoursChange(day, { open: '', close: '', closed: e.target.checked })}
              /> Closed
            </label>
          </div>
        ))}
      </div>

      <button type="submit" className="submit-btn">Sign Up</button>

      <p className="form-message">{message}</p>

      {showLoginButton && (
        <div style={{ textAlign: 'center', marginTop: '5px' }}>
          <button
            type="button"
            className="login-btn"
            onClick={handleLoginButton}
          >
            Log In
          </button>
        </div>
      )}

      {registrationSuccess && (
        <p className="form-message">Please check your email to confirm</p>
      )}
    </form>
  );
}
