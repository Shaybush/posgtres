# 🧪 End-to-End Testing with Playwright

This project includes comprehensive end-to-end (E2E) testing using Playwright, covering API functionality, security features, rate limiting, and error handling.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)

## 🎯 Overview

Our E2E test suite includes:

- **🏥 Health Endpoint Tests**: Server health and response time validation
- **👥 User CRUD Operations**: Complete user lifecycle testing
- **🔒 Security Tests**: XSS protection, SQL injection prevention, security headers
- **⚡ Rate Limiting**: Testing rate limit enforcement and recovery
- **❌ Error Handling**: Comprehensive error scenario coverage
- **🗄️ Database Integration**: Real PostgreSQL database testing

## 📦 Prerequisites

Before running E2E tests, ensure you have:

- **Node.js** 18.x or higher
- **Docker** and **Docker Compose**
- **PostgreSQL** client tools (optional, for manual database operations)

## 🚀 Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Install Playwright browsers:**

   ```bash
   npx playwright install
   ```

3. **Verify Docker is running:**
   ```bash
   docker --version
   docker-compose --version
   ```

## ⚙️ Environment Setup

### Required Environment Variables

Create a `.env.test` file (or use the provided one):

```bash
# Test Environment Configuration
NODE_ENV=test
PORT=8080

# Test Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_NAME=test_express_db
DB_USER=test_user
DB_PASSWORD=test_password

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### Test Database Setup

The test suite uses a separate PostgreSQL database in Docker:

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Verify database is running
docker-compose -f docker-compose.test.yml ps
```

## 🏃‍♂️ Running Tests

### Quick Start

```bash
# Run all E2E tests (recommended)
pnpm run test:e2e
```

### Advanced Options

```bash
# Run tests in headed mode (with browser UI)
pnpm run test:e2e:headed

# Run tests with Playwright UI
pnpm run test:e2e:ui

# Run specific test file
pnpx playwright test tests/e2e/users.spec.js

# Run tests with specific tag
pnpx playwright test --grep "@smoke"

# Run tests in specific browser
pnpx playwright test --project=chromium

# Debug mode
pnpx playwright test --debug
```

### Test Reports

```bash
# View HTML report
pnpm run test:e2e:report

# Reports are generated in: test-results/html-report/
```

## 📁 Test Structure

```
tests/
├── e2e/                          # E2E test files
│   ├── health.spec.js           # Health endpoint tests
│   ├── users.spec.js            # User CRUD operations
│   ├── rate-limiting.spec.js    # Rate limiting tests
│   ├── security.spec.js         # Security feature tests
│   └── error-handling.spec.js   # Error scenario tests
├── helpers/
│   └── test-utils.js            # Test utilities and helpers
└── setup/
    ├── global-setup.js          # Global test setup
    ├── global-teardown.js       # Global test teardown
    └── test-setup.js            # Individual test setup
```

### Test Categories

#### 🏥 Health Tests (`health.spec.js`)

- Server health status
- Response time validation
- Security headers verification

#### 👥 User CRUD Tests (`users.spec.js`)

- Create, read, update, delete operations
- Data validation
- Business logic verification
- XSS sanitization

#### 🔒 Security Tests (`security.spec.js`)

- XSS protection validation
- SQL injection prevention
- Security headers verification
- CORS policy testing
- Input sanitization

#### ⚡ Rate Limiting Tests (`rate-limiting.spec.js`)

- General rate limits (100 req/15min)
- API rate limits (1000 req/hour)
- Strict rate limits (5 req/15min)
- Rate limit recovery
- Error responses

#### ❌ Error Handling Tests (`error-handling.spec.js`)

- 404 Not Found scenarios
- 400 Bad Request validation
- 409 Conflict handling
- 429 Rate limit errors
- 500 Internal server errors

## 🤖 CI/CD Integration

### GitHub Actions

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/e2e-tests.yml`) that:

- **Matrix Testing**: Tests against multiple Node.js versions (18.x, 20.x)
- **Database Setup**: Uses PostgreSQL service container
- **Parallel Execution**: Runs tests in parallel for efficiency
- **Artifact Collection**: Saves test reports and screenshots
- **PR Comments**: Automatically comments on PRs with test results
- **Security Audit**: Runs npm audit for security vulnerabilities

### Workflow Triggers

- Push to `main`, `develop`, or `secure-routes` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### Environment Variables in CI

```yaml
NODE_ENV: test
PORT: 8080
DB_HOST: localhost
DB_PORT: 5433
DB_NAME: test_express_db
DB_USER: test_user
DB_PASSWORD: test_password
CORS_ORIGIN: http://localhost:3000
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues

