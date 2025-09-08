const { decreaseProductsFromStoreAfterSell } = require('./dbProductsHelper');

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

  try {
    const body = JSON.parse(event.body || "{}");

    const store_id = body.store_id;

    if (!store_id) {
      return responseWithCORS(400, { error: "Missing store_id" });
    }

    const order = body.order;

    if (!order || !Array.isArray(order)) {
      return responseWithCORS(400, { error: "Missing or invalid ingrediants" });
    }

    for(const item of order)
    {
      let [namePart, qtyPart] = item.split(":");
      // מסדרים וממירים למספר
      let name = namePart.trim();
      let qty = parseInt(qtyPart.trim(), 10);
      await decreaseProductsFromStoreAfterSell(store_id, name, qty);
    }


    return responseWithCORS(200, { message: "Products removed successfully" });

  } catch (err) {
    console.error("❌ Error removing products:", err);
    return responseWithCORS(500, { error: "Database error" });
  }
};
