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
        const allTrips = [...driverTrips.map((trip) => ({ ...trip, role: 'driver', salary: calculateDriverSalary(trip) })), ...assistantTrips.map((trip) => ({ ...trip, role: 'assistant', salary: calculateAssistantSalary(trip) }))];

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
 * Calculate driver salary for a trip
 * @param {Object} trip - Trip object
 * @returns {number} - Salary amount
 */
export const calculateDriverSalary = (trip) => {
    // Implement your salary calculation logic here
    // For example, 10% of trip price
    return trip.price * 0.1;
};

/**
 * Calculate assistant salary for a trip
 * @param {Object} trip - Trip object
 * @returns {number} - Salary amount
 */
export const calculateAssistantSalary = (trip) => {
    // Implement your salary calculation logic here
    // For example, 5% of trip price
    return trip.price * 0.05;
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
