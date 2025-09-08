const {
  checkIfStoreExists,
  checkIfProductExists,
  createProduct,
  checkIfProductExistsInStore,
  addProductToStore,
  updateProductQuantity
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
  const { store_id, product_name, category, brand, description, tags, price, quantity, image_url } = body;
  console.log('store_id:', store_id);

  try {
    // check if store exists
    const storeExists = await checkIfStoreExists(store_id);  // check if store exists, not market
    if (!storeExists) {
      return responseWithCORS(404, { error: 'Store not found' });  // return error if store is not found
    }

    // check if product exists
    const productExists = await checkIfProductExists(product_name);
    const tagString = Array.isArray(tags) ? tags.join(',') : tags;

    // if product exists, use its ID; otherwise, create a new product
    let product_id = productExists
      ? productExists.id
      : (await createProduct(product_name, category, brand, tagString)).id;

    // check if the product exists in the store
    const productStoreExists = await checkIfProductExistsInStore(product_id, store_id);

    // if the product already exists in the store, update the quantity
    if (productStoreExists) {
      const updateProduct = await updateProductQuantity(product_id, store_id, productStoreExists.quantity + quantity);
      return responseWithCORS(200, {
        message: 'Product quantity updated',
        product: updateProduct,
      });
    } else {
      // if the product doesn't exist in the store, add it to the store
      const newProductStore = await addProductToStore(product_id, store_id, product_name, price, description, quantity, image_url);
      return responseWithCORS(200, {
        message: 'Product added to store',
        product: newProductStore,
      });
    }
  } catch (err) {
    console.error('Error:', err);
    return responseWithCORS(500, { error: 'Database error' });  // if there's a database error, return 500
  }
};
