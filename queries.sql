-- Create database
CREATE DATABASE dictionary; 

-- Create two tables, user & search_history
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL, 
    last_name TEXT NOT NULL
    email VARCHAR(100) UNIQUE NOT NULL, 
    password VARCHAR(255) NOT NULL
); 

CREATE TABLE search_history (
    search_id SERIAL PRIMARY, 
    word TEXT, 
    searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    user_id INTEGER REFERENCES user(id) ON DELETE CASCADE
);


-- Create a user record
INSERT INTO users (first_name, last_name, email, password) 
VALUES ('Treasure', 'Barinaada', 'treasure@gmail.com', 000000); 

-- Retrieve the record for a user using their
SELECT * 
FROM users 
WHERE id = 2;

