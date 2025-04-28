-- Script to delete all tables from the database
-- WARNING: This will permanently delete all data in the database
-- Use with caution, especially in production environments

-- First, drop all views
DROP VIEW IF EXISTS customer_balance;
DROP VIEW IF EXISTS customer_payment_summary;
DROP VIEW IF EXISTS customer_debt_summary;
DROP VIEW IF EXISTS staff_wages_summary;
DROP VIEW IF EXISTS staff_summary;
DROP VIEW IF EXISTS trip_summary;

-- Then, drop all tables in reverse order of creation (to handle dependencies)
-- First, drop tables with foreign key constraints
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS debts;
DROP TABLE IF EXISTS staff_wages;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS staff_salary_adjustments;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS customers;

-- Confirm deletion
DO $$
BEGIN
    RAISE NOTICE 'All tables and views have been dropped successfully.';
END $$;