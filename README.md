
# Learning Management System

We are going to make a portal in which the tutor will have interactions with students as well as parents. On this portal, online classes and notes will also be given to the students.
The student will be taught in different ways. Many types of games are also included in this which will help the students to study. This is for a particular organization and only the admin can add tutor and students in it.  test

## Technology Stacks
Frontend: Bootstrap, HTML, CSS, Javascript, EJS Template
Backend: Node.js,Express.js
Database: MySQL 8+ / MariaDB (relational tables)

## Deployment
## Note : Don't Run composer install / update , if not needed.

1. Clone the repository with git clone.
2. Copy .env.example file to .env and edit database, mail & other credentials there.
3. Run npm install
4. Run npm run start

## MySQL setup

1. Import `database/schema.sql` using phpMyAdmin or the MySQL CLI.
2. Configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `.env`.
3. Run `npm install` and `npm start`.

Every model field is stored in a typed MySQL column. Arrays and embedded records
use named child/junction tables, including recursively nested arrays. Express
sessions use the `user_sessions` table.

Run `npm run schema:mysql` to synchronize and regenerate `database/schema.sql`.

## Demo data and features

- Run `npm run seed` to create the idempotent connected demo dataset.
- See `docs/PROJECT_FEATURES.md` for the implementation-derived feature inventory.

## HIPL
https://www.helpfulinsightsolution.com
