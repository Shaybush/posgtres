const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const usersRouter = require('./routes/users');

const app = express();

// Security Middlewares
app.use(helmet()); // Adds various HTTP headers for security
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', // Restrict to your frontend origin in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10kb' })); // Limit payload size

// Routes
app.use('/api/users', usersRouter);

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; 