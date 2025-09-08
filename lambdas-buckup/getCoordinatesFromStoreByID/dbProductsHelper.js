const db = require('./db');
const {query} = require("express");


const getStoreLocationById = async (store_id) => {
    const result = await db.query(
        `SELECT store_coordinates 
         FROM stores 
         WHERE store_id = $1`,
        [store_id]
    );

    if (result.rows.length === 0) {
        return null;
    }
    const storeCoordinates = result.rows[0].store_coordinates;
    return storeCoordinates;
}


module.exports = {
    
    getStoreLocationById
};
