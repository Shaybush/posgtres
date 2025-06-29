require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    adminUser: process.env.PGADMIN_EMAIL,
    adminPassword: process.env.PGADMIN_PASSWORD,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

// Test the database connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected to PostgreSQL database');
    release(); // Release the client back to the pool to avoid connection leaks
});

module.exports = { pool }; 