# Express PostgreSQL API Template

A modern Express.js API template with PostgreSQL integration, Docker support, and sample user management functionality.

## Features

- 🚀 Express.js REST API
- 📦 PostgreSQL database with Docker setup
- 🔧 No ORM - pure SQL queries
- 🔑 Environment variables configuration
- 👥 Basic user CRUD operations
- 🎭 Faker.js for generating sample data
- 📊 pgAdmin 4 for database management
- 🐳 Docker Compose setup

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- npm or yarn package manager

## How to setup

1. pnpm install (if you don't have pnpm use this command to install -> npm i -g pnpm)
2. pnpm run dev (to run this project)
3. docker-compose down
4. docker-compose up -d
5. pnpm run seed (to init the data)
