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

-- One to many relationship
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

-- Create new table to handle profile pictures
-- One to one relationship
CREATE TABLE profile_pictures(
    picture_id SERIAL PRIMARY KEY, 
    file_path TEXT NOT NULL, 
    file_name TEXT NOT NULL, 
    mime_type TEXT, 
    size_bytes INTEGER,  -- For validation
    uploaded_at TIMESTAMP DEFAULT NOW(), 
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE
); 


-- Update a user's details
UPDATE users 
SET first_name = 'Blessing', 
    last_name = 'Leh'
    email = 'blesingleh@gmail.com'
WHERE id = 5
RETURNING * 

-- CREATE QUERIES FOR SEARCHED WORDS
-- Insert newly searched word into the table
INSERT INTO search_history (word, user_id)
VALUES ('umpire', 5); 


-- Search for a user's distinct words, arranged according to the most recent
SELECT word, MAX(searched_at) AS last_searched
FROM search_history
WHERE user_id = 5
GROUP BY word
ORDER BY last_searched DESC
LIMIT 5;

-- Renovate users relation to include token, & expiration
ALTER TABLE users
ADD COLUMN reset_token TEXT,
ADD COLUMN reset_token_expires TIMESTAMP;

