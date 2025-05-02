import { supabase } from '@/config/supabase';

/**
 * Format currency value
 * @param {number} value - Currency value
 * @returns {string} - Formatted currency
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

/**
 * Calculate driver salary/wage for a trip
 * @param {Object} trip - Trip object
 * @returns {number} - Salary amount
 */
export const calculateDriverWage = (trip) => {
    // Your custom formula here
    // Example: 10% of trip price
    // Use price_for_staff if available, otherwise fall back to price for backward compatibility
    const priceForCalculation = trip.price_for_staff !== undefined ? trip.price_for_staff : trip.price;
    return priceForCalculation * 0.1;
};

/**
 * Calculate assistant salary/wage for a trip
 * @param {Object} trip - Trip object
 * @returns {number} - Salary amount
 */
export const calculateAssistantWage = (trip) => {
    // Your custom formula here
    // Example: 5% of trip price
    // Use price_for_staff if available, otherwise fall back to price for backward compatibility
    const priceForCalculation = trip.price_for_staff !== undefined ? trip.price_for_staff : trip.price;
    return priceForCalculation * 0.05;
};

/**
 * Legacy function name for backward compatibility
 * @param {Object} trip - Trip object
 * @returns {number} - Salary amount
 */
export const calculateDriverSalary = calculateDriverWage;

/**
 * Legacy function name for backward compatibility
 * @param {Object} trip - Trip object
 * @returns {number} - Salary amount
 */
export const calculateAssistantSalary = calculateAssistantWage;

/**
 * Save calculated wages for a trip
 * @param {Object} trip - Trip object
 * @returns {Promise<void>}
 */
export const saveWagesForTrip = async (trip) => {
    try {
        // Only calculate wages for PRICED trips
        if (trip.status !== 'PRICED') return;

        // Calculate driver wage
        if (trip.driver_id) {
            const driverWage = calculateDriverWage(trip);

            // Save driver wage
            await supabase.from('staff_wages').upsert(
                {
                    trip_id: trip.id,
                    staff_id: trip.driver_id,
                    role: 'driver',
                    amount: driverWage,
                    notes: `Calculated as 10% of trip price: ${trip.price_for_staff !== undefined ? trip.price_for_staff : trip.price}`,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'trip_id,staff_id' }
            );
        }

        // Calculate assistant wage if assistant exists
        if (trip.assistant_id) {
            const assistantWage = calculateAssistantWage(trip);

            // Save assistant wage
            await supabase.from('staff_wages').upsert(
                {
                    trip_id: trip.id,
                    staff_id: trip.assistant_id,
                    role: 'assistant',
                    amount: assistantWage,
                    notes: `Calculated as 5% of trip price: ${trip.price_for_staff !== undefined ? trip.price_for_staff : trip.price}`,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'trip_id,staff_id' }
            );
        }
    } catch (error) {
        console.error('Error saving wages for trip:', error);
        throw error;
    }
};

/**
 * Update customer debt based on trip price
 * @param {Object} trip - Trip object
 * @returns {Promise<void>}
 */
