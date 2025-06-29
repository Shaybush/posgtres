const express = require('express');
const router = express.Router();
const { pool } = require('../db/config');
const { validateId, validateUser } = require('../middleware/validators');

// Get all users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user by id
router.get('/:id', validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user
router.post('/', validateUser, async (req, res) => {
    try {
        const { name, email, phone, address, city, country } = req.body;
        const result = await pool.query(
            `INSERT INTO users (name, email, phone, address, city, country) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [name, email, phone, address, city, country]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Email already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user
router.put('/:id', validateUser, async (req, res) => {
    // TODO: Implement update user
});

module.exports = router; 