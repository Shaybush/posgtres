const { execSync } = require('child_process');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function globalSetup() {
    console.log('🚀 Starting E2E Test Setup...');

    try {
        // Set test environment
        process.env.NODE_ENV = 'test';
        process.env.PORT = '8080';
        process.env.DB_HOST = 'localhost';
        process.env.DB_PORT = '5433';
        process.env.DB_NAME = 'test_express_db';
        process.env.DB_USER = 'test_user';
        process.env.DB_PASSWORD = 'test_password';
        process.env.CORS_ORIGIN = 'http://localhost:3000';

        // Create test-results directory
        const testResultsDir = path.join(process.cwd(), 'test-results');
        if (!fs.existsSync(testResultsDir)) {
            fs.mkdirSync(testResultsDir, { recursive: true });
        }

        console.log('📊 Starting test database...');

        // Stop any existing test containers
        try {
            execSync('docker-compose -f docker-compose.test.yml down -v', {
                stdio: 'pipe',
                timeout: 30000
            });
        } catch (error) {
            // Ignore errors if containers don't exist
        }

        // Start PostgreSQL test container
        execSync('docker-compose -f docker-compose.test.yml up -d', {
            stdio: 'inherit',
            timeout: 60000
        });

        // Wait for database to be ready
        console.log('⏳ Waiting for database to be ready...');
        await waitForDatabase();

        // Start the Express server
        console.log('🖥️ Starting Express server on port 8080...');
        const serverProcess = spawn('node', ['app.js'], {
            env: { ...process.env },
            stdio: 'pipe'
        });

        // Store the server process PID for cleanup
        fs.writeFileSync(path.join(testResultsDir, 'server.pid'), serverProcess.pid.toString());

        // Wait for server to start
        await waitForServer();

        console.log('✅ E2E Test Setup Complete!');

    } catch (error) {
        console.error('❌ E2E Test Setup Failed:', error);
        throw error;
    }
}

async function waitForDatabase() {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            execSync('docker exec postgres-test pg_isready -U test_user -d test_express_db', {
                stdio: 'pipe',
                timeout: 5000
            });
            console.log('✅ Database is ready!');
            return;
        } catch (error) {
            attempts++;
            console.log(`⏳ Database not ready, attempt ${attempts}/${maxAttempts}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    throw new Error('Database failed to start within timeout period');
}

async function waitForServer() {
    const maxAttempts = 15;
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch('http://localhost:8080/health');
            if (response.ok) {
                console.log('✅ Server is ready!');
                return;
            }
        } catch (error) {
            // Server not ready yet
        }

        attempts++;
        console.log(`⏳ Server not ready, attempt ${attempts}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Server failed to start within timeout period');
}

module.exports = globalSetup; 