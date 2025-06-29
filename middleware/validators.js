const { param, body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const userValidators = {
    // id parameter validation
    validateId: [
        param('id')
            .isInt()
            .withMessage('ID must be an integer')
            .trim()
            .escape(),
        validate
    ],

    // Create/Update user validation
    validateUser: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('email')
            .trim()
            .isEmail()
            .withMessage('Must be a valid email')
            .normalizeEmail(),
        body('phone')
            .trim()
            .matches(/^\+9725\d{8}$/)
            .withMessage('Must be a valid Israeli phone number (+9725xxxxxxxx)'),
        body('address')
            .trim()
            .isLength({ min: 5, max: 255 })
            .withMessage('Address must be between 5 and 255 characters')
            .escape(),
        body('city')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('City must be between 2 and 100 characters')
            .escape(),
        body('country')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Country must be between 2 and 100 characters')
            .escape(),
        validate
    ]
};

module.exports = userValidators; 