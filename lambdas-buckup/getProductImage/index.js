// handler.js
const {
  checkIfStoreExists,
  getProductImageUrl,   // חדש
} = require('./dbProductsHelper');

exports.handler = async (event) => {
  const responseWithCORS = (statusCode, bodyObj) => ({
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    },
    body: JSON.stringify(bodyObj)
  });

  // CORS preflight
  if (event?.httpMethod === "OPTIONS") {
    return responseWithCORS(200, { ok: true });
  }

  if (event?.httpMethod !== "POST") {
    return responseWithCORS(405, { error: "Method Not Allowed" });
  }

  // פרסור בטוח של ה־body
  let body = {};
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
  } catch {
    return responseWithCORS(400, { error: "Invalid JSON body" });
  }

  const store_id   = body.store_id;
  const product_id = body.id ?? body.product_id; // תומך בשני שמות

  if (!store_id || product_id == null) {
    return responseWithCORS(400, { error: "Missing store_id or id (product_id)" });
  }

  try {
    const storeExists = await checkIfStoreExists(store_id);
    if (!storeExists) {
      return responseWithCORS(404, { error: "Store not found" });
    }

    const row = await getProductImageUrl(store_id, product_id);
    if (!row) {
      return responseWithCORS(404, { error: "Product not found in this store" });
    }

    // אם NULL בטבלה – נחזיר null כדי שתדעו שאין תמונה
    return responseWithCORS(200, { image_url: row.image_url ?? null });

  } catch (err) {
    console.error("Error fetching image_url:", err);
    return responseWithCORS(500, { error: "Database error" });
  }
};
