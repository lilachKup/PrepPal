const {
  checkIfStoreExists,
  checkIfProductExists,
  checkIfProductExistsInStore,
  deleteProductFromStore
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

  console.log("trying to send POST");
  console.log('event:', JSON.stringify(event));

  const body = JSON.parse(event.body);
  const { store_id, product_id} = body;

  try {
     const storeExists = await checkIfStoreExists(store_id);
     if (!storeExists) {
       return responseWithCORS(404, { error: 'Store not found' });
     }

    const productExists = await checkIfProductExists(product_id);
      if (!productExists) {
          return responseWithCORS(404, { error: 'Product not found' });
      }

    const productStoreExists = await checkIfProductExistsInStore(product_id, store_id);
    if (productStoreExists) {
      const deleteProduct = await deleteProductFromStore(product_id, store_id);
      return responseWithCORS(200, {
        message: 'Product deleted from store',
        product: deleteProduct,
      });
    }
      else {
          return responseWithCORS(404, { error: 'Product not found in store' });
      }
  } catch (err) {
    console.error('Error:', err);
    return responseWithCORS(500, { error: 'Database error' });
  }
};