import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./ProfileModal.css";
import {
  CognitoUserPool,
  CognitoUser,
} from "amazon-cognito-identity-js";

// Israel address validator utils
import {
  validateILAddress,
  formatAddress,
  geoErrorToMessage,
} from "../utils/checkValidAddress";

const poolData = {
  UserPoolId: "us-east-1_TpeA6BAZD",
  ClientId: "56ic185te584076fcsarbqq93m",
};

const userPool = new CognitoUserPool(poolData);

// Wrap Cognito address update with a Promise
function updateAddressInCognito(address)
{
  const user = userPool.getCurrentUser();
  return new Promise((resolve) => {
    if (!user) {
      console.warn("❌ No user found");
      return resolve(false);
    }
    user.getSession((err, session) => {
      if (err || !session?.isValid()) {
        console.warn("❌ Invalid session:", err || "Session invalid");
        return resolve(false);
      }
      user.updateAttributes(
          [{ Name: "address", Value: address }],
          (err) => {
            if (err) {
              console.error("❌ Failed to update address in Cognito:", err);
              resolve(false);
            } else {
              console.log("✅ Address updated in Cognito");
              resolve(true);
            }
          }
      );
    });
  });
}

// ---- helpers ----
function decodeJwt(token) {
  try {
    const base64 = token?.split(".")[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadUserFromStorage() {
  try {
    const raw = localStorage.getItem("pp_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    const payload = u.idToken ? decodeJwt(u.idToken) : null;
    return {
      phone_number: payload?.phone_number || u.phone_number || "",
      name: payload?.name || u.name || "",
      email: payload?.email || u.email || "",
      address: u.address || payload?.address || ""
    };
  } catch {
    return null;
  }
}

function saveUserToStorage(partial) {
  try {
    const raw = localStorage.getItem("pp_user");
    const curr = raw ? JSON.parse(raw) : {};
    const next = { ...curr, ...partial };
    localStorage.setItem("pp_user", JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

// ---- component ----
export default function ProfileModal({ open, onClose, onSaved,onNewChat }) {
  const initial = useMemo(() => loadUserFromStorage(), [open]);
  const [form, setForm] = useState(
      initial || { sub: "", name: "", email: "", address: "" }
  );

  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");

  // Parse "City, Street, Number" or similar shapes to inputs
  function explodeAddress(addr) {
    if (!addr) return;
    let raw = "";
    if (typeof addr === "object") {
      if ("city" in addr || "street" in addr || "number" in addr) {
        const { city: c = "", street: s = "", number: n = "" } = addr;
        raw = `${c}, ${s}, ${n}`;
      } else if ("formatted" in addr && typeof addr.formatted === "string") {
        raw = addr.formatted;
      }
    } else if (typeof addr === "string") {
      raw = addr;
    }
    const parts = raw.split(",").map((p) => p?.trim() ?? "");
    const [c = "", s = "", n = ""] = parts;
    setCity(c);
    setStreet(s);
    setNumber(n);
  }

  // Refresh when modal opens
  useEffect(() => {
    if (open) {
      const fresh = loadUserFromStorage();
      setForm(fresh || { sub: "", name: "", email: "", address: "" });
      if (fresh?.address) explodeAddress(fresh.address);
      setStatus("");
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();

    const normalize = (s) => (s || "").replace(/\s+/g, " ").trim();

    const addressStr = formatAddress({
      city,
      street: `${street} ${number}`.trim(),
      apt: "",
    });

    setStatus("Validating address...");
    try {
      await validateILAddress({
        city,
        street: `${street} ${number}`.trim(),
        apt: "",
      });
    } catch (err) {
      setStatus(geoErrorToMessage(err));
      /////
      return;
    }

    const addressChanged = normalize(initial?.address) !== normalize(addressStr);

    const localOk = saveUserToStorage({
      phone_number: form.phone_number,
      name: form.name,
      email: form.email,
      address: addressStr,
    });

    setStatus("Saving...");
    const cognitoOk = await updateAddressInCognito(addressStr);
    const ok = localOk && cognitoOk;

    if (ok) {
      onSaved?.({ ...form, address: addressStr });

      if (addressChanged) {
        onNewChat?.(addressStr);
      }

      setForm((f) => ({ ...f, address: addressStr }));
    } else {
      console.log(addressChanged ? "Save failed, skip reset" : "Address did not change");
    }

    setStatus(ok ? "Saved ✅" : "Partial save ⚠️");
    setTimeout(() => setStatus(""), 1500);
  };

  const content = (
      <div className="pp-modal-backdrop" onClick={onClose}>
        <div
            className="pp-modal-panel"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
        >
          <div className="pp-modal-header">
            <h2>Profile</h2>
            <button className="pp-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          {!initial ? (
              <div className="pp-modal-body">
                <p>You are not logged in.</p>
              </div>
          ) : (
              <form onSubmit={onSave} className="pp-modal-body">
                <label className="pp-field">
                  <span>Name</span>
                  <input name="name" value={form.name} readOnly placeholder="Your name" />
                </label>

                <label className="pp-field">
                  <span>Phone Number</span>
                  <input
                      name="phone_number"
                      value={form.phone_number}
                      readOnly
                      placeholder="Your phone number"
                  />
                </label>

                <label className="pp-field">
                  <span>Email</span>
                  <input
                      type="email"
                      name="email"
                      value={form.email}
                      readOnly
                      placeholder="name@example.com"
                  />
                </label>

                {/* Address row */}
                <div className="pp-address-row">
                  <label className="pp-field">
                    <span>City</span>
                    <input
                        name="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                    />
                  </label>

                  <label className="pp-field">
                    <span>Street</span>
                    <input
                        name="street"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                    />
                  </label>

                  <label className="pp-field">
                    <span>Number</span>
                    <input
                        name="number"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                    />
                  </label>
                </div>

                <div className="pp-modal-actions">
                  <button type="submit" className="pp-btn pp-btn-primary">
                    Save
                  </button>
                  <button type="button" className="pp-btn" onClick={onClose}>
                    Close
                  </button>
                  {status && <span className="pp-status">{status}</span>}
                </div>
              </form>
          )}
        </div>
      </div>
  );

  return createPortal(content, document.body);
}
