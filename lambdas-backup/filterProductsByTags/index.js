const { getStoreProductsByTags } = require('./dbProductsHelper');

exports.handler = async (event) => {
  const responseWithCORS = (statusCode, bodyObj) => {
    return {
      statusCode,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
      },
      body: JSON.stringify(bodyObj)
    };
  };

  try {
    console.log("🟢 Raw event.body:", event.body);
    if (!event.body) {
      return responseWithCORS(400, { error: "Missing request body" });
    }

    const body = JSON.parse(event.body);
    const { store_ids, tags } = body;

    console.log("🟢 Parsed event.body:", { store_ids, tags });

    if (!Array.isArray(store_ids) || !Array.isArray(tags)) {
      return responseWithCORS(400, { error: "`store_ids` and `tags` must be arrays" });
    }

    const results = await Promise.all(
      store_ids.map(async (store_id) => await getStoreProductsByTags(store_id, tags))
    );  

    const allProducts = results.flat();
    return responseWithCORS(200, allProducts);
    
  } catch (err) {
    console.error("❌ Lambda Error:", err);
    return responseWithCORS(500, { error: "Internal server error" });
  }
};
