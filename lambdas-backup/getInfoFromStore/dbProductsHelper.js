const db = require('./db');
const {query} = require("express");

//check if id exist
const checkIfStoreExists = async (id) => {
    try {
        const result = await db.query(
            'SELECT 1 FROM stores WHERE store_id = $1',
            [id]
        );
        return result.rows.length > 0;
    } catch (err) {
        console.error('Error checking store existence:', err);
        throw err;
    }
};

const getInfoFromStore = async (store_id) => {
    const result = await db.query(
        'SELECT * FROM stores WHERE store_id = $1',
        [store_id]
    );

    return result.rows;
}


module.exports = {
    checkIfStoreExists,
    getInfoFromStore
};
