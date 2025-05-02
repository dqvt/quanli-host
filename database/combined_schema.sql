-- Combined SQL schema for Vận Tải Đại Quân database
-- This file contains all tables and views for the application
-- Execute this file in the Supabase SQL Editor to set up the database schema

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
-- Create customer table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_name TEXT,
    company_name TEXT,
    contact_number TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    google_drive_link TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on company_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);

-- Create index on status for filtering active/inactive customers
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Add comment to table
COMMENT ON TABLE customers IS 'Stores information about customers';

-- Add comments to columns
COMMENT ON COLUMN customers.id IS 'Unique identifier for the customer';
COMMENT ON COLUMN customers.representative_name IS 'Name of the customer representative';
COMMENT ON COLUMN customers.company_name IS 'Name of the company';
COMMENT ON COLUMN customers.contact_number IS 'Contact phone number';
COMMENT ON COLUMN customers.email IS 'Email address';
COMMENT ON COLUMN customers.address IS 'Physical address';
COMMENT ON COLUMN customers.tax_number IS 'Tax identification number';
COMMENT ON COLUMN customers.google_drive_link IS 'Link to customer documents in Google Drive';
COMMENT ON COLUMN customers.status IS 'Current status of the customer (active, inactive)';
COMMENT ON COLUMN customers.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN customers.updated_at IS 'Timestamp when the record was last updated';

-- =============================================
-- VEHICLES TABLE
-- =============================================
-- Create vehicle table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_number VARCHAR(20) NOT NULL UNIQUE,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    date_of_manufacture DATE,
    registration_expiry_date DATE,
    vehicle_type VARCHAR(20),
    capacity NUMERIC,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on license_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_license_number ON vehicles(license_number);

-- Create index on status for filtering active/inactive vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- Add comment to table
COMMENT ON TABLE vehicles IS 'Stores information about vehicles in the fleet';

-- Add comments to columns
COMMENT ON COLUMN vehicles.id IS 'Unique identifier for the vehicle';
COMMENT ON COLUMN vehicles.license_number IS 'Vehicle license plate number (must be unique)';
COMMENT ON COLUMN vehicles.brand IS 'Vehicle manufacturer brand';
COMMENT ON COLUMN vehicles.model IS 'Vehicle model';
COMMENT ON COLUMN vehicles.year IS 'Year the vehicle was manufactured';
COMMENT ON COLUMN vehicles.date_of_manufacture IS 'Date when the vehicle was manufactured';
COMMENT ON COLUMN vehicles.registration_expiry_date IS 'Date when the vehicle registration expires';
COMMENT ON COLUMN vehicles.vehicle_type IS 'Type of vehicle (TRUCK, TRAILER, TRACTOR, CAR)';
COMMENT ON COLUMN vehicles.capacity IS 'Vehicle capacity';
COMMENT ON COLUMN vehicles.status IS 'Current status of the vehicle (active, inactive)';
COMMENT ON COLUMN vehicles.notes IS 'Additional notes about the vehicle';
COMMENT ON COLUMN vehicles.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN vehicles.updated_at IS 'Timestamp when the record was last updated';

