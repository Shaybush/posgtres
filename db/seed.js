const { faker } = require('@faker-js/faker');
const { pool } = require('./config');

const USERS_TO_CREATE = 50; // Change this number to generate more or fewer users

async function seedUsers() {
    try {
        const users = [];

        const generateIsraeliPhoneNumber = () => {
            const prefix = '+9725'; // Israeli mobile prefix
            const randomDigits = faker.string.numeric(7); // Generate 7 random digits
            return `${prefix}${randomDigits}`;
        };

        // Generate fake user data
        for (let i = 0; i < USERS_TO_CREATE; i++) {
            const user = {
                name: faker.person.fullName(),
                email: faker.internet.email(),
                phone: generateIsraeliPhoneNumber(),
                address: faker.location.streetAddress(),
                city: faker.location.city(),
                country: faker.location.country()
            };
            users.push(user);
        }

        console.log(`Inserting ${USERS_TO_CREATE} users...`);

        // Insert users in batches
        for (const user of users) {
            await pool.query(
                'INSERT INTO users (name, email, phone, address, city, country) VALUES ($1, $2, $3, $4, $5, $6)',
                [user.name, user.email, user.phone, user.address, user.city, user.country]
            );
        }

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding users:', error);
    } finally {
        // Close the pool
        await pool.end();
    }
}

seedUsers(); 