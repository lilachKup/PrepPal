const {
  getAllStores
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


  try {

    const stores = await getAllStores();

    if (product.length === 0) {
      return responseWithCORS(404, { error: 'No products found for this store' });
    }

    return responseWithCORS(200, products);

  } catch (err) {
    console.error('Error fetching products by store:', err);
    return responseWithCORS(500, { error: 'Database error' });

  }

};