**Problem**: Tests fail with database connection errors

**Solutions**:

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres-test

# Restart test database
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d

# Check database logs
docker-compose -f docker-compose.test.yml logs postgres-test
```

#### 2. Port Conflicts

**Problem**: `EADDRINUSE: address already in use :::8080`

**Solutions**:

```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>

# Or use a different port in .env.test
PORT=8081
```

#### 3. Rate Limiting Test Failures

**Problem**: Rate limiting tests fail intermittently

**Solutions**:

- Rate limits are shared across tests
- Clean state between tests with database cleanup
- Consider using test-specific rate limit configurations

#### 4. Playwright Browser Issues

**Problem**: Browser installation or execution issues

**Solutions**:

```bash
# Reinstall Playwright browsers
npx playwright install --force

# Install system dependencies
npx playwright install-deps

# Check Playwright version
npx playwright --version
```

#### 5. Test Timeout Issues

**Problem**: Tests timeout waiting for server/database

**Solutions**:

```bash
# Increase timeout in playwright.config.js
timeout: 60000  // 60 seconds

# Check if services are actually running
curl http://localhost:8080/health
```

### Debug Mode

```bash
# Run single test in debug mode
npx playwright test tests/e2e/users.spec.js --debug

# Run with verbose logging
DEBUG=pw:api npx playwright test

# Generate trace files
npx playwright test --trace on
```

### Logs and Artifacts

Test artifacts are saved in `test-results/`:

- `html-report/` - Interactive HTML report
- `artifacts/` - Screenshots and videos
- `test-results.json` - Raw test results
- `junit.xml` - JUnit format results

## ✍️ Writing New Tests

### Basic Test Structure

```javascript
const { test, expect } = require("@playwright/test");
const TestUtils = require("../helpers/test-utils");

test.describe("Feature Name", () => {
  test.beforeEach(async () => {
    await TestUtils.cleanDatabase();
  });

  test("should do something", async ({ request }) => {
    // Arrange
    const testData = TestUtils.generateUserData();

    // Act
    const response = await request.post("/api/users", {
      data: testData,
    });

    // Assert
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
```

### Test Utilities

Use the provided `TestUtils` class for common operations:

```javascript
// Database operations
await TestUtils.cleanDatabase();
const users = await TestUtils.createTestUsers(5);
const user = await TestUtils.createTestUser({ email: "test@example.com" });

// Data generation
const userData = TestUtils.generateUserData();
const invalidData = TestUtils.generateInvalidUserData("email");

// Test helpers
await TestUtils.wait(1000);
const results = await TestUtils.makeParallelRequests(
  () => request.get("/api/users"),
  10
);
```

### Test Tags

Use test tags for categorization:

```javascript
test("should handle authentication @auth @smoke", async ({ request }) => {
  // Test implementation
});
```

Run specific tags:

```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "@auth"
```

## 📋 Best Practices

### 1. Test Independence

- Each test should be independent and not rely on other tests
- Clean database state before each test
- Use unique test data to avoid conflicts

### 2. Data Management

- Use factory functions for test data generation
- Clean up test data after each test
- Use meaningful test data that reflects real scenarios

### 3. Error Testing

- Test both success and failure scenarios
- Verify error messages and status codes
- Test edge cases and boundary conditions

### 4. Performance Testing

- Include response time assertions
- Test with realistic data volumes
- Monitor resource usage during tests

### 5. Security Testing

- Test input validation and sanitization
- Verify security headers
- Test authentication and authorization

### 6. Maintenance

- Keep tests DRY (Don't Repeat Yourself)
- Use descriptive test names
- Group related tests in describe blocks
- Maintain test documentation

## 📊 Test Metrics

Our test suite provides comprehensive coverage:

- **API Endpoints**: 100% coverage of all REST endpoints
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **Status Codes**: 200, 201, 400, 404, 409, 429, 500
- **Security Features**: XSS, SQL injection, rate limiting, CORS
- **Error Scenarios**: Validation, conflicts, server errors

## 🚀 Continuous Improvement

The test suite is continuously improved with:

- Regular security updates
- Performance optimizations
- New test scenarios
- Better error reporting
- Enhanced CI/CD integration

For questions or contributions, please refer to the main project documentation or create an issue in the repository.

---

**Happy Testing! 🧪✨**
