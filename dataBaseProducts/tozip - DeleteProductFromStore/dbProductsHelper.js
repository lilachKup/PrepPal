const db = require('./db');
const {query} = require("express");

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
        'SELECT id FROM stores WHERE id = $1', [store_id]
    );
    return result.rows[0] || null;
}

module.exports = {
    checkIfStoreExists,
    checkIfProductExists,
    checkIfProductExistsInStore,
    deleteProductFromStore
};