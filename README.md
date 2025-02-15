# Writing the improved README content to a markdown (.md) file

readme_content = """
# 📦 Express PostgreSQL API Template with Docker

A modern **Express.js** API template featuring **PostgreSQL** integration, **Docker** support, and **pure SQL** queries for user management functionality.

## 🚀 Features

- **Express.js REST API** for quick backend development.
- **PostgreSQL integration** without ORM — using raw SQL queries for full control.
- **Environment Variables Configuration** for secure credentials management.
- **User CRUD Operations** with example endpoints.
- **Docker Compose Setup** for easy PostgreSQL and pgAdmin management.
- **pgAdmin 4** for visual database management.
- **Data Seeding** with `Faker.js` to generate sample data.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js** (v14 or higher)
- **Docker** and **Docker Compose**
- **pnpm** (or install it using `npm i -g pnpm`)

---

## 🚀 Getting Started

### Clone the repository and install dependencies

```sh
git clone https://github.com/your-username/express-postgres-api.git
cd express-postgres-api
pnpm install
```

### Configure environment variables
Create an .env file inside the ./env folder with the following content:
```sh
PORT=3000
DB_HOST=localhost
DB_USER=shay
DB_PASSWORD=123456
DB_NAME=FS_4
DB_PORT=5432

# PgAdmin credentials
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=admin 
```

### 🐳 Docker Setup
Start PostgreSQL and pgAdmin using Docker Compose:

```sh
# down
docker-compose down

# up containers
docker-compose up -d
```

### Insert users with faker 
```sh
# seed the users collection
pnpm run seed
```

### run the server 
```sh
pnpm run dev
```