-- =============================================
-- STAFF TABLE
-- =============================================
-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    short_name TEXT,
    dob DATE,
    vietnam_id TEXT,
    license_number TEXT,
    phone_number TEXT,
    emergency_contact JSONB DEFAULT '{
        "name": "",
        "phone_number": "",
        "relationship": ""
    }'::jsonb,
    driver_wage_percentage NUMERIC NOT NULL CHECK (driver_wage_percentage > 0 AND driver_wage_percentage <= 100),
    assistant_wage_percentage NUMERIC NOT NULL CHECK (assistant_wage_percentage > 0 AND assistant_wage_percentage <= 100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on full_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_full_name ON staff(full_name);

-- Create index on short_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_short_name ON staff(short_name);

-- Create index on status for filtering active/inactive staff
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- Create index on vietnam_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_vietnam_id ON staff(vietnam_id);

-- Create index on license_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_license_number ON staff(license_number);

-- Add comment to table
COMMENT ON TABLE staff IS 'Stores information about staff members (drivers and assistants)';

-- Add comments to columns
COMMENT ON COLUMN staff.id IS 'Unique identifier for the staff member';
COMMENT ON COLUMN staff.full_name IS 'Full name of the staff member';
COMMENT ON COLUMN staff.short_name IS 'Short name or nickname of the staff member';
COMMENT ON COLUMN staff.dob IS 'Date of birth';
COMMENT ON COLUMN staff.vietnam_id IS 'Vietnam national ID number (CCCD)';
COMMENT ON COLUMN staff.license_number IS 'Driver license number';
COMMENT ON COLUMN staff.phone_number IS 'Contact phone number';
COMMENT ON COLUMN staff.emergency_contact IS 'JSON object containing emergency contact details (name, phone_number, relationship)';
COMMENT ON COLUMN staff.driver_wage_percentage IS 'Percentage of trip price_for_staff to be paid when staff is a driver';
COMMENT ON COLUMN staff.assistant_wage_percentage IS 'Percentage of trip price_for_staff to be paid when staff is an assistant';
COMMENT ON COLUMN staff.status IS 'Current status of the staff member (active, inactive)';
COMMENT ON COLUMN staff.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN staff.updated_at IS 'Timestamp when the record was last updated';

-- Create a table for staff salary adjustments
CREATE TABLE IF NOT EXISTS staff_salary_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id),
    amount NUMERIC NOT NULL,
    adjustment_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on staff_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_salary_adjustments_staff_id ON staff_salary_adjustments(staff_id);

-- Create index on adjustment_date for date range queries
CREATE INDEX IF NOT EXISTS idx_staff_salary_adjustments_date ON staff_salary_adjustments(adjustment_date);

-- Add comment to table
COMMENT ON TABLE staff_salary_adjustments IS 'Stores salary adjustments for staff members';

-- Add comments to columns
COMMENT ON COLUMN staff_salary_adjustments.id IS 'Unique identifier for the salary adjustment';
COMMENT ON COLUMN staff_salary_adjustments.staff_id IS 'Reference to the staff member';
COMMENT ON COLUMN staff_salary_adjustments.amount IS 'Adjustment amount (positive for bonus, negative for deduction)';
COMMENT ON COLUMN staff_salary_adjustments.adjustment_date IS 'Date when the adjustment was applied';
COMMENT ON COLUMN staff_salary_adjustments.reason IS 'Reason for the salary adjustment';
COMMENT ON COLUMN staff_salary_adjustments.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN staff_salary_adjustments.updated_at IS 'Timestamp when the record was last updated';

-- =============================================
-- TRIPS TABLE
-- =============================================
-- Create trip table
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID,
    assistant_id UUID,
    starting_point TEXT NOT NULL,
    ending_point TEXT NOT NULL,
    distance NUMERIC,
    trip_date DATE,
    status VARCHAR(20) DEFAULT 'PENDING',
    price_for_customer NUMERIC DEFAULT 0,
    price_for_staff NUMERIC DEFAULT 0,
    expenses JSONB DEFAULT '{
        "police_fee": 0,
        "toll_fee": 0,
        "food_fee": 0,
        "gas_money": 0,
        "mechanic_fee": 0
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create foreign key constraints for staff references
-- Note: These assume a staff table exists
ALTER TABLE trips 
    ADD CONSTRAINT fk_driver FOREIGN KEY (driver_id) REFERENCES staff(id),
    ADD CONSTRAINT fk_assistant FOREIGN KEY (assistant_id) REFERENCES staff(id);

-- Create index on customer_id for faster lookups of trips by customer
CREATE INDEX IF NOT EXISTS idx_trips_customer_id ON trips(customer_id);

-- Create index on vehicle_id for faster lookups of trips by vehicle
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);

-- Create index on driver_id for faster lookups of trips by driver
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);

