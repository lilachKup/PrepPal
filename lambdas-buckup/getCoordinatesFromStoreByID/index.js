const {
    getStoreLocationById,
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

    const store_id = event.pathParameters?.store_id;

    try {

        const location = await getStoreLocationById(store_id);

        if (location.length === 0) {
            return responseWithCORS(404, { error: 'No store found ' });
        }

        return responseWithCORS(200, location);

    } catch (err) {
        console.error('Error fetching store:', err);
        return responseWithCORS(500, { error: 'Database error' });

    }

};
