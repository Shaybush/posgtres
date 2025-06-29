# Security Implementation Guide

This document outlines the comprehensive security measures implemented in this Express.js application to protect against various attack vectors including XSS, SQL injection, rate limiting, and more.

## 🛡️ Security Features Implemented

### 1. XSS (Cross-Site Scripting) Protection

**Implementation**: Using DOMPurify with JSDOM for server-side sanitization

- **Location**: `middleware/security.js` - `xssProtection` middleware
- **How it works**:
  - Sanitizes all string inputs in request body, query parameters, and URL parameters
  - Strips all HTML tags and attributes while preserving text content
  - Recursively processes nested objects
- **Configuration**:
  ```javascript
  DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
    KEEP_CONTENT: true, // Keep text content
  });
  ```

### 2. SQL Injection Protection

**Implementation**: Multiple layers of protection

- **Location**: `middleware/security.js` - `sqlInjectionProtection` middleware
- **Detection Patterns**:
  - SQL keywords: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`, `EXEC`, `UNION`, `SCRIPT`
  - SQL syntax: `;`, `--`, `/*`, `*/`
  - Logical operators: `OR`, `AND` with equals
  - Common injection patterns: `1=1`, `1=0`
  - Quote patterns for string escaping
- **Additional Protection**: Parameterized queries in all database operations

### 3. Rate Limiting

**Implementation**: Multiple rate limiters for different use cases

- **General Limiter**: 100 requests per 15 minutes for all routes
- **API Limiter**: 1000 requests per hour for API endpoints
- **Strict Limiter**: 5 requests per 15 minutes for sensitive operations (POST, PUT, PATCH, DELETE)

**Configuration**:

```javascript
// Sensitive operations (Create, Update, Delete)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: "Too many attempts, please try again after 15 minutes" },
});
```

### 4. Input Validation & Sanitization

**Implementation**: Enhanced express-validator with comprehensive rules

- **Location**: `middleware/validators.js`
- **Features**:
  - Field-specific validation patterns
  - HTML escaping for all text inputs
  - Email normalization with security checks
  - Phone number format validation
  - Character whitelisting for names and addresses
  - Hebrew and Arabic character support
  - Suspicious content detection

**Example**:

```javascript
body("name")
  .trim()
  .isLength({ min: 2, max: 100 })
  .matches(/^[a-zA-Z\s\u0590-\u05FF\u0600-\u06FF.-]+$/)
  .escape()
  .customSanitizer((value) => value.replace(/\s+/g, " ").trim());
```

### 5. NoSQL Injection Protection

**Implementation**: Using express-mongo-sanitize

- **Location**: `app.js` - Applied globally
- **Protection**: Removes any keys that start with '$' or contain '.'

### 6. HTTP Parameter Pollution (HPP) Protection

**Implementation**: Using hpp middleware

- **Location**: `app.js` - Applied globally
- **Protection**: Prevents duplicate parameters in query strings

### 7. Security Headers

**Implementation**: Multiple security headers via Helmet and custom middleware

- **Headers Applied**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - Content Security Policy (CSP)

### 8. Content Security Policy (CSP)

**Implementation**: Restrictive CSP to prevent XSS

```javascript
const cspOptions = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
};
```

### 9. Request Size Limiting

**Implementation**: Multiple size limits

- **JSON Payload**: 10KB limit
- **URL Encoded**: 10KB limit with 20 parameter limit
- **Custom Size Checker**: 10MB maximum request size

### 10. CORS Protection

**Implementation**: Restrictive CORS configuration

```javascript
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
  })
);
```

## 🔍 Security Monitoring & Logging

### 1. Validation Failure Logging

- Logs all validation failures with IP, timestamp, and error details
- Helps identify potential attack patterns

### 2. Database Operation Logging

- Logs all successful CRUD operations with user details
- Tracks user access patterns for security monitoring

### 3. Error Handling

- Comprehensive error handling with security-conscious responses
- Prevents information leakage in error messages
- Different error responses for development vs production

## 🚨 Attack Vector Protection Summary

| Attack Type            | Protection Method                         | Implementation              |
| ---------------------- | ----------------------------------------- | --------------------------- |
| XSS                    | DOMPurify sanitization                    | Server-side HTML stripping  |
| SQL Injection          | Pattern detection + Parameterized queries | Multi-layer protection      |
| NoSQL Injection        | express-mongo-sanitize                    | Key sanitization            |
| CSRF                   | CORS restrictions                         | Origin validation           |
| DoS/DDoS               | Rate limiting                             | Multiple rate limiters      |
| Parameter Pollution    | HPP middleware                            | Duplicate parameter removal |
| Clickjacking           | X-Frame-Options                           | Frame denial                |
| MIME Sniffing          | X-Content-Type-Options                    | Content type enforcement    |
| Information Disclosure | Security headers                          | Multiple protective headers |

## 🔧 Configuration Examples

### Environment Variables

```bash
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
PORT=3000
```

### Testing Security

```bash
# Test XSS protection
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"test@test.com","phone":"+9725012345678","address":"123 Main St","city":"Tel Aviv","country":"Israel"}'

# Test SQL injection protection
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John; DELETE FROM users; --"}

# Test rate limiting
for i in {1..10}; do curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"name":"Test","email":"test'$i'@test.com","phone":"+9725012345678","address":"123 Main St","city":"Tel Aviv","country":"Israel"}'; done
```

## 📋 Security Checklist

- [x] XSS Protection (DOMPurify)
- [x] SQL Injection Protection (Pattern detection + Parameterized queries)
- [x] NoSQL Injection Protection (express-mongo-sanitize)
- [x] Rate Limiting (Multiple levels)
- [x] Input Validation & Sanitization (express-validator)
- [x] Security Headers (Helmet + Custom)
- [x] CORS Protection
- [x] Request Size Limiting
- [x] HTTP Parameter Pollution Protection
- [x] Content Security Policy
- [x] Error Handling & Logging
- [x] Graceful Shutdown Handling

## 🔄 Regular Security Maintenance

1. **Update Dependencies**: Regularly update all security-related packages
2. **Review Logs**: Monitor validation failures and suspicious activities
3. **Test Security**: Regularly test with security scanning tools
4. **Rate Limit Tuning**: Adjust rate limits based on legitimate usage patterns
5. **CSP Updates**: Update Content Security Policy as application evolves

## 📞 Security Incident Response

If you detect a security incident:

1. Check application logs for attack patterns
2. Review rate limiting logs for unusual traffic
3. Monitor database for unauthorized access attempts
4. Update security rules if new attack vectors are discovered

## 🎯 Example Attack Scenarios Prevented

### Scenario 1: XSS Attack

**Attack**: `POST /api/users` with `{"name": "<script>alert('XSS')</script>"}`
**Protection**: DOMPurify strips the script tags, leaving only "alert('XSS')"

### Scenario 2: SQL Injection

**Attack**: `POST /api/users` with `{"name": "John'; DROP TABLE users; --"}`
**Protection**: SQL injection middleware detects patterns and rejects the request

### Scenario 3: Rate Limit Bypass

**Attack**: Multiple rapid POST requests to create users
**Protection**: Strict rate limiter allows only 5 requests per 15 minutes

### Scenario 4: Parameter Pollution

**Attack**: `GET /api/users?id=1&id=2&id=3`
**Protection**: HPP middleware removes duplicate parameters

This comprehensive security implementation provides multiple layers of protection against common web application vulnerabilities while maintaining usability and performance.