-- Create index on assistant_id for faster lookups of trips by assistant
CREATE INDEX IF NOT EXISTS idx_trips_assistant_id ON trips(assistant_id);

-- Create index on status for filtering trips by status
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- Create index on trip_date for date range queries
CREATE INDEX IF NOT EXISTS idx_trips_trip_date ON trips(trip_date);

-- Add comment to table
COMMENT ON TABLE trips IS 'Stores information about trips';

-- Add comments to columns
COMMENT ON COLUMN trips.id IS 'Unique identifier for the trip';
COMMENT ON COLUMN trips.customer_id IS 'Reference to the customer';
COMMENT ON COLUMN trips.vehicle_id IS 'Reference to the vehicle used for the trip';
COMMENT ON COLUMN trips.driver_id IS 'Reference to the driver staff member';
COMMENT ON COLUMN trips.assistant_id IS 'Reference to the assistant staff member';
COMMENT ON COLUMN trips.starting_point IS 'Starting location of the trip';
COMMENT ON COLUMN trips.ending_point IS 'Ending location of the trip';
COMMENT ON COLUMN trips.distance IS 'Distance of the trip';
COMMENT ON COLUMN trips.trip_date IS 'Date when the trip occurred';
COMMENT ON COLUMN trips.status IS 'Current status of the trip (PENDING, WAITING_FOR_PRICE, PRICED)';
COMMENT ON COLUMN trips.price_for_customer IS 'Price charged for the trip for the customer';
COMMENT ON COLUMN trips.price_for_staff IS 'Price charged for the trip for the staff';
COMMENT ON COLUMN trips.expenses IS 'JSON object containing expense details (police_fee, toll_fee, food_fee, gas_money, mechanic_fee)';
COMMENT ON COLUMN trips.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN trips.updated_at IS 'Timestamp when the record was last updated';

-- =============================================
-- STAFF WAGES TABLE
-- =============================================
-- Create staff_wages table to store calculated wages for each trip
CREATE TABLE IF NOT EXISTS staff_wages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id),
    staff_id UUID REFERENCES staff(id),
    role VARCHAR(20) NOT NULL, -- 'driver' or 'assistant'
    amount NUMERIC NOT NULL,
    notes TEXT, -- Optional notes about the calculation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trip_id, staff_id) -- Ensure one wage record per staff per trip
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_wages_trip_id ON staff_wages(trip_id);
CREATE INDEX IF NOT EXISTS idx_staff_wages_staff_id ON staff_wages(staff_id);

-- Add comments to staff_wages table
COMMENT ON TABLE staff_wages IS 'Stores calculated wages for staff members for each trip based on percentage rates';
COMMENT ON COLUMN staff_wages.id IS 'Unique identifier for the wage record';
COMMENT ON COLUMN staff_wages.trip_id IS 'Reference to the trip';
COMMENT ON COLUMN staff_wages.staff_id IS 'Reference to the staff member';
COMMENT ON COLUMN staff_wages.role IS 'Role of the staff member in the trip (driver or assistant)';
COMMENT ON COLUMN staff_wages.amount IS 'Calculated wage amount based on trip price_for_staff and role percentage rate';
COMMENT ON COLUMN staff_wages.notes IS 'Optional notes about the calculation';
COMMENT ON COLUMN staff_wages.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN staff_wages.updated_at IS 'Timestamp when the record was last updated';

-- =============================================
-- DEBTS TABLE
-- =============================================
-- Create debts table to track customer debts by year
CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    year INTEGER NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, year)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_debts_customer_id ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_year ON debts(year);

-- Add comments to debts table
COMMENT ON TABLE debts IS 'Stores customer debts by year';
COMMENT ON COLUMN debts.id IS 'Unique identifier for the debt record';
COMMENT ON COLUMN debts.customer_id IS 'Reference to the customer';
COMMENT ON COLUMN debts.year IS 'Year of the debt';
COMMENT ON COLUMN debts.amount IS 'Debt amount';
COMMENT ON COLUMN debts.notes IS 'Optional notes about the debt';
COMMENT ON COLUMN debts.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN debts.updated_at IS 'Timestamp when the record was last updated';

