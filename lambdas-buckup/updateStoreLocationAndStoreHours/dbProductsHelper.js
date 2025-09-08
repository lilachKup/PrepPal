const db = require('./db');

const updateStoreHoursAndLocation = async (store_id, location, coordinates, storeHours) => {
    const sql = `
    UPDATE stores
    SET
      location = $1,
      store_coordinates = $2,
      store_hours = $3
    WHERE store_id = $4
    RETURNING store_id, name, email, location, store_coordinates, store_hours
  `;
    const params = [location, coordinates, storeHours, store_id];
    const { rows } = await db.query(sql, params);
    return rows[0] || null;
};

module.exports = {
    updateStoreHoursAndLocation
};
