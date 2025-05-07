const db = require('../db');
const {query} = require("express");

//if product exist return his id
const checkIfProductExists = async (product_name) => {
    const result = await db.query(
        'SELECT id FROM products WHERE name = $1', [product_name]
    );
    return result.rows[0] || null;
};

//crete product if he is not in the list
const createProduct = async (product_name, category, description, tag) => {
    const result = await db.query(
        'INSERT INTO products (name, category, description, tag) VALUES ($1, $2, $3, $4) RETURNING id',
        [product_name, category, description, tag]
    );
    return result.rows[0];
};

const checkIfProductExistsInStore = async (product_id, store_id) => {
    const result = await db.query(
        'SELECT * FROM product_store WHERE product_id = $1 AND store_id = $2',
        [product_id, store_id]
    );
    return result.rows[0] || null;
};

const updateProductQuantity = async (product_id, store_id, quantity) => {
    if (quantity === 0) {
        const result = await db.query(
            'DELETE FROM product_store WHERE product_id = $1 AND store_id = $2 RETURNING *',
            [product_id, store_id]
        );
        return result.rows[0];
    }
    else {
        const result = await db.query(
            'UPDATE product_store SET quantity = $1 WHERE product_id = $2 AND store_id = $3 RETURNING *',
            [quantity, product_id, store_id]
        );
        return result.rows[0];
    }
};

const addProductToStore = async (product_id, store_id, price, quantity, image_url) => {
    const result = await db.query(
        'INSERT INTO product_store (product_id, store_id, price, quantity, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [product_id, store_id, price, quantity, image_url]
    );
    return result.rows[0];
};


const updateProductPrice = async (product_id, store_id, newPrice) => {
    const result = await db.query(
        'UPDATE product_store SET price = $1 WHERE product_id = $2 AND store_id = $3 RETURNING *',
        [newPrice, product_id, store_id]
    );
    return result.rows[0];
};

const getProductInStore = async (product_id, store_id) => {
    const result = await db.query ('SELECT * FROM product_store WHERE product_id = $1 AND store_id = $2',[product_id, store_id]);
    return result.rows[0];
}

const getProductWithoutStore = async (product_id) => {
    try {
        const result = await db.query(
            'SELECT * FROM products WHERE id = $1',
            [product_id]
        );
        return result.rows[0] || null; // מחזירים את המוצר אם נמצא, אחרת null
    } catch (err) {
        console.error('Error fetching product:', err);
        throw err;
    }
};

const deleteProductFromStore = async (product_id, store_id) => {
    const result = await db.query(
        'DELETE FROM product_store WHERE product_id = $1 AND store_id = $2 RETURNING *',
        [product_id, store_id]
    );
    return result.rows[0];
};


const getProductsByStore = async (store_id) => {
    const result = await db.query(
        `SELECT p.id, p.name, p.category, p.description, p.tag, p.brand, ps.price, ps.quantity, ps.image_url
        FROM product_store ps
        JOIN products p ON ps.product_id = p.id
        WHERE ps.store_id = $1`, 
        [store_id]
    );
    return result.rows;
}


module.exports = {
    checkIfProductExists,
    createProduct,
    checkIfProductExistsInStore,
    updateProductQuantity,
    addProductToStore,
    updateProductPrice,
    getProductInStore,
    getProductWithoutStore,
    deleteProductFromStore,
    getProductsByStore
};
