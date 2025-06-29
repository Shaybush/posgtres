const { param, body, validationResult } = require('express-validator');

// Enhanced validation middleware with detailed error reporting
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Log validation failures for security monitoring
        console.warn('Validation failed:', {
            ip: req.ip,
            url: req.originalUrl,
            method: req.method,
            errors: errors.array(),
            timestamp: new Date().toISOString()
        });

        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

const userValidators = {
    // Enhanced ID parameter validation
    validateId: [
        param('id')
            .isInt({ min: 1, max: 2147483647 }) // PostgreSQL integer limits
            .withMessage('ID must be a positive integer within valid range')
            .toInt() // Convert to integer
            .custom((value) => {
                // Additional check for SQL injection patterns in ID
                const str = value.toString();
                if (/['"`;\\-]/.test(str)) {
                    throw new Error('Invalid characters in ID');
                }
                return true;
            }),
        validate
    ],

    // Enhanced user validation with comprehensive sanitization
    validateUser: [
        // Name validation with enhanced security
        body('name')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s\u0590-\u05FF\u0600-\u06FF.-]+$/)
            .withMessage('Name can only contain letters, spaces, dots, hyphens, and Hebrew/Arabic characters')
            .escape() // HTML escape
            .customSanitizer((value) => {
                // Remove multiple spaces and trim
                return value.replace(/\s+/g, ' ').trim();
            }),

        // Email validation with normalization
        body('email')
            .trim()
            .isEmail()
            .withMessage('Must be a valid email address')
            .isLength({ max: 254 }) // RFC 5321 limit
            .withMessage('Email address too long')
            .normalizeEmail({
                gmail_remove_dots: false, // Keep dots in Gmail
                gmail_remove_subaddress: false, // Keep + addressing
                outlookdotcom_remove_subaddress: false,
                yahoo_remove_subaddress: false
            })
            .custom(async (value) => {
                // Check for suspicious email patterns
                const suspiciousPatterns = [
                    /\+.*script/i,
                    /javascript:/i,
                    /data:/i,
                    /<.*>/,
                ];

                if (suspiciousPatterns.some(pattern => pattern.test(value))) {
                    throw new Error('Email contains suspicious content');
                }
                return true;
            }),

        // Enhanced phone validation
        body('phone')
            .trim()
            .matches(/^\+9725\d{8}$/)
            .withMessage('Must be a valid Israeli phone number (+9725xxxxxxxx)')
            .customSanitizer((value) => {
                // Remove any non-digit characters except the leading +
                return value.replace(/[^\d+]/g, '');
            })
            .isLength({ min: 13, max: 13 })
            .withMessage('Phone number must be exactly 13 characters'),

        // Address validation with enhanced security
        body('address')
            .trim()
            .isLength({ min: 5, max: 255 })
            .withMessage('Address must be between 5 and 255 characters')
            .matches(/^[a-zA-Z0-9\s\u0590-\u05FF\u0600-\u06FF.,-]+$/)
            .withMessage('Address contains invalid characters')
            .escape()
            .customSanitizer((value) => {
                return value.replace(/\s+/g, ' ').trim();
            }),

        // City validation
        body('city')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('City must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s\u0590-\u05FF\u0600-\u06FF.-]+$/)
            .withMessage('City can only contain letters, spaces, dots, hyphens, and Hebrew/Arabic characters')
            .escape()
            .customSanitizer((value) => {
                return value.replace(/\s+/g, ' ').trim();
            }),

        // Country validation
        body('country')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Country must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s\u0590-\u05FF\u0600-\u06FF.-]+$/)
            .withMessage('Country can only contain letters, spaces, dots, hyphens, and Hebrew/Arabic characters')
            .escape()
            .customSanitizer((value) => {
                return value.replace(/\s+/g, ' ').trim();
            }),

        // Custom validation to check for suspicious patterns across all fields
        body().custom((value, { req }) => {
            const allValues = Object.values(req.body).join(' ');

            // Check for script injection attempts
            const dangerousPatterns = [
                /<script[^>]*>.*?<\/script>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /expression\s*\(/gi,
                /vbscript:/gi,
                /data:text\/html/gi,
            ];

            if (dangerousPatterns.some(pattern => pattern.test(allValues))) {
                throw new Error('Suspicious content detected in request');
            }

            return true;
        }),

        validate
    ],

    // Validation for partial updates (PATCH requests)
    validateUserUpdate: [
        // All fields are optional for updates, but if provided, must be valid
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s\u0590-\u05FF\u0600-\u06FF.-]+$/)
            .withMessage('Name can only contain letters, spaces, dots, hyphens, and Hebrew/Arabic characters')
            .escape()
            .customSanitizer((value) => {
                return value ? value.replace(/\s+/g, ' ').trim() : value;
            }),

        body('email')
            .optional()
            .trim()
            .isEmail()
            .withMessage('Must be a valid email address')
            .isLength({ max: 254 })
            .withMessage('Email address too long')
            .normalizeEmail({
                gmail_remove_dots: false,
                gmail_remove_subaddress: false,
                outlookdotcom_remove_subaddress: false,
                yahoo_remove_subaddress: false
            }),

        body('phone')
            .optional()
            .trim()
            .matches(/^\+9725\d{8}$/)
            .withMessage('Must be a valid Israeli phone number (+9725xxxxxxxx)')
            .customSanitizer((value) => {
                return value ? value.replace(/[^\d+]/g, '') : value;
            }),

        body('address')
            .optional()
            .trim()
            .isLength({ min: 5, max: 255 })
            .withMessage('Address must be between 5 and 255 characters')
            .matches(/^[a-zA-Z0-9\s\u0590-\u05FF\u0600-\u06FF.,-]+$/)
            .withMessage('Address contains invalid characters')
            .escape()
            .customSanitizer((value) => {
                return value ? value.replace(/\s+/g, ' ').trim() : value;
            }),

        body('city')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('City must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s\u0590-\u05FF\u0600-\u06FF.-]+$/)
            .withMessage('City can only contain letters, spaces, dots, hyphens, and Hebrew/Arabic characters')
            .escape()
            .customSanitizer((value) => {
                return value ? value.replace(/\s+/g, ' ').trim() : value;
            }),

        body('country')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Country must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s\u0590-\u05FF\u0600-\u06FF.-]+$/)
            .withMessage('Country can only contain letters, spaces, dots, hyphens, and Hebrew/Arabic characters')
            .escape()
            .customSanitizer((value) => {
                return value ? value.replace(/\s+/g, ' ').trim() : value;
            }),

        // Ensure at least one field is provided for update
        body().custom((value, { req }) => {
            const allowedFields = ['name', 'email', 'phone', 'address', 'city', 'country'];
            const providedFields = Object.keys(req.body).filter(key => allowedFields.includes(key));

            if (providedFields.length === 0) {
                throw new Error('At least one field must be provided for update');
            }

            return true;
        }),

        validate
    ]
};

module.exports = userValidators; 