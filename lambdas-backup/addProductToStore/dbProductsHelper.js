const db = require('./db');
const { query } = require("express");

//check if id exists in stores
const checkIfStoreExists = async (id) => {
    try {
        const result = await db.query(
            'SELECT 1 FROM stores WHERE store_id = $1',  // השתמש ב "stores" במקום "markets"
            [id]
        );
        return result.rows.length > 0;
    } catch (err) {
        console.error('Error checking store existence:', err);
        throw err;
    }
};

//if product exists return its id
const checkIfProductExists = async (product_name) => {
    const result = await db.query(
        'SELECT id FROM products WHERE name = $1', [product_name]
    );
    return result.rows[0] || null;
};

//create product if it is not in the list
const createProduct = async (product_name, category, brand, tag) => {
    const result = await db.query(
        'INSERT INTO products (name, category, brand, tag) VALUES ($1, $2, $3, $4) RETURNING id',
        [product_name, category, brand, tag]
    );
    return result.rows[0];
};

const checkIfProductExistsInStore = async (product_id, store_id) => {
    const result = await db.query(
        'SELECT * FROM product_store WHERE product_id = $1 AND store_id = $2', // השתמש ב "products_stores" במקום "products_markets"
        [product_id, store_id]
    );
    return result.rows[0] || null;
};

const updateProductQuantity = async (product_id, store_id, quantity) => {
    if (quantity === 0) {
        const result = await db.query(
            'DELETE FROM product_store WHERE product_id = $1 AND store_id = $2 RETURNING *',  // השתמש ב "products_stores" במקום "products_markets"
            [product_id, store_id]
        );
        return result.rows[0];
    } else {
        const result = await db.query(
            'UPDATE product_store SET quantity = $1 WHERE product_id = $2 AND store_id = $3 RETURNING *',  // השתמש ב "products_stores" במקום "products_markets"
            [quantity, product_id, store_id]
        );
        return result.rows[0];
    }
};

const addProductToStore = async (product_id, store_id, name, price, description, quantity, image_url) => {
    const result = await db.query(
        'INSERT INTO product_store (product_id, store_id, name, price, quantity, description, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',  // השתמש ב "products_stores" במקום "products_markets"
        [product_id, store_id, name, price, quantity, description, image_url]
    );
    return result.rows[0];
};

const updateProductPrice = async (product_id, store_id, newPrice) => {
    const result = await db.query(
        'UPDATE product_store SET price = $1 WHERE product_id = $2 AND store_id = $3 RETURNING *',  // השתמש ב "products_stores" במקום "products_markets"
        [newPrice, product_id, store_id]
    );
    return result.rows[0];
};

module.exports = {
    checkIfStoreExists,
    checkIfProductExists,
    createProduct,
    checkIfProductExistsInStore,
    updateProductQuantity,
    addProductToStore,
    updateProductPrice,
};
