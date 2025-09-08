const db = require('./db');
const { query } = require("express");

//if product exist return his id
const checkIfProductExists = async (product_id) => {
    const result = await db.query(
        'SELECT id FROM products WHERE id = $1', [product_id]
    );
    return result.rows[0] || null;
};

const checkIfProductExistsInStore = async (product_id, store_id) => {
    const result = await db.query(
        'SELECT * FROM product_store WHERE product_id = $1 AND store_id = $2',
        [product_id, store_id]
    );
    return result.rows[0] || null;
};

const deleteProductFromStore = async (product_id, store_id) => {
    const result = await db.query(
        'DELETE FROM product_store WHERE product_id = $1 AND store_id = $2 RETURNING *',
        [product_id, store_id]
    );
    return result.rows[0];
};

const checkIfStoreExists = async (store_id) => {
    const result = await db.query(
        'SELECT 1 FROM stores WHERE store_id = $1', [store_id]
    );
    return result.rows[0] || null;
}

const editProductInStore = async (product_id, store_id, quantity, price, description, image_url) => {
    if (quantity === 0) {
        return deleteProductFromStore(product_id, store_id);
    } else {
        const result = await db.query(
            'UPDATE product_store SET price = $1, quantity = $2, description = $3, image_url = $4 WHERE product_id = $5 AND store_id = $6 RETURNING *',
            [price, quantity, description, image_url, product_id, store_id]
        );
        return result.rows[0];
    }
};


module.exports = {
    checkIfStoreExists,
    checkIfProductExists,
    checkIfProductExistsInStore,
    deleteProductFromStore,
    editProductInStore
};