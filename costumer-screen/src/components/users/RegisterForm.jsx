// src/Components/users/RegisterForm.jsx
import React, { useState } from 'react';
import {
    CognitoUserPool,
    CognitoUserAttribute
} from 'amazon-cognito-identity-js';
import './RegisterForm.css';
import { useAuth } from 'react-oidc-context';

// utils for address validation in Israel
import {
    validateILAddress,
    formatAddress,
    geoErrorToMessage,
} from '../utils/checkValidAddress';

const poolData = {
    UserPoolId: "us-east-1_TpeA6BAZD",
    ClientId: "56ic185te584076fcsarbqq93m"
};

const userPool = new CognitoUserPool(poolData);

export default function RegisterForm() {
    const auth = useAuth();

    // auth + form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [customerName, setCustomerName] = useState('');

    // address fields (kept visible on error)
    const [city, setCity] = useState('');
    const [street, setStreet] = useState('');
    const [houseNumber, setHouseNumber] = useState('');

    // UI state
    const [message, setMessage] = useState('');
    const [addressError, setAddressError] = useState('');
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [showLoginButton, setShowLoginButton] = useState(false);

    // Clean customer name
    const sanitizeName = (txt) =>
        (txt || '')
            .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
            .replace(/[^\p{L}\s'-]/gu, '')
            .trim();

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setAddressError('');

        // Basic phone validation
        if (!/^\d{9}$/.test(phoneNumber)) {
            setMessage("Invalid phone number (must be 9 digits)");
            return;
        }

        // Validate address is inside Israel (via utils/Lambda)
        const addressStr = formatAddress({
            city,
            street: `${street} ${houseNumber}`,
            apt: ""
        });

        try {
            // Only for validation; we don't persist coords here
            await validateILAddress({
                city,
                street: `${street} ${houseNumber}`,
                apt: ""
            });
        } catch (err) {
            const msg = geoErrorToMessage(err);
            setAddressError(msg);
            setMessage(msg);
            // keep user input so they can fix typos
            return;
        }

        const cleanName = sanitizeName(customerName);

        const attributes = [
            new CognitoUserAttribute({ Name: 'email', Value: email }),
            new CognitoUserAttribute({ Name: 'phone_number', Value: `+972${phoneNumber}` }),
            new CognitoUserAttribute({ Name: 'name', Value: cleanName }),
            // store the address string in Cognito (optional but useful)
            new CognitoUserAttribute({ Name: 'address', Value: addressStr }),
        ];

        userPool.signUp(email, password, attributes, null, async (err, result) => {
            if (err) {
                console.error(err);
                setMessage(err.message || "Sign up failed");
                if (err.code === 'UsernameExistsException') setShowLoginButton(true);
                return;
            }

            // Success UX
            setMessage('Registered successfully!');
            setRegistrationSuccess(true);

            setTimeout(() => {
                window.location.href = `/confirm?email=${encodeURIComponent(email)}`;
            }, 500);
        });
    };

    const handleLoginButton = () => {
        window.location.href = '/?tab=login';
    };

    return (
        <form className="register-form" onSubmit={handleRegister}>
            <h2 className="form-title">Sign Up</h2>

            <label>
                Email: <span className="req" aria-hidden="true">*</span>
            </label>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
            />

            <label>
                Password: <span className="req" aria-hidden="true">*</span>
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

            <label>
                Phone number: <span className="req" aria-hidden="true">*</span>
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

            {/* Address */}
            <div className="address-row">
                <div className="address-field">
                    <label>
                        City: <span className="req" aria-hidden="true">*</span>
                    </label>
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


            {/* Inline address error (keeps user input) */}
            {addressError && <p className="form-message error">{addressError}</p>}

            <label>
                Customer name: <span className="req" aria-hidden="true">*</span>
            </label>
            <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="form-input"
                required
            />

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
