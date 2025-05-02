import { supabase } from '@/config/supabase';
import { onMounted, ref, watch } from 'vue';
import { calculateAssistantWage, calculateDriverWage, saveWagesForTrip, updateCustomerDebtForTrip } from './salary';

// Common query selectors for trips with related data
const TRIP_SELECT_WITH_RELATIONS = `
    *,
    customers(id, company_name, representative_name),
    vehicles(id, license_number),
    driver:staff!fk_driver(id, full_name),
    assistant:staff!fk_assistant(id, full_name)
`;

/**
 * Format timestamp to a readable date
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted date
 */
export const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Format expenses from camelCase (frontend) to snake_case (database)
 * @param {Object} expenses - Expenses in camelCase format
 * @returns {Object} - Expenses in snake_case format
 */
export const formatExpensesToDatabase = (expenses) => {
    if (!expenses) return {};

    return {
        police_fee: expenses.policeFee || 0,
        toll_fee: expenses.tollFee || 0,
        food_fee: expenses.foodFee || 0,
        gas_money: expenses.gasMoney || 0,
        mechanic_fee: expenses.mechanicFee || 0
    };
};

/**
 * Format expenses from snake_case (database) to camelCase (frontend)
 * @param {Object} expenses - Expenses in snake_case format
 * @returns {Object} - Expenses in camelCase format
 */
export const formatExpensesToFrontend = (expenses) => {
    if (!expenses) return {};

    return {
        policeFee: expenses.police_fee || 0,
        tollFee: expenses.toll_fee || 0,
        foodFee: expenses.food_fee || 0,
        gasMoney: expenses.gas_money || 0,
        mechanicFee: expenses.mechanic_fee || 0
    };
};

/**
 * Calculate total expenses for a trip
 * @param {Object} expenses - Trip expenses object
 * @returns {number} - Total expenses
 */
export const calculateTotalExpenses = (expenses) => {
    if (!expenses) return 0;

    // Handle both camelCase (frontend) and snake_case (database) formats
    const policeFee = expenses.policeFee || expenses.police_fee || 0;
    const tollFee = expenses.tollFee || expenses.toll_fee || 0;
    const foodFee = expenses.foodFee || expenses.food_fee || 0;
    const gasMoney = expenses.gasMoney || expenses.gas_money || 0;
    const mechanicFee = expenses.mechanicFee || expenses.mechanic_fee || 0;

    return policeFee + tollFee + foodFee + gasMoney + mechanicFee;
};

/**
 * Get severity class for trip status
 * @param {string} status - Trip status
 * @returns {string} - Severity class
 */
export const getStatusSeverity = (status) => {
    switch (status) {
        case 'PENDING':
            return 'secondary';
        case 'WAITING_FOR_PRICE':
            return 'info';
        case 'PRICED':
            return 'success';
        default:
            return 'info';
    }
};

/**
 * Validate trip distance
 * @param {number} distance - Trip distance
 * @param {Object} options - Validation options
 * @param {Object} options.value - Object to store validation errors
 * @returns {boolean} - Is valid
 */
export const validateDistance = (distance, options = {}) => {
    const isValid = distance > 0;

    if (!isValid && options.value) {
        options.value.distance = 'Khoảng cách phải lớn hơn 0';
    }

    return isValid;
};

/**
 * Get trips by status
 * @param {string} status - Trip status
 * @returns {Promise<Array>} - Array of trips
 */
export const getTripsByStatus = async (status) => {
    try {
        const { data, error } = await supabase.from('trips').select(TRIP_SELECT_WITH_RELATIONS).eq('status', status).order('trip_date', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error getting trips with status ${status}:`, error);
        throw error;
    }
};

/**
 * Get trips by customer ID
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} - Array of trips
 */
export const getTripsByCustomerId = async (customerId) => {
    try {
        const { data, error } = await supabase.from('trips').select(TRIP_SELECT_WITH_RELATIONS).eq('customer_id', customerId).order('trip_date', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error getting trips for customer ${customerId}:`, error);
        throw error;
    }
};

/**
 * Create a new trip
 * @param {Object} tripData - Trip data
 * @returns {Promise<Object>} - Created trip
 */
