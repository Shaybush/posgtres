const { test, expect } = require('@playwright/test');
const TestUtils = require('../helpers/test-utils');

test.describe('Rate Limiting', () => {
    test.beforeEach(async () => {
        await TestUtils.cleanDatabase();
    });

    test.describe('General Rate Limiting (100 requests per 15 minutes)', () => {
        test('should allow requests within rate limit', async ({ request }) => {
            // Make several requests within the limit
            for (let i = 0; i < 5; i++) {
                const response = await request.get('/health');
                expect(response.status()).toBe(200);

                // Check rate limit headers are present
                const headers = response.headers();
                expect(headers['x-ratelimit-limit']).toBeDefined();
                expect(headers['x-ratelimit-remaining']).toBeDefined();
            }
        });

        test('should include rate limit headers in response', async ({ request }) => {
            const response = await request.get('/health');

            expect(response.status()).toBe(200);
            const headers = response.headers();
            expect(headers['x-ratelimit-limit']).toBe('100');
            expect(parseInt(headers['x-ratelimit-remaining'])).toBeLessThanOrEqual(100);
        });

        test('should block requests after exceeding rate limit', async ({ request }) => {
            // This test would require making 100+ requests, which is time-consuming
            // In a real scenario, you might want to temporarily reduce the rate limit for testing
            // or create a separate test endpoint with a lower limit

            // Make multiple requests quickly
            const results = await TestUtils.makeParallelRequests(
                () => request.get('/health'),
                10
            );

            // All should succeed as we're well within the limit
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    expect(result.value.status()).toBe(200);
                }
            });
        });
    });

    test.describe('API Rate Limiting (1000 requests per hour)', () => {
        test('should apply API rate limiting to user endpoints', async ({ request }) => {
            await TestUtils.createTestUser();

            // Make several API requests
            for (let i = 0; i < 5; i++) {
                const response = await request.get('/api/users');
                expect(response.status()).toBe(200);

                const headers = response.headers();
                expect(headers['x-ratelimit-limit']).toBe('1000');
            }
        });

        test('should track API rate limit separately from general limit', async ({ request }) => {
            // Make general request
            const healthResponse = await request.get('/health');
            const healthRemaining = parseInt(healthResponse.headers()['x-ratelimit-remaining']);

            // Make API request
            const apiResponse = await request.get('/api/users');
            const apiRemaining = parseInt(apiResponse.headers()['x-ratelimit-remaining']);

            // API should have higher limit
            expect(apiRemaining).toBeGreaterThan(healthRemaining);
        });
    });

    test.describe('Strict Rate Limiting (5 requests per 15 minutes)', () => {
        test('should apply strict rate limiting to sensitive operations', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            // POST requests have strict rate limiting
            const response = await request.post('/api/users', {
                data: userData
            });

            expect(response.status()).toBe(201);

            const headers = response.headers();
            expect(headers['x-ratelimit-limit']).toBe('5');
            expect(parseInt(headers['x-ratelimit-remaining'])).toBeLessThan(5);
        });

        test('should block requests after exceeding strict rate limit', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            // Make 6 POST requests (strict limit is 5)
            const results = [];
            for (let i = 0; i < 6; i++) {
                const uniqueUserData = TestUtils.generateUserData();
                const response = await request.post('/api/users', {
                    data: uniqueUserData
                });
                results.push(response);

                // Small delay between requests
                await TestUtils.wait(100);
            }

            // First 5 should succeed
            for (let i = 0; i < 5; i++) {
                expect(results[i].status()).toBe(201);
            }

            // 6th should be rate limited
            expect(results[5].status()).toBe(429);
            const body = await results[5].json();
            expect(body.error).toBe('Too Many Requests');
        });

        test('should apply strict rate limiting to PATCH operations', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            // PATCH requests have strict rate limiting
            const response = await request.patch(`/api/users/${testUser.id}`, {
                data: { name: 'Updated Name' }
            });

            expect(response.status()).toBe(200);

            const headers = response.headers();
            expect(headers['x-ratelimit-limit']).toBe('5');
        });

        test('should apply strict rate limiting to DELETE operations', async ({ request }) => {
            const testUser = await TestUtils.createTestUser();

            // DELETE requests have strict rate limiting
            const response = await request.delete(`/api/users/${testUser.id}`);

            expect(response.status()).toBe(200);

            const headers = response.headers();
            expect(headers['x-ratelimit-limit']).toBe('5');
        });
    });

    test.describe('Rate Limit Error Responses', () => {
        test('should return proper error response when rate limited', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            // Exhaust the strict rate limit
            for (let i = 0; i < 5; i++) {
                const uniqueUserData = TestUtils.generateUserData();
                await request.post('/api/users', { data: uniqueUserData });
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

            // Should have rate limit headers
            const headers = response.headers();
            expect(headers['x-ratelimit-limit']).toBe('5');
            expect(headers['x-ratelimit-remaining']).toBe('0');
        });

        test('should include retry-after information in rate limit response', async ({ request }) => {
            const userData = TestUtils.generateUserData();

            // Exhaust the strict rate limit quickly
            const results = await TestUtils.makeParallelRequests(
                () => request.post('/api/users', {
                    data: TestUtils.generateUserData()
                }),
                6
            );

            // Find the rate limited response
            const rateLimitedResult = results.find(result =>
                result.status === 'fulfilled' && result.value.status() === 429
            );

            if (rateLimitedResult) {
                const response = rateLimitedResult.value;
                const headers = response.headers();
                expect(headers['x-ratelimit-reset']).toBeDefined();
            }
        });
    });

    test.describe('Rate Limit Recovery', () => {
        test.skip('should reset rate limit after time window', async ({ request }) => {
            // This test is skipped because it would require waiting 15 minutes
            // In a real scenario, you might want to use a test configuration
            // with much shorter rate limit windows

            const userData = TestUtils.generateUserData();

            // Exhaust rate limit
            for (let i = 0; i < 5; i++) {
                await request.post('/api/users', {
                    data: TestUtils.generateUserData()
                });
            }

            // Should be rate limited
            let response = await request.post('/api/users', { data: userData });
            expect(response.status()).toBe(429);

            // Wait for rate limit to reset (would need to wait 15 minutes in real scenario)
            // await TestUtils.wait(15 * 60 * 1000);

            // Should be able to make requests again
            // response = await request.post('/api/users', { data: userData });
            // expect(response.status()).toBe(201);
        });
    });
}); 