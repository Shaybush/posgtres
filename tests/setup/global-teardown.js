const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function globalTeardown() {
    console.log('🧹 Starting E2E Test Teardown...');

    try {
        const testResultsDir = path.join(process.cwd(), 'test-results');
        const pidFile = path.join(testResultsDir, 'server.pid');

        // Stop the Express server
        if (fs.existsSync(pidFile)) {
            const pid = fs.readFileSync(pidFile, 'utf8').trim();
            console.log('🛑 Stopping Express server...');

            try {
                if (process.platform === 'win32') {
                    execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
                } else {
                    execSync(`kill -TERM ${pid}`, { stdio: 'pipe' });
                }
            } catch (error) {
                console.log('Server process may have already stopped');
            }

            // Clean up PID file
            fs.unlinkSync(pidFile);
        }

        // Stop PostgreSQL test container
        console.log('🗄️ Stopping test database...');
        try {
            execSync('docker-compose -f docker-compose.test.yml down -v', {
                stdio: 'pipe',
                timeout: 30000
            });
        } catch (error) {
            console.log('Test database containers may have already stopped');
        }

        console.log('✅ E2E Test Teardown Complete!');

    } catch (error) {
        console.error('❌ E2E Test Teardown Failed:', error);
        // Don't throw error to avoid masking test results
    }
}

module.exports = globalTeardown; 