export const updateCustomerDebtForTrip = async (trip) => {
    try {
        // Only update debt for PRICED trips
        if (trip.status !== 'PRICED' || !trip.customer_id) return;

        // Get trip year
        const tripYear = new Date(trip.trip_date).getFullYear();

        // Get customer info
        const { data: customer } = await supabase.from('customers').select('company_name, representative_name').eq('id', trip.customer_id).single();

        if (!customer) throw new Error('Customer not found');

        // Check if debt for this year already exists
        const { data: existingDebt } = await supabase.from('debts').select('id, amount').eq('customer_id', trip.customer_id).eq('year', tripYear).single();

        // Use price_for_customer if available, otherwise fall back to price for backward compatibility
        const priceForCustomer = trip.price_for_customer !== undefined ? trip.price_for_customer : trip.price;

        if (existingDebt) {
            // Update existing debt
            await supabase
                .from('debts')
                .update({
                    amount: existingDebt.amount + priceForCustomer,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingDebt.id);
        } else {
            // Create new debt
            await supabase.from('debts').insert({
                customer_id: trip.customer_id,
                year: tripYear,
                amount: priceForCustomer,
                notes: `Initial debt from trip ${trip.id}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error updating customer debt for trip:', error);
        throw error;
    }
};

/**
 * Get staff wages by staff ID
 * @param {string} staffId - Staff ID
 * @returns {Promise<Array>} - Array of wage records
 */
export const getStaffWages = async (staffId) => {
    try {
        const { data, error } = await supabase
            .from('staff_wages')
            .select(
                `
                *,
                trips:trip_id (
                    id,
                    customer_id,
                    starting_point,
                    ending_point,
                    trip_date,
                    price,
                    customers:customer_id (
                        company_name,
                        representative_name
                    )
                )
            `
            )
            .eq('staff_id', staffId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error getting wages for staff ${staffId}:`, error);
        throw error;
    }
};

/**
 * Get staff wages summary by month
 * @param {string} staffId - Staff ID
 * @returns {Promise<Array>} - Array of monthly wage summaries
 */
export const getStaffWagesSummary = async (staffId) => {
    try {
        const { data, error } = await supabase.from('staff_wages_summary').select('*').eq('staff_id', staffId).order('year', { ascending: false }).order('month', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error getting wage summary for staff ${staffId}:`, error);
        throw error;
    }
};

/**
 * Recalculate wages for all trips of a staff member
 * @param {string} staffId - Staff ID
 * @returns {Promise<void>}
 */
export const recalculateStaffWages = async (staffId) => {
    try {
        // Get all PRICED trips for this staff member
        const { data: driverTrips, error: driverError } = await supabase.from('trips').select('*').eq('driver_id', staffId).eq('status', 'PRICED');

        if (driverError) throw driverError;

        const { data: assistantTrips, error: assistantError } = await supabase.from('trips').select('*').eq('assistant_id', staffId).eq('status', 'PRICED');

        if (assistantError) throw assistantError;

        // Recalculate and save wages for each trip
        for (const trip of driverTrips) {
            await saveWagesForTrip(trip);
        }

        for (const trip of assistantTrips) {
            await saveWagesForTrip(trip);
        }
    } catch (error) {
        console.error(`Error recalculating wages for staff ${staffId}:`, error);
        throw error;
    }
};

/**
 * Get trips for a staff member
 * @param {string} staffId - Staff ID
 * @returns {Promise<Array>} - Array of trips
 */
export const getStaffTrips = async (staffId) => {
    try {
        // Get trips where staff is driver or assistant
        const { data: driverTrips, error: driverError } = await supabase
            .from('trips')
            .select('*, customers!trips_customer_id_fkey(*), vehicles!fk_vehicle(*), driver:driver_id(*), assistant:assistant_id(*)')
            .eq('driver_id', staffId)
            .eq('status', 'PRICED');

        if (driverError) throw driverError;

        const { data: assistantTrips, error: assistantError } = await supabase
            .from('trips')
            .select('*, customers!trips_customer_id_fkey(*), vehicles!fk_vehicle(*), driver:driver_id(*), assistant:assistant_id(*)')
            .eq('assistant_id', staffId)
            .eq('status', 'PRICED');

        if (assistantError) throw assistantError;

        // Combine and mark role
        const allTrips = [...driverTrips.map((trip) => ({ ...trip, role: 'driver', salary: calculateDriverWage(trip) })), ...assistantTrips.map((trip) => ({ ...trip, role: 'assistant', salary: calculateAssistantWage(trip) }))];

        // Sort by date (newest first)
        return allTrips.sort((a, b) => {
            const dateA = a.trip_date ? new Date(a.trip_date) : new Date(0);
            const dateB = b.trip_date ? new Date(b.trip_date) : new Date(0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error(`Error getting trips for staff ${staffId}:`, error);
        throw error;
    }
};

/**
 * Group trips by month
 * @param {Array} trips - Array of trips
 * @param {Array} adjustments - Array of salary adjustments
 * @returns {Array} - Array of months with trips
 */
export const groupTripsByMonth = (trips, adjustments) => {
    if (!trips || !trips.length) return [];

    // Create a map of months
    const monthsMap = {};

    // Process trips
    trips.forEach((trip) => {
        if (!trip.trip_date) return;

        const date = new Date(trip.trip_date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;

        if (!monthsMap[key]) {
            monthsMap[key] = {
                year,
                month,
                trips: [],
                totalSalary: 0,
                adjustment: 0,
                adjustmentReason: ''
            };
        }

        monthsMap[key].trips.push(trip);
        monthsMap[key].totalSalary += trip.salary || 0;
    });

    // Process adjustments
    if (adjustments && adjustments.length) {
        adjustments.forEach((adj) => {
            const key = `${adj.year}-${adj.month}`;

            if (monthsMap[key]) {
                monthsMap[key].adjustment = adj.amount;
                monthsMap[key].adjustmentReason = adj.reason;
            }
        });
    }

    // Convert map to array and sort by date (newest first)
    return Object.values(monthsMap).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
};

/**
 * Calculate total salary
 * @param {Array} trips - Array of trips
 * @param {Array} adjustments - Array of salary adjustments
 * @returns {number} - Total salary
 */
export const calculateTotalSalary = (trips, adjustments) => {
    // Calculate base salary from trips
    const baseSalary = trips.reduce((sum, trip) => sum + (trip.salary || 0), 0);

    // Add adjustments
    const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj.amount, 0);

    return baseSalary + totalAdjustment;
};

/**
 * Get salary adjustments for a staff member
 * @param {string} staffId - Staff ID
 * @returns {Promise<Array>} - Array of salary adjustments
 */
export const getStaffSalaryAdjustments = async (staffId) => {
    try {
        const { data, error } = await supabase.from('salary_adjustments').select('*').eq('staff_id', staffId).order('year', { ascending: false }).order('month', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error getting salary adjustments for staff ${staffId}:`, error);
        throw error;
    }
};

/**
 * Save salary adjustment
 * @param {string} staffId - Staff ID
 * @param {string} staffName - Staff name
 * @param {number} year - Adjustment year
 * @param {number} month - Adjustment month
 * @param {number} amount - Adjustment amount
 * @param {string} reason - Adjustment reason
 * @returns {Promise<Object>} - Created/updated adjustment
 */
export const saveSalaryAdjustment = async (staffId, staffName, year, month, amount, reason) => {
    try {
        // Check if adjustment for this month already exists
        const { data: existingAdjustment, error: checkError } = await supabase.from('salary_adjustments').select('*').eq('staff_id', staffId).eq('year', year).eq('month', month).single();

        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 is "No rows returned" error, which is expected if adjustment doesn't exist
            throw checkError;
        }

        if (existingAdjustment) {
            // Update existing adjustment
            const { data, error } = await supabase
                .from('salary_adjustments')
                .update({
                    amount,
                    reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingAdjustment.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Create new adjustment
            const { data, error } = await supabase
                .from('salary_adjustments')
                .insert({
                    staff_id: staffId,
                    staff_name: staffName,
                    year,
                    month,
                    amount,
                    reason,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error(`Error saving salary adjustment for staff ${staffId}:`, error);
        throw error;
    }
};
