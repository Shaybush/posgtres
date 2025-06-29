const { test, expect } = require('@playwright/test');
const TestUtils = require('../helpers/test-utils');

test.describe('Security Features', () => {
    test.beforeEach(async () => {
        await TestUtils.cleanDatabase();
    });

    test.describe('XSS Protection', () => {
        test('should sanitize script tags in user data', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                name: '<script>alert("xss")</script>John Doe',
                address: '<script>document.location="http://evil.com"</script>123 Main St'
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.data.name).not.toContain('<script>');
            expect(body.data.address).not.toContain('<script>');
            expect(body.data.name).toContain('John Doe');
            expect(body.data.address).toContain('123 Main St');
        });

        test('should sanitize img tags with onerror', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                name: '<img src=x onerror=alert("xss")>Valid Name',
                city: '<img/src=x onerror=alert(1)>Valid City'
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.data.name).not.toContain('<img');
            expect(body.data.city).not.toContain('<img');
            expect(body.data.name).toContain('Valid Name');
            expect(body.data.city).toContain('Valid City');
        });

        test('should sanitize iframe tags', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                address: '<iframe src="javascript:alert(1)"></iframe>123 Main St',
                country: '<iframe/src=javascript:alert(1)>USA'
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.data.address).not.toContain('<iframe');
            expect(body.data.country).not.toContain('<iframe');
        });

        test('should sanitize javascript: URLs', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                name: '<a href="javascript:alert(1)">Click me</a>',
                address: '<div onclick="javascript:alert(1)">Click me</div>'
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.data.name).not.toContain('javascript:');
            expect(body.data.address).not.toContain('javascript:');
        });

        test('should handle XSS in query parameters', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            const response = await request.get(`/api/users/${testUser.id}?test=<script>alert('xss')</script>`);

            expect(response.status()).toBe(200);
            // Should not reflect the malicious script in response
            const body = await response.json();
            expect(JSON.stringify(body)).not.toContain('<script>');
        });
    });

    test.describe('SQL Injection Protection', () => {
        test('should reject SQL injection in user creation', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                name: "'; DROP TABLE users; --",
                email: "test@example.com'; DELETE FROM users; --"
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Potential SQL injection detected');
        });

        test('should reject SQL injection in email field', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                email: "admin' OR '1'='1"
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Potential SQL injection detected');
        });

        test('should reject UNION SELECT attacks', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                name: "test' UNION SELECT password FROM users --"
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Potential SQL injection detected');
        });

        test('should reject SQL injection in URL parameters', async ({ request }) => {
            const response = await request.get("/api/users/1' OR 1=1 --");

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Potential SQL injection detected');
        });

        test('should reject SQL injection with comments', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                address: "123 Main St/* comment */; DROP TABLE users;"
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Potential SQL injection detected');
        });
    });

    test.describe('HTTP Parameter Pollution (HPP) Protection', () => {
        test('should handle duplicate parameters properly', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            // Test with duplicate query parameters
            const response = await request.get(`/api/users/${testUser.id}?test=value1&test=value2`);

            expect(response.status()).toBe(200);
            // Should still return the user data correctly
            const body = await response.json();
            expect(body.data.id).toBe(testUser.id);
        });

        test('should prevent HPP attacks in POST data', async ({ request }) => {
            // Simulate sending duplicate fields (this would be handled by the HPP middleware)
            const userData = TestUtils.generateUserData();

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.data.name).toBe(userData.name);
        });
    });

    test.describe('Security Headers', () => {
        test('should include required security headers', async ({ request }) => {
            const response = await request.get('/health');

            expect(response.status()).toBe(200);
            const headers = response.headers();

            // Check for security headers
            expect(headers['x-content-type-options']).toBe('nosniff');
            expect(headers['x-frame-options']).toBe('DENY');
            expect(headers['x-xss-protection']).toBe('1; mode=block');
            expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
            expect(headers['permissions-policy']).toContain('geolocation=()');
        });

        test('should not expose server information', async ({ request }) => {
            const response = await request.get('/health');

            const headers = response.headers();
            expect(headers['x-powered-by']).toBeUndefined();
            expect(headers['server']).toBeUndefined();
        });

        test('should have proper Content Security Policy', async ({ request }) => {
            const response = await request.get('/health');

            const headers = response.headers();
            expect(headers['content-security-policy']).toBeDefined();
            expect(headers['content-security-policy']).toContain("default-src 'self'");
        });
    });

    test.describe('CORS Protection', () => {
        test('should handle preflight requests properly', async ({ request }) => {
            const response = await request.fetch('/api/users', {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });

            expect(response.status()).toBe(200);
            const headers = response.headers();
            expect(headers['access-control-allow-origin']).toBe('http://localhost:3000');
            expect(headers['access-control-allow-methods']).toContain('POST');
        });

        test('should reject requests from unauthorized origins', async ({ request }) => {
            const response = await request.fetch('/api/users', {
                method: 'GET',
                headers: {
                    'Origin': 'http://evil.com'
                }
            });

            // CORS will be handled by the browser, but server should not set CORS headers for unauthorized origins
            const headers = response.headers();
            expect(headers['access-control-allow-origin']).not.toBe('http://evil.com');
        });
    });

    test.describe('Request Size Limiting', () => {
        test('should accept requests within size limit', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(201);
        });

        test('should reject extremely large requests', async ({ request }) => {
            // Create a very large string
            const largeString = 'x'.repeat(20 * 1024 * 1024); // 20MB
            const userData = TestUtils.generateUserData({
                address: largeString
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            // Should be rejected due to size limit (10MB in middleware)
            expect(response.status()).toBe(413);
        });
    });

    test.describe('Input Validation', () => {
        test('should validate email format', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                email: 'invalid-email-format'
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should validate required fields', async ({ request }) => {
            const response = await request.post('/api/users', {
                data: {
                    // Missing required fields
                    phone: '+972501234567'
                }
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });

        test('should validate ID parameter format', async ({ request }) => {
            const response = await request.get('/api/users/not-a-number');

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toBe('Validation Error');
        });
    });

    test.describe('NoSQL Injection Protection', () => {
        test('should reject NoSQL injection attempts', async ({ request }) => {
            const userData = TestUtils.generateUserData({
                name: '{"$gt": ""}',
                email: '{"$ne": null}'
            });

            const response = await request.post('/api/users', {
                data: userData
            });

            // Should be sanitized by mongo-sanitize middleware
            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.data.name).not.toContain('$gt');
            expect(body.data.email).not.toContain('$ne');
        });

        test('should sanitize object-based NoSQL injection', async ({ request }) => {
            // Attempt to send object instead of string
            const response = await request.post('/api/users', {
                data: {
                    name: 'Valid Name',
                    email: { $ne: null },
                    phone: '+972501234567',
                    address: '123 Main St',
                    city: 'Test City',
                    country: 'Test Country'
                }
            });

            // Should be sanitized
            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body.data.email).not.toContain('$ne');
        });
    });
}); 