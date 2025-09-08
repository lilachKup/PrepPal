import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));
const COORDS_API_BASE =
  "https://5uos9aldec.execute-api.us-east-1.amazonaws.com/dev/getCoordinatesFromStoreByID";

// ---------- utils ----------
const R = 6371;
const toRad = d => (d * Math.PI) / 180;
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;
}
function parseCoords(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const [lat, lng] = raw.map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  if (typeof raw === "string") {
    const [lat, lng] = raw.split(",").map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  if (typeof raw === "object" && raw.latitude != null && raw.longitude != null) {
    const lat = Number(raw.latitude), lng = Number(raw.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  return null;
}
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS"
    },
    body: JSON.stringify(body),
  };
}
async function fetchWithTimeout(url, ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { signal: ac.signal }); }
  finally { clearTimeout(t); }
}
async function runLimited(items, limit, worker) {
  const out = Array(items.length);
  let i = 0;
  const runners = Array(Math.min(limit, items.length)).fill(0).map(async function run() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return out;
}

// ---------- cache per-container ----------
const storeCoordsCache = new Map();
async function fetchStoreCoords(storeId, perReqTimeoutMs = 1000) {
  if (storeCoordsCache.has(storeId)) return storeCoordsCache.get(storeId);
  try {
    const res = await fetchWithTimeout(`${COORDS_API_BASE}/${encodeURIComponent(storeId)}`, perReqTimeoutMs);
    if (!res.ok) return null;
    let data; try { data = await res.json(); } catch { data = await res.text(); }
    const coords = parseCoords(data);
    if (coords) storeCoordsCache.set(storeId, coords);
    return coords;
  } catch { return null; } // timeout/abort/network
}

// ---------- handler ----------
export const handler = async (event) => {
  if (event?.httpMethod === "OPTIONS" || event?.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 204, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Max-Age": "86400"
    }, body: "" };
  }

  try {
    const qs = event.queryStringParameters || {};
    const ps = event.pathParameters || {};
    const lat = Number(ps.lat ?? qs.lat);
    const lng = Number(ps.lng ?? qs.lng);
    const distanceKm = Math.min(Number(qs.distanceKm ?? 20), 100);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return response(400, { error: "Provide lat & lng (path or query)" });
    }

    const results = [];
    let ExclusiveStartKey;
    const SCAN_LIMIT = 200;   // אל תמשוך הכל בבת אחת
    const MAX_PAGES  = 5;     // תקרה רכה — תתאים לפי גודל טבלה
    let pages = 0;

    do {
      const page = await ddb.send(new ScanCommand({
        TableName: "Orders",
        FilterExpression: "#s = :ready",
        ExpressionAttributeNames: {
          "#s": "status",
          "#sid": "store_id",
          "#on": "order_num",
          "#cn": "customer_name",
          "#cl": "customer_Location",
          "#cm": "customer_mail",
          "#tp": "total_price",
          "#cid": "customer_id"
        },
        ExpressionAttributeValues: { ":ready": "ready" },
        ProjectionExpression: "#sid, #on, #cn, #cl, #cm, #tp, #cid, #s",
        ExclusiveStartKey,
        Limit: SCAN_LIMIT
      }));

      const orders = page.Items ?? [];

      // דה־דופליקציה של חנויות
      const uniqueStoreIds = Array.from(new Set(orders.map(o => o.store_id).filter(Boolean)));

      // הבאת קואורדינטות במקביל עם הגבלת קונקרנציה + timeout קצר לכל בקשה
      const MAX_CONCURRENCY = 8;
      const perReqTimeoutMs = 1000;
      const coordsArr = await runLimited(uniqueStoreIds, MAX_CONCURRENCY,
        id => fetchStoreCoords(id, perReqTimeoutMs)
      );
      const idToCoords = new Map(uniqueStoreIds.map((id, i) => [id, coordsArr[i]]));

      for (const o of orders) {
        const storeCoords = idToCoords.get(o.store_id);
        if (!storeCoords) continue;
        const dist = haversineKm(lat, lng, storeCoords.lat, storeCoords.lng);
        if (dist <= distanceKm) {
          results.push({
            store_id: o.store_id,
            order_num: o.order_num,
            customer_id: o.customer_id,
            customer_name: o.customer_name,
            customer_location: o.customer_Location,
            customer_mail: o.customer_mail,
            total_price: o.total_price,
            store_coordinates: `${storeCoords.lat},${storeCoords.lng}`,  // ← מיושר ל-React
            distance_km: Number(dist.toFixed(2))
          });
        }
      }

      ExclusiveStartKey = page.LastEvaluatedKey;
      pages += 1;
    } while (ExclusiveStartKey && pages < MAX_PAGES);

    return response(200, { count: results.length, orders: results });
  } catch (err) {
    console.error("ordersNearbyToMe error:", err);
    return response(500, { error: "Server error" });
  }
};
