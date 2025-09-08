
// ---------- format ----------
export function formatAddress({ city, street, apt }) {
    return [String(city||"").trim(), String(street||"").trim(), String(apt||"").trim()]
        .filter(Boolean)
        .join(", ");
}

// ---------- Israel guards ----------
export const IL_BBOX = { latMin: 29.30, latMax: 33.60, lonMin: 34.15, lonMax: 35.95 };

export function isInIsraelBBox(lat, lon) {
    return (
        Number.isFinite(lat) && Number.isFinite(lon) &&
        lat >= IL_BBOX.latMin && lat <= IL_BBOX.latMax &&
        lon >= IL_BBOX.lonMin && lon <= IL_BBOX.lonMax
    );
}

async function reverseCountryCode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return String(data?.address?.country_code || "").toLowerCase() || null;
}

// ---------- call your Lambda ----------
async function geocodeViaLambda(address) {
    const url = `https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/location?address=${encodeURIComponent(address||"")}`;

    let res;
    try { res = await fetch(url); }
    catch {
        const e = new Error("geocoder_unavailable"); e.code = "geocoder_unavailable"; throw e;
    }

    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = {}; }

    if (res.status === 200) {
        const lat = Number(data.lat ?? data.latitude);
        const lng = Number(data.lng ?? data.lon ?? data.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            const e = new Error("bad_payload"); e.code = "bad_payload"; throw e;
        }
        const cc = String(data.country_code || "").toLowerCase() || null;
        return { lat, lng, cc };
    }

    const code =
        res.status === 422 ? "outside_israel" :
            res.status === 404 ? "no_results" :
                res.status === 400 ? "missing_address" :
                    res.status === 503 ? "geocoder_unavailable" :
                        `http_${res.status}`;
    const e = new Error(code); e.code = code; throw e;
}

// ---------- single entry you call from pages ----------
export async function validateILAddress({ city, street, apt }) {
    const addressStr = formatAddress({ city, street, apt });
    if (!addressStr) { const e = new Error("missing_address"); e.code = "missing_address"; throw e; }

    const { lat, lng, cc } = await geocodeViaLambda(addressStr);

    // 1) BBox gate
    if (!isInIsraelBBox(lat, lng)) {
        const e = new Error("outside_israel"); e.code = "outside_israel"; throw e;
    }

    // 2) Reverse geocode (strict)
    const country = cc || (await reverseCountryCode(lat, lng));
    if (country !== "il") {
        const e = new Error("outside_israel"); e.code = "outside_israel"; throw e;
    }

    return { addressStr, coords: { lat, lng } };
}

// ---------- messages ----------
export function geoErrorToMessage(err) {
    const code = err?.code || String(err?.message || "");
    if (code.includes("outside_israel")) return "Invalid location: outside Israel.";
    if (code.includes("no_results") || code.includes("missing_address"))
        return "Invalid location. Please check city, street and house number.";
    if (code.includes("geocoder_unavailable") || code.includes("503") || code.includes("429"))
        return "Maps service is busy. Please try again in a minute.";
    return "Failed to validate location. Please try again.";
}
