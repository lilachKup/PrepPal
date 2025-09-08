const { Pool } = require('pg');

const pool = new Pool({
  host: 'prepalstores.c1imaau44624.us-east-1.rds.amazonaws.com',
  port: 5432,
  user: 'postgres',
  password: 'Qwe12345!', 
  database: 'prepalStores',
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
