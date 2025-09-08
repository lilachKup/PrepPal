import React, { useEffect, useState } from "react";
import "./HomePage.css";
import TopBar from "../Bar/TopBar";
import { requireStoreSessionOrRedirect } from "../utils/storeSession";
import {
    validateILAddress,
    formatAddress,
    geoErrorToMessage,
} from "../utils/checkValidAddress";

// --- constants ---
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'
];

// --- helpers for store hours ---
function parseStoreHours(text = "") {
    const init = Object.fromEntries(DAYS.map(d => [d, { open: "", close: "", closed: true }]));
    if (!text.trim()) return init;

    text.split(/\s*,\s*/).forEach(p => {
        const m = p.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*:\s*(.+)$/i);
        if (!m) return;
        const day = DAYS.find(d => d.toLowerCase() === m[1].toLowerCase());
        const val = m[2].trim();
        if (/^closed$/i.test(val)) {
            init[day] = { open: "", close: "", closed: true };
            return;
        }
        const [o, c] = val.split(/\s*[–-]\s*/);
        if (o && c) init[day] = { open: o, close: c, closed: false };
    });

    return init;
}

function formatStoreHours(obj) {
    return DAYS.map(d => {
        const { open, close, closed } = obj[d] || {};
        if (closed || !open || !close) return `${d}: Closed`;
        return `${d}: ${open}–${close}`;
    }).join(", ");
}

// --- split/parse location stored as single string "City, Street X, Apt" ---
function parseLocation3(s = "") {
    const parts = s.split(",").map(p => p.trim()).filter(Boolean);
    return {
        city: parts[0] || "",
        street: parts[1] || "",
        apt: parts[2] || "",
    };
}

