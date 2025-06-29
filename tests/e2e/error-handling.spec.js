const { test, expect } = require('@playwright/test');
const TestUtils = require('../helpers/test-utils');

test.describe('Error Handling', () => {
    test.beforeEach(async () => {
        await TestUtils.cleanDatabase();
    });

    test.describe('404 Not Found Errors', () => {
        test('should return 404 for non-existent routes', async ({ request }) => {
            const response = await request.get('/api/non-existent-endpoint');

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBe('Not Found');
            expect(body.message).toContain('Cannot GET /api/non-existent-endpoint');
        });

        test('should return 404 for non-existent user ID', async ({ request }) => {
            const response = await request.get('/api/users/999999');

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBe('User not found');
            expect(body.message).toContain('No user found with ID: 999999');
        });

        test('should return 404 for deleted user', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            // Delete the user
            await request.delete(`/api/users/${testUser.id}`);

            // Try to access deleted user
            const response = await request.get(`/api/users/${testUser.id}`);

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBe('User not found');
        });

        test('should handle 404 for update non-existent user', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            const response = await request.put('/api/users/999999', {
                data: userData
            });

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBe('User not found');
        });

        test('should handle 404 for patch non-existent user', async ({ request }) => {
            const response = await request.patch('/api/users/999999', {
                data: { name: 'New Name' }
            });

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBe('User not found');
        });

        test('should handle 404 for delete non-existent user', async ({ request }) => {
            const response = await request.delete('/api/users/999999');

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBe('User not found');
        });
    });

    test.describe('400 Bad Request Errors', () => {
        test('should return 400 for invalid JSON', async ({ request }) => {
            const response = await request.post('/api/users', {
                data: 'invalid-json-string',
                headers: {
                    'content-type': 'application/json'
                }
            });

            expect(response.status()).toBe(400);
        });

        test('should return 400 for invalid ID parameter', async ({ request }) => {
            const response = await request.get('/api/users/invalid-id');

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should return 400 for negative ID', async ({ request }) => {
            const response = await request.get('/api/users/-1');

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should return 400 for missing required fields', async ({ request }) => {
            const response = await request.post('/api/users', {
                data: {
                    phone: '+972501234567'
                    // Missing name and email
                }
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should return 400 for invalid email format', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                email: 'invalid-email'
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should return 400 for empty required fields', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                name: '',
                email: ''
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should return 400 for invalid phone format', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                phone: '123' // Too short
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should return 400 for empty patch request', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            const response = await request.patch(`/api/users/${testUser.id}`, {
                data: {}
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('No valid fields to update');
        });
    });

    test.describe('409 Conflict Errors', () => {
        test('should return 409 for duplicate email on create', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            // Create first user
            await request.post('/api/users', { data: userData });

            // Try to create second user with same email
            const response = await request.post('/api/users', { data: userData });

            expect(response.status()).toBe(409);
            const body = await response.json();
            expect(body.error).toBe('Email already exists');
            expect(body.message).toContain('A user with this email address already exists');
        });

        test('should return 409 for duplicate email on update', async ({ request }) => {
            const user1 = await TestUtils.createTestUser();
            const user2 = await TestUtils.createTestUser();

            // Try to update user1 with user2's email
            const response = await request.put(`/api/users/${user1.id}`, {
                data: { ...TestUtils.generateUserData(), email: user2.email }
            });

            expect(response.status()).toBe(409);
            const body = await response.json();
            expect(body.error).toBe('Email already exists');
            expect(body.message).toContain('Another user with this email address already exists');
        });

        test('should return 409 for duplicate email on patch', async ({ request }) => {
            const user1 = await TestUtils.createTestUser();
            const user2 = await TestUtils.createTestUser();

            // Try to patch user1 with user2's email
            const response = await request.patch(`/api/users/${user1.id}`, {
                data: { email: user2.email }
            });

            expect(response.status()).toBe(409);
            const body = await response.json();
            expect(body.error).toBe('Email already exists');
        });
    });

    test.describe('429 Too Many Requests', () => {
        test('should return 429 when rate limit exceeded', async ({ request }) => {
            // Exhaust the strict rate limit for POST requests
            for (let i = 0; i < 5; i++) {
                await request.post('/api/users', {
                    data: TestUtils.generateUserData()
                });
                await TestUtils.wait(50);
            }

            // Next request should be rate limited
            const response = await request.post('/api/users', {
                data: TestUtils.generateUserData()
            });

            expect(response.status()).toBe(429);
            const body = await response.json();
            expect(body.error).toBe('Too Many Requests');
            expect(body.message).toContain('Rate limit exceeded');
        });

        test('should include rate limit information in 429 response', async ({ request }) => {
            // Exhaust rate limit
            for (let i = 0; i < 5; i++) {
                await request.post('/api/users', {
                    data: TestUtils.generateUserData()
                });
                await TestUtils.wait(50);
            }

            const response = await request.post('/api/users', {
                data: TestUtils.generateUserData()
            });

            expect(response.status()).toBe(429);
            const headers = response.headers();
            expect(headers['x-ratelimit-limit']).toBe('5');
            expect(headers['x-ratelimit-remaining']).toBe('0');
            expect(headers['x-ratelimit-reset']).toBeDefined();
        });
    });

    test.describe('500 Internal Server Error', () => {
        test('should handle database connection errors gracefully', async ({ request }) => {
            // This test would require temporarily breaking the database connection
            // For now, we'll test that errors are handled properly in general

            // Test with malformed data that might cause server errors
            const response = await request.post('/api/users', {
                data: null
            });

            // Should not return 500, should be handled gracefully
            expect(response.status()).not.toBe(500);
        });

        test('should not expose sensitive information in error responses', async ({ request }) => {
            // Try to trigger an error
            const response = await request.post('/api/users', {
                data: { invalid: 'data' }
            });

            const body = await response.json();

            // Should not expose stack traces or sensitive info
            expect(body).not.toHaveProperty('stack');
            expect(JSON.stringify(body)).not.toContain('password');
            expect(JSON.stringify(body)).not.toContain('database');
            expect(JSON.stringify(body)).not.toContain('connection');
        });
    });

    test.describe('Error Response Format', () => {
        test('should return consistent error format for 404', async ({ request }) => {
            const response = await request.get('/api/users/999999');

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body).toHaveProperty('error');
            expect(body).toHaveProperty('message');
            expect(typeof body.error).toBe('string');
            expect(typeof body.message).toBe('string');
        });

        test('should return consistent error format for 400', async ({ request }) => {
            const response = await request.get('/api/users/invalid');

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body).toHaveProperty('error');
            expect(body.error).toBe('Validation Error');
        });

        test('should return consistent error format for 409', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            await request.post('/api/users', { data: userData });
            const response = await request.post('/api/users', { data: userData });

            expect(response.status()).toBe(409);
            const body = await response.json();
            expect(body).toHaveProperty('error');
            expect(body).toHaveProperty('message');
            expect(body.error).toBe('Email already exists');
        });

        test('should return consistent error format for 429', async ({ request }) => {
            // Exhaust rate limit
            for (let i = 0; i < 5; i++) {
                await request.post('/api/users', {
                    data: TestUtils.generateUserData()
                });
                await TestUtils.wait(50);
            }

            const response = await request.post('/api/users', {
                data: TestUtils.generateUserData()
            });

            expect(response.status()).toBe(429);
            const body = await response.json();
            expect(body).toHaveProperty('error');
            expect(body).toHaveProperty('message');
            expect(body.error).toBe('Too Many Requests');
        });
    });

    test.describe('HTTP Method Errors', () => {
        test('should return 404 for unsupported HTTP methods', async ({ request }) => {
            const response = await request.fetch('/api/users', {
                method: 'HEAD'
            });

            expect(response.status()).toBe(404);
        });

        test('should handle OPTIONS requests for CORS', async ({ request }) => {
            const response = await request.fetch('/api/users', {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://localhost:3000'
                }
            });

            expect(response.status()).toBe(200);
        });
    });
}); 