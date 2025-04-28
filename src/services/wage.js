import { supabase } from '@/config/supabase';

/**
 * Calculate driver salary for a trip
 * @param {Object} trip - Trip object
 * @returns {number} - Salary amount
 */
export const calculateDriverWage = (trip) => {
    // Your custom formula here
    // Example: 10% of trip price
    return trip.price * 0.1;
};

/**
 * Calculate assistant salary for a trip
 * @param {Object} trip - Trip object
 * @returns {number} - Salary amount
 */
export const calculateAssistantWage = (trip) => {
    // Your custom formula here
    // Example: 5% of trip price
    return trip.price * 0.05;
};

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
            await supabase.from('staff_wages')
                .upsert({
                    trip_id: trip.id,
                    staff_id: trip.driver_id,
                    role: 'driver',
                    amount: driverWage,
                    notes: `Calculated as 10% of trip price: ${trip.price}`,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'trip_id,staff_id' });
        }

        // Calculate assistant wage if assistant exists
        if (trip.assistant_id) {
            const assistantWage = calculateAssistantWage(trip);
            
            // Save assistant wage
            await supabase.from('staff_wages')
                .upsert({
                    trip_id: trip.id,
                    staff_id: trip.assistant_id,
                    role: 'assistant',
                    amount: assistantWage,
                    notes: `Calculated as 5% of trip price: ${trip.price}`,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'trip_id,staff_id' });
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
        const { data: customer } = await supabase
            .from('customers')
            .select('company_name, representative_name')
            .eq('id', trip.customer_id)
            .single();
            
        if (!customer) throw new Error('Customer not found');
        
        // Check if debt for this year already exists
        const { data: existingDebt } = await supabase
            .from('debts')
            .select('id, amount')
            .eq('customer_id', trip.customer_id)
            .eq('year', tripYear)
            .single();
            
        if (existingDebt) {
            // Update existing debt
            await supabase.from('debts')
                .update({
                    amount: existingDebt.amount + trip.price,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingDebt.id);
        } else {
            // Create new debt
            await supabase.from('debts')
                .insert({
                    customer_id: trip.customer_id,
                    year: tripYear,
                    amount: trip.price,
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
            .select(`
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
            `)
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
        const { data, error } = await supabase
            .from('staff_wages_summary')
            .select('*')
            .eq('staff_id', staffId)
            .order('year', { ascending: false })
            .order('month', { ascending: false });
            
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
        const { data: driverTrips, error: driverError } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', staffId)
            .eq('status', 'PRICED');
            
        if (driverError) throw driverError;
        
        const { data: assistantTrips, error: assistantError } = await supabase
            .from('trips')
            .select('*')
            .eq('assistant_id', staffId)
            .eq('status', 'PRICED');
            
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
