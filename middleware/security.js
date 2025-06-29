const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

// Create DOMPurify instance for server-side XSS protection
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
        // Skip rate limiting for successful requests only
        skipSuccessfulRequests: false,
        // Skip failed requests to prevent brute force attacks
        skipFailedRequests: false,
    });
};

// General rate limiter - 100 requests per 15 minutes
const generalLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100,
    'Too many requests from this IP, please try again after 15 minutes'
);

// Strict rate limiter for sensitive operations - 5 requests per 15 minutes
const strictLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5,
    'Too many attempts, please try again after 15 minutes'
);

// API rate limiter - 1000 requests per hour for API endpoints
const apiLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    1000,
    'API rate limit exceeded, please try again after an hour'
);

// XSS Protection Middleware using DOMPurify
const xssProtection = (req, res, next) => {
    const sanitizeObject = (obj) => {
        if (obj && typeof obj === 'object') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'string') {
                        // Sanitize string values to prevent XSS
                        obj[key] = DOMPurify.sanitize(obj[key], {
                            ALLOWED_TAGS: [], // Strip all HTML tags
                            ALLOWED_ATTR: [], // Strip all attributes
                            KEEP_CONTENT: true, // Keep text content
                        });
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        // Recursively sanitize nested objects
                        sanitizeObject(obj[key]);
                    }
                }
            }
        }
    };

    // Sanitize request body
    if (req.body) {
        sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
        sanitizeObject(req.params);
    }

    next();
};

// SQL Injection Protection Middleware
const sqlInjectionProtection = (req, res, next) => {
    const detectSQLInjection = (value) => {
        if (typeof value !== 'string') return false;

        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
            /(;|\-\-|\/\*|\*\/)/,
            /(\b(OR|AND)\b.*=.*)/i,
            /(1=1|1=0)/,
            /('|('')|"|(""))/,
        ];

        return sqlPatterns.some(pattern => pattern.test(value));
    };

    const checkObject = (obj, path = '') => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const currentPath = path ? `${path}.${key}` : key;

                if (typeof obj[key] === 'string') {
                    if (detectSQLInjection(obj[key])) {
                        return res.status(400).json({
                            error: 'Potential SQL injection detected',
                            field: currentPath
                        });
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    const result = checkObject(obj[key], currentPath);
                    if (result) return result;
                }
            }
        }
        return null;
    };

    // Check all input sources
    const sources = [
        { data: req.body, name: 'body' },
        { data: req.query, name: 'query' },
        { data: req.params, name: 'params' }
    ];

    for (const source of sources) {
        if (source.data) {
            const result = checkObject(source.data);
            if (result) return result;
        }
    }

    next();
};

// Content Security Policy
const cspOptions = {
    directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
    },
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
        return res.status(413).json({
            error: 'Request entity too large',
            maxSize: '10MB'
        });
    }

    next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
};

module.exports = {
    generalLimiter,
    strictLimiter,
    apiLimiter,
    xssProtection,
    sqlInjectionProtection,
    cspOptions,
    requestSizeLimiter,
    securityHeaders,
    // Additional security middlewares
    hpp: hpp(), // HTTP Parameter Pollution protection
    mongoSanitize: mongoSanitize(), // NoSQL injection protection
}; 