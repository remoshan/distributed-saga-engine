-- Creates the remaining per-service databases.
-- The postgres entrypoint runs this exactly once, against a fresh data volume,
-- so plain CREATE DATABASE is safe (it can never execute twice).
-- order_db is already created by the entrypoint via POSTGRES_DB.
CREATE DATABASE inventory_db;
CREATE DATABASE payment_db;