-- =============================================
-- PAYMENTS TABLE
-- =============================================
-- Create payments table to track customer payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    payment_method VARCHAR(50),
    reference_number TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);

-- Add comments to payments table
COMMENT ON TABLE payments IS 'Stores customer payments';
COMMENT ON COLUMN payments.id IS 'Unique identifier for the payment record';
COMMENT ON COLUMN payments.customer_id IS 'Reference to the customer';
COMMENT ON COLUMN payments.amount IS 'Payment amount';
COMMENT ON COLUMN payments.date IS 'Payment date';
COMMENT ON COLUMN payments.payment_method IS 'Method of payment (cash, bank transfer, etc.)';
COMMENT ON COLUMN payments.reference_number IS 'Reference number for the payment (e.g., bank transfer reference)';
COMMENT ON COLUMN payments.note IS 'Optional notes about the payment';
COMMENT ON COLUMN payments.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN payments.updated_at IS 'Timestamp when the record was last updated';

-- =============================================
-- VIEWS
-- =============================================
-- Create a view for trips with calculated total expenses
CREATE OR REPLACE VIEW trip_summary AS
SELECT 
    t.id,
    t.customer_id,
    c.company_name,
    c.representative_name,
    t.vehicle_id,
    v.license_number,
    t.driver_id,
    d.full_name AS driver_name,
    t.assistant_id,
    a.full_name AS assistant_name,
    t.starting_point,
    t.ending_point,
    t.distance,
    t.trip_date,
    t.status,
    t.price_for_customer,
    t.price_for_staff,
    t.expenses,
    (COALESCE((t.expenses->>'police_fee')::numeric, 0) + 
     COALESCE((t.expenses->>'toll_fee')::numeric, 0) + 
     COALESCE((t.expenses->>'food_fee')::numeric, 0) + 
     COALESCE((t.expenses->>'gas_money')::numeric, 0) + 
     COALESCE((t.expenses->>'mechanic_fee')::numeric, 0)) AS total_expenses,
    t.created_at,
    t.updated_at
FROM 
    trips t
LEFT JOIN 
    customers c ON t.customer_id = c.id
LEFT JOIN 
    vehicles v ON t.vehicle_id = v.id
LEFT JOIN 
    staff d ON t.driver_id = d.id
LEFT JOIN 
    staff a ON t.assistant_id = a.id;

COMMENT ON VIEW trip_summary IS 'View that provides trip details with related entity information and calculated total expenses';

-- Create a view for staff with trip counts
CREATE OR REPLACE VIEW staff_summary AS
SELECT 
    s.id,
    s.full_name,
    s.short_name,
    s.status,
    s.phone_number,
    s.vietnam_id,
    s.license_number,
    COUNT(DISTINCT t1.id) AS driver_trips_count,
    COUNT(DISTINCT t2.id) AS assistant_trips_count,
    (COUNT(DISTINCT t1.id) + COUNT(DISTINCT t2.id)) AS total_trips_count
FROM 
    staff s
LEFT JOIN 
    trips t1 ON s.id = t1.driver_id
LEFT JOIN 
    trips t2 ON s.id = t2.assistant_id
GROUP BY 
    s.id, s.full_name, s.short_name, s.status, s.phone_number, s.vietnam_id, s.license_number;

COMMENT ON VIEW staff_summary IS 'View that provides staff details with trip counts as driver and assistant';

-- Create a view for staff wages summary
CREATE OR REPLACE VIEW staff_wages_summary AS
SELECT 
    s.id AS staff_id,
    s.full_name,
    s.short_name,
    EXTRACT(YEAR FROM t.trip_date) AS year,
    EXTRACT(MONTH FROM t.trip_date) AS month,
    COUNT(DISTINCT sw.trip_id) AS trip_count,
    SUM(sw.amount) AS total_wages
