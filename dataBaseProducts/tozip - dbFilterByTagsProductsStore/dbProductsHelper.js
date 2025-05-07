const db = require('./db');
const { query } = require("express");


const checkIfStoreExists = async (store_id) => {
    const result = await db.query(
        'SELECT id FROM stores WHERE id = $1', [store_id]
    );
    return result.rows[0] || null;
}

const getStoreProductsByTags = async (store_id, tags) => {
    const result = await db.query(
        `SELECT p.id, p.name, p.category, p.description, p.tag, p.brand, ps.price, ps.quantity, ps.store_id
         FROM product_store ps
         JOIN products p ON ps.product_id = p.id
         WHERE ps.store_id = $1
           AND EXISTS (
               SELECT 1
               FROM unnest(ARRAY(SELECT trim(x) FROM unnest(string_to_array(p.tag, ',')) x)) AS tag_value(tag)
               WHERE ${tags.map((_, i) => `tag_value.tag ILIKE $${i + 2}`).join(' OR ')}
           )`,
        [store_id, ...tags]
    );
    return result.rows;
};





module.exports = {
    checkIfStoreExists,
    getStoreProductsByTags
};