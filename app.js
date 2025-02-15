const express = require('express');
const { pool } = require('./db/config');
const usersRouter = require('./routes/users');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/users', usersRouter);

// Basic error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; 