const express = require('express');
const router = express.Router();
const { pool } = require('../db/config');
const { validateId, validateUser, validateUserUpdate } = require('../middleware/validators');
const { strictLimiter } = require('../middleware/security');

// Get all users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id ASC');

        // Log successful access for monitoring
        console.log(`Users list accessed by IP: ${req.ip} at ${new Date().toISOString()}`);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (err) {
        console.error('Database error in GET /users:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve users'
        });
    }
});

// Get user by id
router.get('/:id', validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user found with ID: ${id}`
            });
        }

        // Log successful access
        console.log(`User ${id} accessed by IP: ${req.ip} at ${new Date().toISOString()}`);

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Database error in GET /users/:id:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve user'
        });
    }
});

// Create new user - Apply strict rate limiting
router.post('/', strictLimiter, validateUser, async (req, res) => {
    try {
        const { name, email, phone, address, city, country } = req.body;

        // Check if email already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'Email already exists',
                message: 'A user with this email address already exists'
            });
        }

        // Insert new user
        const result = await pool.query(
            `INSERT INTO users (name, email, phone, address, city, country) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [name, email, phone, address, city, country]
        );

        // Log successful user creation
        console.log(`New user created:`, {
            id: result.rows[0].id,
            email: email,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Database error in POST /users:', err);

        // Handle specific database errors
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({
                error: 'Email already exists',
                message: 'A user with this email address already exists'
            });
        }

        if (err.code === '23502') { // Not null violation
            return res.status(400).json({
                error: 'Missing required field',
                message: 'All required fields must be provided'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create user'
        });
    }
});

// Update user - Apply strict rate limiting for sensitive operations
router.put('/:id', strictLimiter, validateId, validateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, city, country } = req.body;

        // Check if user exists
        const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user found with ID: ${id}`
            });
        }

        // Check if email already exists for another user
        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
        if (emailCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Email already exists',
                message: 'Another user with this email address already exists'
            });
        }

        // Update user
        const result = await pool.query(
            `UPDATE users SET 
             name = $1, email = $2, phone = $3, address = $4, city = $5, country = $6, 
             updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 
             RETURNING *`,
            [name, email, phone, address, city, country, id]
        );

        // Log successful update
        console.log(`User updated:`, {
            id: id,
            email: email,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'User updated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Database error in PUT /users/:id:', err);

        if (err.code === '23505') { // Unique violation
            return res.status(409).json({
                error: 'Email already exists',
                message: 'Another user with this email address already exists'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update user'
        });
    }
});

// Partial update user (PATCH) - Apply strict rate limiting
router.patch('/:id', strictLimiter, validateId, validateUserUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if user exists
        const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user found with ID: ${id}`
            });
        }

        // If email is being updated, check for conflicts
        if (updates.email) {
            const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [updates.email, id]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({
                    error: 'Email already exists',
                    message: 'Another user with this email address already exists'
                });
            }
        }

        // Build dynamic update query
        const allowedFields = ['name', 'email', 'phone', 'address', 'city', 'country'];
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update',
                message: 'Please provide at least one valid field to update'
            });
        }

        // Add updated_at timestamp
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id); // Add ID for WHERE clause

        const query = `
            UPDATE users SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        // Log successful partial update
        console.log(`User partially updated:`, {
            id: id,
            fields: Object.keys(updates),
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'User updated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Database error in PATCH /users/:id:', err);

        if (err.code === '23505') { // Unique violation
            return res.status(409).json({
                error: 'Email already exists',
                message: 'Another user with this email address already exists'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update user'
        });
    }
});

// Delete user - Apply strict rate limiting
router.delete('/:id', strictLimiter, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user found with ID: ${id}`
            });
        }

        // Delete user
        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        // Log successful deletion
        console.log(`User deleted:`, {
            id: id,
            email: existingUser.rows[0].email,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (err) {
        console.error('Database error in DELETE /users/:id:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to delete user'
        });
    }
});

module.exports = router; 