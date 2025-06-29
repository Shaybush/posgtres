const { pool } = require('../../db/config');
const { faker } = require('@faker-js/faker');

class TestUtils {
    /**
     * Clean all test data from the database
     */
    static async cleanDatabase() {
        try {
            await pool.query('DELETE FROM users');
            await pool.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
        } catch (error) {
            console.error('Error cleaning database:', error);
            throw error;
        }
    }

    /**
     * Create test users in the database
     * @param {number} count - Number of users to create
     * @returns {Array} Created users
     */
    static async createTestUsers(count = 5) {
        const users = [];

        for (let i = 0; i < count; i++) {
            const user = {
                name: faker.person.fullName(),
                email: faker.internet.email(),
                phone: this.generateIsraeliPhoneNumber(),
                address: faker.location.streetAddress(),
                city: faker.location.city(),
                country: faker.location.country()
            };

            const result = await pool.query(
                'INSERT INTO users (name, email, phone, address, city, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [user.name, user.email, user.phone, user.address, user.city, user.country]
            );

            users.push(result.rows[0]);
        }

        return users;
    }

    /**
     * Create a single test user
     * @param {Object} userData - Optional user data override
     * @returns {Object} Created user
     */
    static async createTestUser(userData = {}) {
        const defaultUser = {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            phone: this.generateIsraeliPhoneNumber(),
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            country: faker.location.country()
        };

        const user = { ...defaultUser, ...userData };

        const result = await pool.query(
            'INSERT INTO users (name, email, phone, address, city, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [user.name, user.email, user.phone, user.address, user.city, user.country]
        );

        return result.rows[0];
    }

    /**
     * Generate Israeli phone number
     * @returns {string} Phone number
     */
    static generateIsraeliPhoneNumber() {
        const prefix = '+9725';
        const randomDigits = faker.string.numeric(7);
        return `${prefix}${randomDigits}`;
    }

    /**
     * Wait for a specified amount of time
     * @param {number} ms - Milliseconds to wait
     */
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate valid user data for API requests
     * @param {Object} overrides - Optional data overrides
     * @returns {Object} User data
     */
    static generateUserData(overrides = {}) {
        return {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            phone: this.generateIsraeliPhoneNumber(),
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            country: faker.location.country(),
            ...overrides
        };
    }

    /**
     * Generate invalid user data for negative testing
     * @param {string} invalidField - Field to make invalid
     * @returns {Object} Invalid user data
     */
    static generateInvalidUserData(invalidField = 'email') {
        const validData = this.generateUserData();

        switch (invalidField) {
            case 'email':
                validData.email = 'invalid-email';
                break;
            case 'name':
                validData.name = '';
                break;
            case 'phone':
                validData.phone = '123';
                break;
            default:
                delete validData[invalidField];
        }

        return validData;
    }

    /**
     * Make multiple requests in parallel (for rate limiting tests)
     * @param {Function} requestFn - Function that makes the request
     * @param {number} count - Number of requests to make
     * @returns {Array} Array of response promises
     */
    static async makeParallelRequests(requestFn, count) {
        const requests = [];
        for (let i = 0; i < count; i++) {
            requests.push(requestFn());
        }
        return Promise.allSettled(requests);
    }

    /**
     * Extract rate limit headers from response
     * @param {Object} response - HTTP response
     * @returns {Object} Rate limit info
     */
    static extractRateLimitInfo(response) {
        return {
            limit: response.headers()['x-ratelimit-limit'],
            remaining: response.headers()['x-ratelimit-remaining'],
            reset: response.headers()['x-ratelimit-reset']
        };
    }
}

module.exports = TestUtils; 