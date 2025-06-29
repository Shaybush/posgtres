const { test, expect } = require('@playwright/test');
const TestUtils = require('../helpers/test-utils');

test.describe('Users API', () => {
    // Clean database before each test
    test.beforeEach(async () => {
        await TestUtils.cleanDatabase();
    });

    test.describe('GET /api/users', () => {
        test('should return empty array when no users exist', async ({ request }) => {
            const response = await request.get('/api/users');

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.count).toBe(0);
            expect(body.data).toEqual([]);
        });

        test('should return all users when users exist', async ({ request }) => {
            // Create test users
            const testUsers = await TestUtils.createTestUsers(3);

            const response = await request.get('/api/users');

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.count).toBe(3);
            expect(body.data).toHaveLength(3);
            expect(body.data[0]).toHaveProperty('id');
            expect(body.data[0]).toHaveProperty('name');
            expect(body.data[0]).toHaveProperty('email');
        });

        test('should return users in ascending order by id', async ({ request }) => {
            await TestUtils.createTestUsers(5);

            const response = await request.get('/api/users');
            const body = await response.json();

            expect(response.status()).toBe(200);
            const ids = body.data.map(user => user.id);
            const sortedIds = [...ids].sort((a, b) => a - b);
            expect(ids).toEqual(sortedIds);
        });
    });

    test.describe('GET /api/users/:id', () => {
        test('should return user by valid id', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            const response = await request.get(`/api/users/${testUser.id}`);

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(testUser.id);
            expect(body.data.email).toBe(testUser.email);
        });

        test('should return 404 for non-existent user', async ({ request }) => {
            const response = await request.get('/api/users/999');

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBe('User not found');
            expect(body.message).toContain('No user found with ID: 999');
        });

        test('should return 400 for invalid id format', async ({ request }) => {
            const response = await request.get('/api/users/invalid');

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });
    });

    test.describe('POST /api/users', () => {
        test('should create new user with valid data', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.message).toBe('User created successfully');
            expect(body.data.name).toBe(userData.name);
            expect(body.data.email).toBe(userData.email);
            expect(body.data).toHaveProperty('id');
            expect(body.data).toHaveProperty('created_at');
        });

        test('should reject duplicate email', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            // Create first user
            await request.post('/api/users', { data: userData });

            // Try to create second user with same email
            const response = await request.post('/api/users', { data: userData });

            expect(response.status()).toBe(409);
            const body = await response.json();
            expect(body.error).toBe('Email already exists');
        });

        test('should reject invalid email format', async ({ request }) => {
            const userData = TestUtils.generateInvalidUserData('email');

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should reject missing required fields', async ({ request }) => {
            const response = await request.post('/api/users', {
                data: { phone: '+972501234567' } // Missing required fields
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should sanitize XSS attempts', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                name: '<script>alert("xss")</script>John Doe',
                address: '<img src=x onerror=alert("xss")>123 Main St'
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.data.name).not.toContain('<script>');
            expect(body.data.address).not.toContain('<img');
        });
    });

    test.describe('PUT /api/users/:id', () => {
        test('should update existing user', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();
            const updateData = TestUtils.generateUserData();

            const response = await request.put(`/api/users/${testUser.id}`, {
                data: updateData
            });

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.message).toBe('User updated successfully');
            expect(body.data.name).toBe(updateData.name);
            expect(body.data.email).toBe(updateData.email);
            expect(body.data.id).toBe(testUser.id);
        });

        test('should return 404 for non-existent user', async ({ request }) => {
            const updateData = TestUtils.generateUserData();

            const response = await request.put('/api/users/999', {
                data: updateData
            });

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBe('User not found');
        });

        test('should reject email conflict with another user', async ({ request }) => {
            const user1 = await TestUtils.createTestUser();
            const user2 = await TestUtils.createTestUser();

            const response = await request.put(`/api/users/${user1.id}`, {
                data: { ...TestUtils.generateUserData(), email: user2.email }
            });

            expect(response.status()).toBe(409);
            const body = await response.json();
            expect(body.error).toBe('Email already exists');
        });
    });

    test.describe('PATCH /api/users/:id', () => {
        test('should partially update user', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();
            const newName = 'Updated Name';

            const response = await request.patch(`/api/users/${testUser.id}`, {
                data: { name: newName }
            });

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data.name).toBe(newName);
            expect(body.data.email).toBe(testUser.email); // Should remain unchanged
        });

        test('should reject empty update', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            const response = await request.patch(`/api/users/${testUser.id}`, {
                data: {}
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('No valid fields to update');
        });

        test('should ignore invalid fields', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            const response = await request.patch(`/api/users/${testUser.id}`, {
                data: {
                    name: 'Valid Name',
                    invalidField: 'should be ignored',
                    id: 999 // Should be ignored
                }
            });

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.data.name).toBe('Valid Name');
            expect(body.data.id).toBe(testUser.id); // Should not change
        });
    });

    test.describe('DELETE /api/users/:id', () => {
        test('should delete existing user', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            const response = await request.delete(`/api/users/${testUser.id}`);

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.message).toBe('User deleted successfully');

            // Verify user is deleted
            const getResponse = await request.get(`/api/users/${testUser.id}`);
            expect(getResponse.status()).toBe(404);
        });

        test('should return 404 for non-existent user', async ({ request }) => {
            const response = await request.delete('/api/users/999');

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toBe('User not found');
        });

        test('should return 400 for invalid id format', async ({ request }) => {
            const response = await request.delete('/api/users/invalid');

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });
    });
}); 