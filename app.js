const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const usersRouter = require('./routes/users');
const security = require('./middleware/security');

const app = express();

// Trust proxy if behind reverse proxy (like nginx, cloudflare, etc.)
app.set('trust proxy', 1);

// Logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('combined'));
}

// Security Headers
app.use(security.securityHeaders);

// Helmet for additional security headers
app.use(helmet({
    contentSecurityPolicy: security.cspOptions,
    crossOriginEmbedderPolicy: false, // Disable if causing issues with external resources
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // Restrict to your frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Allow cookies
    maxAge: 86400, // Cache preflight for 24 hours
}));

// Request size limiting
app.use(security.requestSizeLimiter);

// Body parsing with size limits
app.use(express.json({
    limit: '10kb',
    type: 'application/json'
}));
app.use(express.urlencoded({
    extended: true,
    limit: '10kb',
    parameterLimit: 20 // Limit number of parameters
}));

// Security Middlewares (Order is important!)
app.use(security.hpp); // HTTP Parameter Pollution protection
app.use(security.mongoSanitize); // NoSQL injection protection
app.use(security.xssProtection); // XSS protection using DOMPurify
app.use(security.sqlInjectionProtection); // SQL injection protection

// Rate limiting - Apply general rate limiting to all routes
app.use(security.generalLimiter);

// API Routes with additional rate limiting
app.use('/api/users', security.apiLimiter, usersRouter);

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    // Log error details
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Rate limiting errors
    if (err.status === 429) {
        return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded, please try again later'
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.details || err.message
        });
    }

    // Database errors
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database connection failed'
        });
    }

    // Default error response
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(err.status || 500).json({
        error: err.status === 500 ? 'Internal Server Error' : err.message,
        message: isDevelopment ? err.message : 'Something went wrong',
        stack: isDevelopment ? err.stack : undefined
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🛡️  Security features enabled:`);
    console.log(`   - Rate limiting: ✅`);
    console.log(`   - XSS protection: ✅`);
    console.log(`   - SQL injection protection: ✅`);
    console.log(`   - NoSQL injection protection: ✅`);
    console.log(`   - HTTP Parameter Pollution protection: ✅`);
    console.log(`   - Security headers: ✅`);
    console.log(`   - CORS protection: ✅`);
    console.log(`   - Request size limiting: ✅`);
});

module.exports = app;

// TODO: option 1 projects 
// redis (cache) + mongo + react + redux + api 
// redis (queue) + postgres + react + redux + api 

// TODO: option 2 
// unit tests(jest), e2e tests(playwright), storybook. 