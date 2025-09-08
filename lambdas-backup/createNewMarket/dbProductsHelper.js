const db = require('./db');


const createNewStore = async ({ store_id, name, location, email, store_hours, store_coordinates }) => {
    const result = await db.query(
      `INSERT INTO stores (store_id, name, location, email, store_hours, store_coordinates)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [store_id, name, location, email, store_hours, store_coordinates]
    );
    return result.rows[0];
  };
  

module.exports = {
    createNewStore
};
