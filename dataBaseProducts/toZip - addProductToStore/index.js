// const {checkIfStoreExists, getStoreById} = require('../utils/dbStoreHelpers');
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
    const { store_id, product_name, category, brand, description, tag, price, quantity, image_url } = body;
  
    try {
       const storeExists = await checkIfStoreExists(store_id);
       if (!storeExists) {
         return responseWithCORS(404, { error: 'Store not found' });
       }
  
      const productExists = await checkIfProductExists(product_name);
      let product_id = productExists
        ? productExists.id
        : (await createProduct(product_name, category, brand, tag)).id;
  
      const productStoreExists = await checkIfProductExistsInStore(product_id, store_id);
  
      if (productStoreExists) {
        const updateProduct = await updateProductQuantity(product_id, store_id, productStoreExists.quantity + quantity);
        return responseWithCORS(200, {
          message: 'Product quantity updated',
          product: updateProduct,
        });
      } else {
        const newProductStore = await addProductToStore(product_id, store_id, name, price, description, quantity, image_url);
        return responseWithCORS(200, {
          message: 'Product added to store',
          product: newProductStore,
        });
      }
    } catch (err) {
      console.error('Error:', err);
      return responseWithCORS(500, { error: 'Database error' });
    }
  };
  