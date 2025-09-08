const db = require('./db');
const {query} = require("express");


const getAllStores = async () => {
    const result = await db.query(
        `SELECT store_id, name, street, city FROM stores`
    );
    return result.rows;
};

module.exports = {

    getAllStores
};