export default function HomePage() {
    // base store info
    const [store, setStore] = useState(null);
    const [edit, setEdit] = useState(false);

    // location fields (3 inputs while editing)
    const [city, setCity] = useState("");
    const [street, setStreet] = useState("");
    const [apt, setApt] = useState("");

    // opening hours state
    const [hoursObj, setHoursObj] = useState(() => parseStoreHours(""));

    // resolve session + store id
    const session = requireStoreSessionOrRedirect();
    const storeId = session?.storeId;

    // copy fields from store object into form state
    const resetFormFromStore = (src = store) => {
        if (!src) return;
        const loc = parseLocation3(src?.location || "");
        setCity(loc.city || "");
        setStreet(loc.street || "");
        setApt(loc.apt || "");
        setHoursObj(parseStoreHours(src?.store_hours || ""));
    };

    // keep form in sync with store when leaving edit mode or when store changes
    useEffect(() => {
        if (store && !edit) resetFormFromStore(store);
    }, [store, edit]);

    const startEdit = () => {
        resetFormFromStore();
        setEdit(true);
    };

    const handleCancel = () => {
        resetFormFromStore();
        setEdit(false);
    };

    // fetch store data by storeId (from your API)
    useEffect(() => {
        if (!storeId) return;
        (async () => {
            try {
                const res = await fetch(
                    `https://5uos9aldec.execute-api.us-east-1.amazonaws.com/dev/getInfoFromStore/${encodeURIComponent(storeId)}`
                );
                if (!res.ok) {
                    console.error("❌ Fetch failed:", res.status, await res.text());
                    return;
                }
                const data = await res.json();
                const row = Array.isArray(data) ? data[0] : data;
                setStore(row || {});
                // initialize form from fetched store
                resetFormFromStore(row || {});
            } catch (e) {
                console.error("Fetch store error:", e);
            }
        })();
    }, [storeId]);

    // update a single day row in hoursObj
    const setDay = (day, patch) => {
        setHoursObj(prev => {
            const next = { ...prev, [day]: { ...(prev[day] || { open: "", close: "", closed: true }), ...patch } };
            if (patch.closed) next[day] = { open: "", close: "", closed: true };
            return next;
        });
    };

    // save handler: validate address (Israel), then update DB, then update local UI
    const handleSave = async () => {
        if (!store && !storeId) return;

        for (const [day, { open, close, closed }] of Object.entries(hoursObj)) {
            if (!closed && open && close && open >= close) {
                alert(`${day}: Opening time cannot be later than closing time`);
                return;
            }
            else if (!closed && (open === '' || close === '')) {
                alert(`${day}: Please fill in both opening and closing times, or mark as closed`);
                return;
            }
        }

        const locationStr = formatAddress({ city, street, apt }); // single-line string
        const storeHoursStr = formatStoreHours(hoursObj);

        // Validate address via utils (enforces Israel with bbox + reverse)
        let coords;
        try {
            const result = await validateILAddress({ city, street, apt }); // { addressStr, coords }
            coords = result.coords; // { lat, lng }
        } catch (err) {
            alert(geoErrorToMessage(err));
            return;
        }

        const coordsStr = `${coords.lat},${coords.lng}`;

        try {
            // Update DB
            const res = await fetch(
                "https://oa608utwwh.execute-api.us-east-1.amazonaws.com/dev/updateStoreLocationAndStoreHours",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        store_id: storeId,
                        location: locationStr,
                        storeHours: storeHoursStr,
                        coordinates: coordsStr,
                    }),
                }
            );

            if (!res.ok) {
                const errTxt = await res.text();
                throw new Error(errTxt || "Failed to update store info");
            }

            // Reflect changes locally
            setStore(prev => ({
                ...(prev || {}),
                location: locationStr,
                store_hours: storeHoursStr,
                store_coordinates: coordsStr,
            }));

            setEdit(false);
        } catch (err) {
            console.error("Error updating store info:", err);
            alert("Failed to update store info. Please try again.");
        }
    };

    if (!storeId || !store) return <div className="loading">Loading…</div>;

    return (
        <>
            <TopBar />
            <div className="homepage">
                <h2 className="title">Store Info</h2>

                <div className="field">
                    <label>ID</label>
                    <span>{store.store_id || storeId}</span>
                </div>

                <div className="field">
                    <label>Email</label>
                    <span>{store.email || "-"}</span>
                </div>

                <div className="field">
                    <label>Name</label>
                    <span>{store.name || "-"}</span>
                </div>

                {/* Location */}
                <div className="field">
                    <label>Location</label>
                    {edit ? (
                        <div className="location-grid">
                            <input
                                type="text"
                                placeholder="City"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Street and number (e.g., Aza 25)"
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Apt"
                                value={apt}
                                onChange={(e) => setApt(e.target.value)}
                            />
                        </div>
                    ) : (
                        <span>{store.location || "-"}</span>
                    )}
                </div>

                {/* Opening Hours */}
                <div className="hours-card">
                    <div className="hours-title">Opening Hours</div>

                    <div className="hours-grid hours-head">
                        <div>Day</div>
                        <div>Open</div>
                        <div>To</div>
                        <div>Closed</div>
                    </div>

                    {DAYS.map(d => {
                        const row = hoursObj[d] || { open: "", close: "", closed: true };
                        return (
                            <div className="hours-grid" key={d}>
                                <div className="hours-day">{d}:</div>

                                <div>
                                    {edit ? (
                                        <select
                                            className="time-select"
                                            value={row.open || ""}
                                            disabled={row.closed}
                                            onChange={(e) => setDay(d, { open: e.target.value, closed: false })}
                                        >
                                            <option value="">--</option>
                                            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    ) : (
                                        <span className="readonly">{row.closed ? "Closed" : (row.open || "—")}</span>
                                    )}
                                </div>

                                <div>
                                    {edit ? (
                                        <select
                                            className="time-select"
                                            value={row.close || ""}
                                            disabled={row.closed}
                                            onChange={(e) => setDay(d, { close: e.target.value, closed: false })}
                                        >
                                            <option value="">--</option>
                                            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    ) : (
                                        <span className="readonly">{row.closed ? "" : (row.close || "—")}</span>
                                    )}
                                </div>

                                <div className="closed-cell">
                                    {edit ? (
                                        <label className="closed-toggle">
                                            <input
                                                type="checkbox"
                                                checked={!!row.closed}
                                                onChange={(e) => setDay(d, { closed: e.target.checked })}
                                            />
                                            <span>Closed</span>
                                        </label>
                                    ) : (
                                        <span className={"readonly " + (row.closed ? "closed" : "")}>
                                            {row.closed ? "Closed" : ""}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {!edit && (
                        <div className="hours-note">
                            To edit, click “Edit” below. Changes will be saved in your store profile.
                        </div>
                    )}
                </div>

                <div className="actions">
                    {edit ? (
                        <>
                            <button className="btn cancel" onClick={handleCancel}>Cancel</button>
                            <button className="btn save" onClick={handleSave}>Save</button>
                        </>
                    ) : (
                        <button className="btn edit" onClick={startEdit}>Edit</button>
                    )}
                </div>
            </div>
        </>
    );
}
