const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = process.env.DATABASE_URL
  ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }
  : {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  };

const pool = new Pool(dbConfig);

module.exports = pool; 
