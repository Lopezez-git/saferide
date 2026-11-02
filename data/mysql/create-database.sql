-- Run as a database administrator on your local MySQL.
-- Creates only SafeRide's database. Does not modify other databases.
CREATE DATABASE IF NOT EXISTS saferide CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Create a dedicated user locally with a password you choose, then grant privileges
-- only on saferide.*. Do not use root as the application's login.
-- Flyway needs CREATE, ALTER, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE
-- on this database during local development. Do not commit passwords.
