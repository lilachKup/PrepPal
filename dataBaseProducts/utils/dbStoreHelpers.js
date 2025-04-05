const db = require('../db');
const {query} = require("express");

//check if id exist
const checkIfStoreExists = async (id) => {
    try {
        const result = await db.query(
            'SELECT 1 FROM stores WHERE id = $1',
            [id]
        );
        return result.rows.length > 0;
    } catch (err) {
        console.error('Error checking store existence:', err);
        throw err;
    }
};

//create store
const createStore = async (name, location) => {
    const result = await db.query(
        'INSERT INTO stores (name, location) VALUES ($1, $2) RETURNING *',
        [name, location]
    );
    return result.rows[0];
};


//check when we create new store we dont get same name and location
const checkDoubleStore = async (name, location) => {
    try {
        const result = await db.query(
            'SELECT 1 FROM stores WHERE name = $1 AND location = $2',
            [name, location]
        );
        return result.rows.length > 0;
    } catch (err) {
        console.error('Error checking duplicate store:', err);
        throw err;
    }
};

const getAllStores = async () => {
    const result = await db.query('SELECT * FROM stores ORDER BY id');
    return result.rows;
};

const getStoreById = async (id) => {
    const result = await db.query('SELECT * FROM stores WHERE id = $1', [id]);
    return result.rows[0] || null;
};


const deleteStoreById = async (id) => {
    const result = await db.query('DELETE FROM stores WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
};

const updateStoreSequence = async () => {
    try {
        await db.query(
            'SELECT setval(\'stores_id_seq\', (SELECT COALESCE(MIN(id), 1) FROM stores), false)'
        );
    } catch (err) {
        console.error('Error updating store sequence:', err);
        throw err;
    }
};

const updateStoreById = async (id, updates) => {
    let query = 'UPDATE stores SET ';
    const values = [];
    const setClauses = [];

    Object.entries(updates).forEach(([key, value], index) => {
        setClauses.push(`${key} = $${index + 1}`);
        values.push(value);
    });

    query += setClauses.join(', ');
    query += ` WHERE id = $${values.length + 1} RETURNING *`;
    values.push(id);

    const result = await db.query(query, values);
    return result.rows[0];
};


module.exports = {
    checkIfStoreExists,
    createStore,
    checkDoubleStore,
    getAllStores,
    getStoreById,
    deleteStoreById,
    updateStoreById,
    updateStoreSequence
};
