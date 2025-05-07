const db = require('./db');
const { query } = require("express");

const createNewMarket = async ({ market_id, name, street, city, email, zipcode }) => {
    const result = await db.query(
        `INSERT INTO markets (market_id, name, street, city, email, zipcode)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING market_id, name, street, city, email, zipcode`,
        [market_id, name, street, city, email, zipcode]
    );
    return result.rows[0];
};

module.exports = {
    createNewMarket
};