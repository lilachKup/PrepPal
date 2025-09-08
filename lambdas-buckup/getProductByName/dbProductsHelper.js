const db = require('../db');
const {query} = require("express");


const getProductsByName = async (product_name) => {
    const result = await db.query(
        `SELECT p.id, p.name, p.category, p.description, p.tag, p.brand, ps.price, ps.quantity, ps.image_url
         FROM product_store ps
         JOIN products p ON ps.product_name = p.name
         WHERE LOWER(p.name) = LOWER($1)`,
        [product_name]
    );
    return result.rows;
};


module.exports = {
    
    getProductsByName
};