export const createTrip = async (tripData) => {
    try {
        // Validate required fields
        if (!tripData.startingPoint) throw new Error('Starting point is required');
        if (!tripData.endingPoint) throw new Error('Ending point is required');
        if (!validateDistance(tripData.distance)) throw new Error('Distance must be greater than 0');

        // Format data for PostgreSQL
        const formattedData = {
            customer_id: tripData.customerId,
            vehicle_id: tripData.vehicleId,
            driver_id: tripData.driverId,
            assistant_id: tripData.assistantId,
            starting_point: tripData.startingPoint,
            ending_point: tripData.endingPoint,
            distance: tripData.distance,
            trip_date: tripData.tripDate ? new Date(tripData.tripDate).toISOString() : null,
            status: tripData.status || 'PENDING',
            price_for_customer: tripData.priceForCustomer || tripData.price || 0,
            price_for_staff: tripData.priceForStaff || tripData.price || 0,
            expenses: formatExpensesToDatabase(tripData.expenses),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('trips').insert(formattedData).select().single();

        if (error) throw error;

        // If trip is PRICED, calculate and save wages and update customer debt
        if (data.status === 'PRICED') {
            await saveWagesForTrip(data);
            await updateCustomerDebtForTrip(data);
        }

        return data;
    } catch (error) {
        console.error('Error creating trip:', error);
        throw error;
    }
};

/**
 * Update a trip
 * @param {string} tripId - Trip ID
 * @param {Object} tripData - Updated trip data
 * @returns {Promise<Object>} - Updated trip
 */
export const updateTrip = async (tripId, tripData) => {
    try {
        // Get the current trip status and price before update
        const { data: currentTrip, error: fetchError } = await supabase.from('trips').select('status, price_for_customer, price_for_staff, driver_id, assistant_id').eq('id', tripId).single();

        if (fetchError) throw fetchError;

        const oldStatus = currentTrip.status;
        const oldPriceForCustomer = currentTrip.price_for_customer;
        const oldPriceForStaff = currentTrip.price_for_staff;
        const oldDriverId = currentTrip.driver_id;
        const oldAssistantId = currentTrip.assistant_id;

        // Format data for PostgreSQL
        const formattedData = {};

        // Only include fields that are provided in tripData
        if (tripData.customerId !== undefined) formattedData.customer_id = tripData.customerId;
        if (tripData.vehicleId !== undefined) formattedData.vehicle_id = tripData.vehicleId;
        if (tripData.driverId !== undefined) formattedData.driver_id = tripData.driverId;
        if (tripData.assistantId !== undefined) formattedData.assistant_id = tripData.assistantId;
        if (tripData.startingPoint !== undefined) formattedData.starting_point = tripData.startingPoint;
        if (tripData.endingPoint !== undefined) formattedData.ending_point = tripData.endingPoint;
        if (tripData.distance !== undefined) formattedData.distance = tripData.distance;
        if (tripData.tripDate !== undefined) formattedData.trip_date = tripData.tripDate ? new Date(tripData.tripDate).toISOString() : null;
        if (tripData.status !== undefined) formattedData.status = tripData.status;
        if (tripData.priceForCustomer !== undefined) formattedData.price_for_customer = tripData.priceForCustomer || 0;
        if (tripData.priceForStaff !== undefined) formattedData.price_for_staff = tripData.priceForStaff || 0;
        // For backward compatibility
        if (tripData.price !== undefined && tripData.priceForCustomer === undefined && tripData.priceForStaff === undefined) {
            formattedData.price_for_customer = tripData.price || 0;
            formattedData.price_for_staff = tripData.price || 0;
        }

        // Only update expenses if provided
        if (tripData.expenses) {
            formattedData.expenses = formatExpensesToDatabase(tripData.expenses);
        }

        // Always update the updated_at timestamp
        formattedData.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('trips').update(formattedData).eq('id', tripId).select().single();

        if (error) throw error;

        // Determine if we need to recalculate wages and update customer debt
        const statusChanged = data.status === 'PRICED' && oldStatus !== 'PRICED';
        const priceForCustomerChanged = data.status === 'PRICED' && data.price_for_customer !== oldPriceForCustomer;
        const priceForStaffChanged = data.status === 'PRICED' && data.price_for_staff !== oldPriceForStaff;
        const staffChanged = data.status === 'PRICED' && (data.driver_id !== oldDriverId || data.assistant_id !== oldAssistantId);

        if (statusChanged || priceForCustomerChanged || priceForStaffChanged || staffChanged) {
            await saveWagesForTrip(data);
            await updateCustomerDebtForTrip(data);
        }

        return data;
    } catch (error) {
        console.error(`Error updating trip ${tripId}:`, error);
        throw error;
    }
};

/**
 * Delete a trip
 * @param {string} tripId - Trip ID
 * @returns {Promise<void>}
 */
export const deleteTrip = async (tripId) => {
    try {
        const { error } = await supabase.from('trips').delete().eq('id', tripId);

        if (error) throw error;
    } catch (error) {
        console.error(`Error deleting trip ${tripId}:`, error);
        throw error;
    }
};

/**
 * Approve a trip (change status to WAITING_FOR_PRICE)
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Updated trip
 */
export const approveTrip = async (tripId) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .update({
                status: 'WAITING_FOR_PRICE',
                updated_at: new Date().toISOString()
            })
            .eq('id', tripId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error approving trip ${tripId}:`, error);
        throw error;
    }
};

/**
 * Set price for a trip (change status to PRICED)
 * @param {string} tripId - Trip ID
 * @param {number} priceForCustomer - Trip price for customer
 * @param {number} priceForStaff - Trip price for staff wage calculation (optional, defaults to priceForCustomer)
 * @returns {Promise<Object>} - Updated trip
 */
export const setPriceForTrip = async (tripId, priceForCustomer, priceForStaff = null) => {
    try {
        // Validate price
        if (!priceForCustomer || priceForCustomer <= 0) {
            throw new Error('Price for customer must be greater than 0');
        }

        // If priceForStaff is not provided, use priceForCustomer
        const finalPriceForStaff = priceForStaff !== null ? priceForStaff : priceForCustomer;

        // Get the trip with related data for wage calculation
        const { data, error } = await supabase
            .from('trips')
            .update({
                status: 'PRICED',
                price_for_customer: priceForCustomer,
                price_for_staff: finalPriceForStaff,
                updated_at: new Date().toISOString()
            })
            .eq('id', tripId)
            .select(TRIP_SELECT_WITH_RELATIONS)
            .single();

        if (error) throw error;

        // Calculate and save wages and update customer debt
        await saveWagesForTrip(data);
        await updateCustomerDebtForTrip(data);

        return data;
    } catch (error) {
        console.error(`Error setting price for trip ${tripId}:`, error);
        throw error;
    }
};

/**
 * Composable for trip list functionality
 * @param {string} statusFilter - Initial status filter
 * @returns {Object} - Trip list functionality
 */
export const useTripList = (statusFilter = '') => {
    const filteredTrips = ref([]);
    const loading = ref(false);
    const approvingTripId = ref(null);

    // Filter values
    const driverFilterValue = ref(null);
    const assistantFilterValue = ref(null);
    const customerFilterValue = ref(null);
    const vehicleLicenseNumberFilter = ref(null);
    const startDateFilter = ref(null);
    const endDateFilter = ref(null);

    // Lists for dropdowns
    const staffList = ref([]);
    const customerList = ref([]);
    const vehicleList = ref([]);

    // Fetch trips based on status
    const fetchTrips = async () => {
        loading.value = true;
        try {
            let query;

            if (statusFilter === 'PENDING') {
                // Fetch only pending trips
                query = supabase.from('trips').select(TRIP_SELECT_WITH_RELATIONS).eq('status', 'PENDING');
            } else if (statusFilter === 'NON_PENDING') {
                // Fetch waiting for price and priced trips
                query = supabase.from('trips').select(TRIP_SELECT_WITH_RELATIONS).or('status.eq.WAITING_FOR_PRICE,status.eq.PRICED');
            } else {
                // Fetch all trips
                query = supabase.from('trips').select(TRIP_SELECT_WITH_RELATIONS);
            }

            // Apply filters if they exist
            if (driverFilterValue.value) {
                query = query.eq('driver_id', driverFilterValue.value);
            }

            if (assistantFilterValue.value) {
                query = query.eq('assistant_id', assistantFilterValue.value);
            }

            if (customerFilterValue.value) {
                query = query.eq('customer_id', customerFilterValue.value);
            }

            if (vehicleLicenseNumberFilter.value) {
                query = query.eq('vehicle_id', vehicleLicenseNumberFilter.value);
            }

            if (startDateFilter.value) {
                const startDate = new Date(startDateFilter.value);
                startDate.setHours(0, 0, 0, 0);
                query = query.gte('trip_date', startDate.toISOString());
            }

            if (endDateFilter.value) {
                const endDate = new Date(endDateFilter.value);
                endDate.setHours(23, 59, 59, 999);
                query = query.lte('trip_date', endDate.toISOString());
            }

            // Order by trip date (newest first)
            query = query.order('trip_date', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;

            // Transform data to match the expected format
            filteredTrips.value = data.map((trip) => ({
                id: trip.id,
                customerId: trip.customer_id,
                vehicleId: trip.vehicle_id,
                driverId: trip.driver_id,
                assistantId: trip.assistant_id,
                startingPoint: trip.starting_point,
                endingPoint: trip.ending_point,
                distance: trip.distance,
                tripDate: trip.trip_date,
                status: trip.status,
                price: trip.price,
                expenses: formatExpensesToFrontend(trip.expenses),
                // Add derived fields
                customerDisplayName: trip.customers?.company_name || trip.customers?.representative_name || 'Unknown',
                vehicleLicenseNumber: trip.vehicles?.license_number || 'Unknown',
                driverName: trip.driver?.full_name || 'Unknown',
                assistantDriverName: trip.assistant?.full_name || 'Unknown',
                createdAt: trip.created_at,
                updatedAt: trip.updated_at
            }));
        } catch (error) {
            console.error('Error fetching trips:', error);
        } finally {
            loading.value = false;
        }
    };

    // Fetch staff for dropdown
    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase.from('staff').select('id, full_name, short_name').order('full_name');

            if (error) throw error;

            staffList.value = data.map((staff) => ({
                value: staff.id,
                label: staff.full_name
            }));
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    // Fetch customers for dropdown
    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase.from('customers').select('id, company_name, representative_name').order('company_name');

            if (error) throw error;

            customerList.value = data.map((customer) => ({
                value: customer.id,
                label: customer.company_name || customer.representative_name
            }));
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    // Fetch vehicles for dropdown
    const fetchVehicles = async () => {
        try {
            const { data, error } = await supabase.from('vehicles').select('id, license_number').order('license_number');

            if (error) throw error;

            vehicleList.value = data.map((vehicle) => ({
                value: vehicle.id,
                label: vehicle.license_number
            }));
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        }
    };

    // Approve a trip
    const handleApproveTrip = async (tripId) => {
        approvingTripId.value = tripId;
        try {
            await approveTrip(tripId);
            await fetchTrips();
        } catch (error) {
            console.error('Error approving trip:', error);
        } finally {
            approvingTripId.value = null;
        }
    };

    // Set price for a trip
    const handleSetPriced = async (tripId, priceForCustomer, priceForStaff = null) => {
        try {
            // Validate price
            if (!priceForCustomer || priceForCustomer <= 0) {
                throw new Error('Price for customer must be greater than 0');
            }

            // Set price and calculate wages
            const updatedTrip = await setPriceForTrip(tripId, priceForCustomer, priceForStaff);

            // Refresh trip list
            await fetchTrips();

            // Return success with wage information
            const driverWage = updatedTrip.driver_id ? calculateDriverWage(updatedTrip) : 0;
            const assistantWage = updatedTrip.assistant_id ? calculateAssistantWage(updatedTrip) : 0;

            return {
                success: true,
                message: 'Trip price set and wages calculated successfully',
                driverWage,
                assistantWage,
                trip: updatedTrip
            };
        } catch (error) {
            console.error('Error setting price for trip:', error);
            throw error;
        }
    };

    // Watch for filter changes
    watch([driverFilterValue, assistantFilterValue, customerFilterValue, vehicleLicenseNumberFilter, startDateFilter, endDateFilter], () => {
        fetchTrips();
    });

    return {
        filteredTrips,
        loading,
        driverFilterValue,
        assistantFilterValue,
        customerFilterValue,
        vehicleLicenseNumberFilter,
        startDateFilter,
        endDateFilter,
        staffList,
        customerList,
        vehicleList,
        approvingTripId,
        fetchData: {
            trips: fetchTrips,
            staff: fetchStaff,
            customers: fetchCustomers,
            vehicles: fetchVehicles
        },
        approveTrip: handleApproveTrip,
        setPriced: handleSetPriced
    };
};

/**
 * Composable for trip edit functionality
 * @param {string} tripId - Trip ID
 * @returns {Object} - Trip edit functionality
 */
export const useTripEdit = (tripId) => {
    // Initialize trip with default values to prevent null reference errors
    const trip = ref({
        customerId: null,
        vehicleId: null,
        driverId: null,
        assistantId: null,
        startingPoint: '',
        endingPoint: '',
        distance: 0,
        tripDate: new Date(),
        status: 'PENDING',
        price: 0,
        expenses: {
            policeFee: 0,
            tollFee: 0,
            foodFee: 0,
            gasMoney: 0,
            mechanicFee: 0
        }
    });
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);

    // Lists for dropdowns
    const staffList = ref([]);
    const customerList = ref([]);
    const vehicleList = ref([]);

    // Fetch trip data
    const fetchTrip = async () => {
        loading.value = true;
        error.value = null;

        try {
            const { data, error: fetchError } = await supabase.from('trips').select(TRIP_SELECT_WITH_RELATIONS).eq('id', tripId).single();

            if (fetchError) throw fetchError;

            // Transform data to match the expected format
            trip.value = {
                id: data.id,
                customerId: data.customer_id,
                vehicleId: data.vehicle_id,
                driverId: data.driver_id,
                assistantId: data.assistant_id,
                startingPoint: data.starting_point,
                endingPoint: data.ending_point,
                distance: data.distance,
                tripDate: data.trip_date,
                status: data.status,
                price: data.price,
                expenses: formatExpensesToFrontend(data.expenses),
                // Add derived fields
                customerDisplayName: data.customers?.company_name || data.customers?.representative_name || 'Unknown',
                vehicleLicenseNumber: data.vehicles?.license_number || 'Unknown',
                driverName: data.driver?.full_name || 'Unknown',
                assistantDriverName: data.assistant?.full_name || 'Unknown',
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } catch (err) {
            console.error('Error fetching trip:', err);
            error.value = 'Failed to load trip data';
        } finally {
            loading.value = false;
        }
    };

    // Fetch staff for dropdown
    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase.from('staff').select('id, full_name, short_name').order('full_name');

            if (error) throw error;

            staffList.value = data.map((staff) => ({
                value: staff.id,
                label: staff.full_name
            }));
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    // Fetch customers for dropdown
    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase.from('customers').select('id, company_name, representative_name').order('company_name');

            if (error) throw error;

            customerList.value = data.map((customer) => ({
                value: customer.id,
                label: customer.company_name || customer.representative_name
            }));
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    // Fetch vehicles for dropdown
    const fetchVehicles = async () => {
        try {
            const { data, error } = await supabase.from('vehicles').select('id, license_number').order('license_number');

            if (error) throw error;

            vehicleList.value = data.map((vehicle) => ({
                value: vehicle.id,
                label: vehicle.license_number
            }));
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        }
    };

    // Save trip changes
    const saveTrip = async () => {
        saving.value = true;
        error.value = null;

        try {
            if (!trip.value) throw new Error('No trip data to save');

            await updateTrip(tripId, trip.value);

            return true;
        } catch (err) {
            console.error('Error saving trip:', err);
            error.value = 'Failed to save trip data';
            return false;
        } finally {
            saving.value = false;
        }
    };

    // Initialize data
    onMounted(() => {
        fetchTrip();
        fetchStaff();
        fetchCustomers();
        fetchVehicles();
    });

    return {
        tripData: trip,
        loading,
        saving,
        errorMessage: error,
        deleteDialog: ref(false),
        submitted: ref(false),
        validationErrors: ref({}),
        staffList,
        customerList,
        vehicles: vehicleList,
        router: { push: (path) => (window.location.href = path) },
        fetchData: {
            tripData: fetchTrip,
            vehicles: fetchVehicles,
            staff: fetchStaff,
            customers: fetchCustomers
        },
        deleteTrip: async () => {
            try {
                // Call the deleteTrip function directly
                await supabase.from('trips').delete().eq('id', tripId);
                window.location.href = import.meta.env.BASE_URL + 'trip/list';
                return true;
            } catch (err) {
                error.value = 'Failed to delete trip';
                return false;
            }
        },
        updateTrip: async () => {
            const result = await saveTrip();
            if (result) {
                window.location.href = import.meta.env.BASE_URL + 'trip/list';
            }
            return result;
        }
    };
};

/**
 * Composable for trip add functionality
 * @returns {Object} - Trip add functionality
 */
export const useTripAdd = () => {
    const trip = ref({
        customerId: null,
        vehicleId: null,
        driverId: null,
        assistantId: null,
        startingPoint: '',
        endingPoint: '',
        distance: 0,
        tripDate: new Date(),
        status: 'PENDING',
        price: 0,
        expenses: {
            policeFee: 0,
            tollFee: 0,
            foodFee: 0,
            gasMoney: 0,
            mechanicFee: 0
        }
    });

    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);

    // Lists for dropdowns
    const staffList = ref([]);
    const customerList = ref([]);
    const vehicleList = ref([]);

    // Fetch staff for dropdown
    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase.from('staff').select('id, full_name, short_name').order('full_name');

            if (error) throw error;

            staffList.value = data.map((staff) => ({
                value: staff.id,
                label: staff.full_name
            }));
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    // Fetch customers for dropdown
    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase.from('customers').select('id, company_name, representative_name').order('company_name');

            if (error) throw error;

            customerList.value = data.map((customer) => ({
                value: customer.id,
                label: customer.company_name || customer.representative_name
            }));
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    // Fetch vehicles for dropdown
    const fetchVehicles = async () => {
        try {
            const { data, error } = await supabase.from('vehicles').select('id, license_number').order('license_number');

            if (error) throw error;

            vehicleList.value = data.map((vehicle) => ({
                value: vehicle.id,
                label: vehicle.license_number
            }));
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        }
    };

    // Save new trip
    const saveTrip = async () => {
        saving.value = true;
        error.value = null;

        try {
            const result = await createTrip(trip.value);

            // Reset form after successful save
            trip.value = {
                customerId: null,
                vehicleId: null,
                driverId: null,
                assistantId: null,
                startingPoint: '',
                endingPoint: '',
                distance: 0,
                tripDate: new Date(),
                status: 'PENDING',
                price: 0,
                expenses: {
                    policeFee: 0,
                    tollFee: 0,
                    foodFee: 0,
                    gasMoney: 0,
                    mechanicFee: 0
                }
            };

            return result;
        } catch (err) {
            console.error('Error saving trip:', err);
            error.value = 'Failed to save trip data';
            return null;
        } finally {
            saving.value = false;
        }
    };

    // Initialize data
    onMounted(() => {
        fetchStaff();
        fetchCustomers();
        fetchVehicles();
    });

    return {
        tripData: trip,
        loading,
        saving,
        errorMessage: error,
        submitted: ref(false),
        validationErrors: ref({}),
        staffList,
        customerList,
        vehicles: vehicleList,
        fetchData: {
            vehicles: fetchVehicles,
            staff: fetchStaff,
            customers: fetchCustomers
        },
        createTrip: async (successCallback) => {
            loading.value = true;
            error.value = null;
            
            try {
                // Client-side validation
                const validationErrors = {};
                let isValid = true;
                
                if (!trip.value.startingPoint) {
                    validationErrors.startingPoint = 'Điểm xuất phát là bắt buộc';
                    isValid = false;
                }
                
                if (!trip.value.endingPoint) {
                    validationErrors.endingPoint = 'Điểm đến là bắt buộc';
                    isValid = false;
                }
                
                if (!trip.value.distance || trip.value.distance <= 0) {
                    validationErrors.distance = 'Quãng đường phải lớn hơn 0';
                    isValid = false;
                }
                
                if (!trip.value.driverId) {
                    validationErrors.driverId = 'Tài xế là bắt buộc';
                    isValid = false;
                }
                
                if (!trip.value.customerId) {
                    validationErrors.customerId = 'Khách hàng là bắt buộc';
                    isValid = false;
                }
                
                if (!trip.value.vehicleId) {
                    validationErrors.vehicleId = 'Biển số xe là bắt buộc';
                    isValid = false;
                }
                
                // If validation fails, throw error
                if (!isValid) {
                    throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
                }
                
                const result = await saveTrip();
                
                if (result) {
                    // If a success callback is provided, call it (for public pages)
                    if (typeof successCallback === 'function') {
                        successCallback(result);
                    } else {
                        // Otherwise, redirect to the trip list page (for authenticated pages)
                        setTimeout(() => {
                            window.location.href = import.meta.env.BASE_URL + 'trip/list';
                        }, 500);
                    }
                }
                return result;
            } catch (err) {
                console.error('Error creating trip:', err);
                error.value = err.message || 'Đã xảy ra lỗi khi lưu chuyến đi';
                throw err;
            } finally {
                loading.value = false;
            }
        }
    };
};
