const { updateStoreHoursAndLocation } = require('./dbProductsHelper');

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

    if (event.httpMethod === 'OPTIONS') {
        return responseWithCORS(200, { ok: true });
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const { store_id, location, coordinates, storeHours } = body;

        if (!store_id || location == null || coordinates == null || storeHours == null) {
            return responseWithCORS(400, { error: "Missing required fields (store_id, location, coordinates, storeHours)." });
        }

        const updated = await updateStoreHoursAndLocation(store_id, location, coordinates, storeHours);

        if (!updated) {
            return responseWithCORS(404, { error: "Store not found" });
        }

        // מחזירים את הרשומה המעודכנת כדי שהפרונט יעדכן state
        return responseWithCORS(200, { message: "Updated successfully", store: updated });
    } catch (err) {
        console.error("Error updating store:", err);
        return responseWithCORS(500, { error: "Database error" });
    }
};
