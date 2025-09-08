const {
  checkIfStoreExists,
  checkIfProductExists,
  checkIfProductExistsInStore,
  editProductInStore,
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
  const { store_id, product_id, description, price, quantity, image_url} = body;

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
      const editedProduct = await editProductInStore(product_id, store_id, quantity, price, description, image_url);
      return responseWithCORS(200, {
        message: 'Product edided from store',
        product: editedProduct,
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