const { test, expect } = require('@playwright/test');

test.describe('Health Endpoint', () => {
    test('should return health status', async ({ request }) => {
        const response = await request.get('/health');

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('status', 'OK');
        expect(body).toHaveProperty('timestamp');
        expect(body).toHaveProperty('uptime');
        expect(typeof body.uptime).toBe('number');
        expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should have correct response headers', async ({ request }) => {
        const response = await request.get('/health');

        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');

        // Check security headers
        expect(response.headers()['x-content-type-options']).toBe('nosniff');
        expect(response.headers()['x-frame-options']).toBe('DENY');
        expect(response.headers()['x-xss-protection']).toBe('1; mode=block');
    });

    test('should respond quickly', async ({ request }) => {
        const startTime = Date.now();
        const response = await request.get('/health');
        const endTime = Date.now();

        expect(response.status()).toBe(200);
        expect(endTime - startTime).toBeLessThan(1000); // Should respond within 1 second
    });
}); 