const {
  checkIfStoreExists,
  getProductsByStore
} = require('./dbProductsHelper');

exports.handler = async (event) => {
  const store_id = event.pathParameters?.storeId;
  console.log('store_id:', store_id);
  console.log("Full event object:", JSON.stringify(event));

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    const storeExists = await checkIfStoreExists(store_id);
    if (!storeExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Store not found' }),
      };
    }

    const products = await getProductsByStore(store_id);

    if (products.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No products found for this store' }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(products),
    };
  } catch (err) {
    console.error('Error fetching products by store:', err.message || err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Database error', detail: err.message || 'Unknown error' }),
    };
  }
};
