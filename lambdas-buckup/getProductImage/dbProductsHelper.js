// dbProductsHelper.js
const db = require('./db');

// 1) בדיקת חנות - לתקן ל-store_id
const checkIfStoreExists = async (store_id) => {
  try {
    const result = await db.query(
      'SELECT 1 FROM stores WHERE store_id = $1',
      [store_id]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error('Error checking store existence:', err);
    throw err;
  }
};

// 2) שליפת כתובת תמונה לפי זוג המפתחות (כבר נכון אצלך)
const getProductImageUrl = async (store_id, product_id) => {
  const result = await db.query(
    `SELECT image_url
     FROM product_store
     WHERE store_id = $1 AND product_id = $2
     LIMIT 1`,
    [store_id, product_id]
  );
  return result.rows[0] || null;
};

// 3) (אופציונלי) שליפת כל מוצרי החנות – בלי קבוע לא מוגדר
const getInfoFromStore = async (store_id) => {
  const result = await db.query(
    `SELECT store_id, product_id, name, price, quantity, image_url
     FROM product_store
     WHERE store_id = $1
     ORDER BY product_id`,
    [store_id]
  );
  return result.rows;
};

module.exports = {
  checkIfStoreExists,
  getProductImageUrl,
  getInfoFromStore,
};
