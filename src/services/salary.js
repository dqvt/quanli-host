import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Constants for salary calculation
const DRIVER_SALARY_PERCENTAGE = 0.15; // 15% of trip price for driver
const ASSISTANT_SALARY_PERCENTAGE = 0.05; // 5% of trip price for assistant

/**
 * Get all trips for a specific staff member (as driver or assistant)
 * @param {string} staffId - Staff ID
 * @returns {Promise<Array>} - Array of trips
 */
export const getStaffTrips = async (staffId) => {
    try {
        // Get trips where staff is driver
        const driverTripsQuery = query(collection(db, 'trips'), where('driverId', '==', staffId));

        const driverTripsSnapshot = await getDocs(driverTripsQuery);

        const driverTrips = driverTripsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            role: 'driver'
        }));

        // Get trips where staff is assistant
        const assistantTripsQuery = query(collection(db, 'trips'), where('assistantDriverId', '==', staffId));

        const assistantTripsSnapshot = await getDocs(assistantTripsQuery);

        const assistantTrips = assistantTripsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            role: 'assistant'
        }));

        // Combine and sort by date (newest first)
        const allTrips = [...driverTrips, ...assistantTrips].sort((a, b) => {
            const dateA = a.tripDate ? new Date(a.tripDate) : new Date(0);
            const dateB = b.tripDate ? new Date(b.tripDate) : new Date(0);
            return dateB - dateA;
        });

        return allTrips;
    } catch (error) {
        console.error('Error getting staff trips:', error);
        throw error;
    }
};

/**
 * Calculate salary for a trip based on staff role
 * @param {Object} trip - Trip data
 * @param {string} role - Staff role ('driver' or 'assistant')
 * @returns {number} - Calculated salary
 */
export const calculateTripSalary = (trip, role) => {
    if (!trip.price || trip.price <= 0 || trip.status !== 'PRICED') {
        return 0;
    }

    const percentage = role === 'driver' ? DRIVER_SALARY_PERCENTAGE : ASSISTANT_SALARY_PERCENTAGE;
    return Math.round(trip.price * percentage);
};

/**
 * Group trips by month and year
 * @param {Array} trips - Array of trips
 * @param {Array} adjustments - Array of salary adjustments
 * @returns {Object} - Trips grouped by month and year
 */
export const groupTripsByMonth = (trips, adjustments = []) => {
    const groupedTrips = {};

    // First, process all trips
    trips.forEach((trip) => {
        if (!trip.tripDate) return;

        const tripDate = new Date(trip.tripDate);
        const year = tripDate.getFullYear();
        const month = tripDate.getMonth() + 1; // JavaScript months are 0-indexed

        const key = `${year}-${month.toString().padStart(2, '0')}`;

        if (!groupedTrips[key]) {
            groupedTrips[key] = {
                year,
                month,
                trips: [],
                totalSalary: 0,
                adjustment: 0,
                adjustmentReason: '',
                finalSalary: 0,
                displayName: `${month.toString().padStart(2, '0')}/${year}`
            };
        }

        const salary = calculateTripSalary(trip, trip.role);
        trip.salary = salary;

        groupedTrips[key].trips.push(trip);
        groupedTrips[key].totalSalary += salary;
    });

    // Then, apply any adjustments
    if (adjustments && adjustments.length > 0) {
        adjustments.forEach((adjustment) => {
            const { year, month, adjustmentAmount, reason } = adjustment;
            const key = `${year}-${month.toString().padStart(2, '0')}`;

            if (groupedTrips[key]) {
                groupedTrips[key].adjustment = adjustmentAmount;
                groupedTrips[key].adjustmentReason = reason;
            } else {
                // Create an entry even if there are no trips for this month
                groupedTrips[key] = {
                    year,
                    month,
                    trips: [],
                    totalSalary: 0,
                    adjustment: adjustmentAmount,
                    adjustmentReason: reason,
                    finalSalary: adjustmentAmount,
                    displayName: `${month.toString().padStart(2, '0')}/${year}`
                };
            }
        });
    }

    // Calculate final salary for each month (base salary + adjustment)
    Object.values(groupedTrips).forEach((monthData) => {
        monthData.finalSalary = monthData.totalSalary + (monthData.adjustment || 0);
    });

    // Convert to array and sort by date (newest first)
    return Object.values(groupedTrips).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
};

/**
 * Calculate total salary for all trips and adjustments
 * @param {Array} trips - Array of trips
 * @param {Array} adjustments - Array of salary adjustments
 * @returns {number} - Total salary
 */
export const calculateTotalSalary = (trips, adjustments = []) => {
    // Calculate base salary from trips
    const baseSalary = trips.reduce((total, trip) => {
        return total + calculateTripSalary(trip, trip.role);
    }, 0);

    // Add adjustments
    const totalAdjustments = adjustments.reduce((total, adjustment) => {
        return total + (adjustment.adjustmentAmount || 0);
    }, 0);

    return baseSalary + totalAdjustments;
};

/**
 * Format currency amount to Vietnamese format
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted amount
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
};

/**
 * Save a salary adjustment for a staff member for a specific month
 * @param {string} staffId - Staff ID
 * @param {string} staffName - Staff name
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {number} adjustmentAmount - Adjustment amount (can be positive or negative)
 * @param {string} reason - Reason for adjustment
 * @returns {Promise<void>}
 */
export const saveSalaryAdjustment = async (staffId, staffName, year, month, adjustmentAmount, reason) => {
    try {
        // Create a document ID using staffId, year, and month
        const adjustmentId = `${staffId}_${year}_${month}`;

        // Check if an adjustment already exists for this month
        const adjustmentRef = doc(db, 'salaryAdjustments', adjustmentId);
        const adjustmentDoc = await getDoc(adjustmentRef);

        if (adjustmentDoc.exists()) {
            // Update existing adjustment
            await updateDoc(adjustmentRef, {
                adjustmentAmount,
                reason,
                updatedAt: serverTimestamp()
            });
        } else {
            // Create new adjustment
            await setDoc(adjustmentRef, {
                staffId,
                staffName,
                year,
                month,
                adjustmentAmount,
                reason,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error saving salary adjustment:', error);
        throw error;
    }
};

/**
 * Get salary adjustment for a staff member for a specific month
 * @param {string} staffId - Staff ID
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object|null>} - Adjustment data or null if not found
 */
export const getSalaryAdjustment = async (staffId, year, month) => {
    try {
        const adjustmentId = `${staffId}_${year}_${month}`;
        const adjustmentRef = doc(db, 'salaryAdjustments', adjustmentId);
        const adjustmentDoc = await getDoc(adjustmentRef);

        if (adjustmentDoc.exists()) {
            return { id: adjustmentDoc.id, ...adjustmentDoc.data() };
        }

        return null;
    } catch (error) {
        console.error('Error getting salary adjustment:', error);
        throw error;
    }
};

/**
 * Get all salary adjustments for a staff member
 * @param {string} staffId - Staff ID
 * @returns {Promise<Array>} - Array of adjustments
 */
export const getStaffSalaryAdjustments = async (staffId) => {
    try {
        const adjustmentsQuery = query(collection(db, 'salaryAdjustments'), where('staffId', '==', staffId));

        const adjustmentsSnapshot = await getDocs(adjustmentsQuery);

        return adjustmentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting staff salary adjustments:', error);
        throw error;
    }
};
