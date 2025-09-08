const {
    getProductsByName
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
  
    const product_name = event.pathParameters.product_name;
  
    try {
       
        const product = await getProductsByName(product_name);
    
        if (product.length === 0) {
            return responseWithCORS(404, { error: 'No products found for this store' });
        }
    
        return responseWithCORS(200, products);
  
    } catch (err) {
      console.error('Error fetching products by store:', err);
      return responseWithCORS(500, { error: 'Database error' });
  
    } 
    
  };
  