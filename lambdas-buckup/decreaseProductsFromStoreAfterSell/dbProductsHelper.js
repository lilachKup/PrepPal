const db = require('./db');



const decreaseProductsFromStoreAfterSell = async (store_id, name, quantity) => {
    const result = await db.query(
        `UPDATE product_store
         SET quantity = quantity - $1
         WHERE store_id = $2
           AND product_id = (
             SELECT id FROM products
             WHERE LOWER(name) = LOWER($3)
         )`,
        [quantity, store_id, name]
    );

    return result;
};


module.exports = {

    decreaseProductsFromStoreAfterSell
};
