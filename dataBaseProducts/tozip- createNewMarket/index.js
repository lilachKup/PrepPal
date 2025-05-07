const { createNewMarket } = require('./dbProductsHelper');

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
    const { market_id, name, street, city, email, zipcode } = body;

    if (!market_id || !name || !street || !city || !email || !zipcode) {
      return responseWithCORS(400, { error: "Missing one or more required fields" });
    }

    const newMarket = await createNewMarket({ market_id, name, street, city, email, zipcode });
    return responseWithCORS(201, newMarket);
    
  } catch (err) {
    console.error("Error:", err);
    return responseWithCORS(500, { error: "Internal server error" });
  }
};