FROM 
    staff s
LEFT JOIN 
    staff_wages sw ON s.id = sw.staff_id
LEFT JOIN 
    trips t ON sw.trip_id = t.id
GROUP BY 
    s.id, s.full_name, s.short_name, year, month
ORDER BY 
    s.full_name, year DESC, month DESC;

COMMENT ON VIEW staff_wages_summary IS 'View that provides monthly summary of staff wages';

-- Create a view for customer debt summary with trip details
CREATE OR REPLACE VIEW customer_debt_summary AS
SELECT 
    c.id AS customer_id,
    c.company_name,
    c.representative_name,
    EXTRACT(YEAR FROM t.trip_date) AS year,
    EXTRACT(MONTH FROM t.trip_date) AS month,
    COUNT(t.id) AS trip_count,
    SUM(t.price_for_customer) AS total_price,
    SUM(t.price_for_customer) AS profit
FROM 
    customers c
LEFT JOIN 
    trips t ON c.id = t.customer_id AND t.status = 'PRICED'
GROUP BY 
    c.id, c.company_name, c.representative_name, year, month
ORDER BY 
    c.company_name, year DESC, month DESC;

COMMENT ON VIEW customer_debt_summary IS 'View that provides monthly summary of customer trips and debt';

-- Create a view for customer payment summary
CREATE OR REPLACE VIEW customer_payment_summary AS
SELECT 
    c.id AS customer_id,
    c.company_name,
    c.representative_name,
    EXTRACT(YEAR FROM p.date) AS year,
    EXTRACT(MONTH FROM p.date) AS month,
    COUNT(p.id) AS payment_count,
    SUM(p.amount) AS total_payments
FROM 
    customers c
LEFT JOIN 
    payments p ON c.id = p.customer_id
GROUP BY 
    c.id, c.company_name, c.representative_name, year, month
ORDER BY 
    c.company_name, year DESC, month DESC;

COMMENT ON VIEW customer_payment_summary IS 'View that provides monthly summary of customer payments';

-- Create a view for customer balance (debt minus payments)
CREATE OR REPLACE VIEW customer_balance AS
SELECT 
    c.id AS customer_id,
    c.company_name,
    c.representative_name,
    COALESCE(SUM(d.amount), 0) AS total_debt,
    COALESCE(SUM(p.amount), 0) AS total_payments,
    COALESCE(SUM(d.amount), 0) - COALESCE(SUM(p.amount), 0) AS balance
FROM 
    customers c
LEFT JOIN 
    debts d ON c.id = d.customer_id
LEFT JOIN 
    payments p ON c.id = p.customer_id
GROUP BY 
    c.id, c.company_name, c.representative_name
ORDER BY 
    c.company_name;

COMMENT ON VIEW customer_balance IS 'View that provides overall balance for each customer (debt minus payments)';

-- Update staff_wages table comment
COMMENT ON TABLE staff_wages IS 'Stores calculated wages for staff members for each trip based on percentage rates';

-- Update staff_wages amount column comment
COMMENT ON COLUMN staff_wages.amount IS 'Calculated wage amount based on trip price_for_staff and role percentage rate';

-- Update staff_wages table to include calculated amount
CREATE OR REPLACE FUNCTION calculate_staff_wage()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate the wage amount based on staff role-specific wage percentage and trip price_for_staff
    SELECT (
        CASE 
            WHEN NEW.role = 'driver' THEN s.driver_wage_percentage
            WHEN NEW.role = 'assistant' THEN s.assistant_wage_percentage
        END * t.price_for_staff / 100
    ) INTO NEW.amount
    FROM trips t
    JOIN staff s ON s.id = NEW.staff_id
    WHERE t.id = NEW.trip_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate wage amount
CREATE TRIGGER calculate_staff_wage_trigger
    BEFORE INSERT OR UPDATE ON staff_wages
    FOR EACH ROW
    EXECUTE FUNCTION calculate_staff_wage();
