const { Pool } = require('pg');

const pool = new Pool({
    host: 'test1.c7uq0ym0acsu.us-east-1.rds.amazonaws.com',
    port: 5432,
    user: 'prepal',
    password: 'Qwe12345!',
    database: 'prepalTest',
    ssl: {
        rejectUnauthorized: false
    }
});
module.exports = pool;