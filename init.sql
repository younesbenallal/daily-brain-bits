
-- Create a new user
CREATE USER user WITH PASSWORD 'password';

-- Create a new database
CREATE DATABASE "daily-brain-bits";

-- Grant privileges to the user on the database
GRANT ALL PRIVILEGES ON DATABASE daily-brain-bits TO user;
