// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
    testDir: './tests/e2e',
    /* Run tests in files in parallel */
    fullyParallel: false, // Set to false to avoid database conflicts
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : 1, // Single worker to avoid database conflicts
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['html', { outputFolder: 'test-results/html-report' }],
        ['json', { outputFile: 'test-results/test-results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list'],
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:8080',
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        /* Take screenshot on failure */
        screenshot: 'only-on-failure',
        /* Record video on failure */
        video: 'retain-on-failure',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
    ],

    /* Global setup and teardown */
    globalSetup: require.resolve('./tests/setup/global-setup.js'),
    globalTeardown: require.resolve('./tests/setup/global-teardown.js'),

    /* Output directory for test artifacts */
    outputDir: 'test-results/artifacts',
}); 