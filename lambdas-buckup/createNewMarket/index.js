const { createNewStore } = require('./dbProductsHelper');

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
    if (!event.body) {
      return responseWithCORS(400, { error: "Missing request body" });
    }
    console.log("EVENT:", JSON.stringify(event, null, 2));


    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return responseWithCORS(400, { error: "Invalid JSON in request body" });
    }

    const { store_id, name, location, email, store_hours, store_coordinates } = body;

    if (!store_id || !name || !location || !email || !store_hours || !store_coordinates) {
      return responseWithCORS(400, { error: "Missing one or more required fields" });
    }
    
    const newStore = await createNewStore({ store_id, name, location, email, store_hours, store_coordinates });
    
    return responseWithCORS(201, newStore);

  } catch (err) {
    console.error("Error:", err);
    return responseWithCORS(500, { error: "Internal server error" });
  }
};
