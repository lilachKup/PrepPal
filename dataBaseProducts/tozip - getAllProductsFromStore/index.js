const {
  checkIfStoreExists,
  getProductsByStore
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

  const store_id = event.pathParameters.store_id;

  try {
    const storeExists = await checkIfStoreExists(store_id);
    if (!storeExists) {
      return responseWithCORS(404, { error: 'Store not found' });
    }

    const products = await getProductsByStore(store_id);

    if (products.length === 0) {
      return responseWithCORS(404, { error: 'No products found for this store' });
    }

    return responseWithCORS(200, products);

  } catch (err) {
    console.error('Error fetching products by store:', err);
    return responseWithCORS(500, { error: 'Database error' });

  } finally {
    if (typeof pool !== 'undefined') {
      await pool.end(); // רק אם pool קיים
    }
  }
};
