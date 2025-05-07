const {
  getStoreProductsByTags
} = require('./dbProductsHelper');

exports.handler = async (event) => {

  const responseWithCORS = (statusCode, bodyObj) => ({
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,POST"
    },
    body: JSON.stringify(bodyObj)
  });

  try {
    const body = JSON.parse(event.body);
    const { store_ids, tags } = body;

    if (!Array.isArray(store_ids) || !Array.isArray(tags)) {
      return responseWithCORS(400, { error: "store_ids and tags must be arrays" });
    }

    const results = [];

    for (const store_id of store_ids) {
      const products = await getStoreProductsByTags(store_id, tags);
      results.push({ store_id, products });
    }

    return responseWithCORS(200, results);
  } catch (err) {
    console.error('Error:', err);
    return responseWithCORS(500, { error: 'Internal server error' });
  }
};
