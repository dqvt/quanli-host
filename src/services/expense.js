import { db } from '@/config/firebase';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import * as balanceService from './balance';

/**
 * Create a new expense record and update staff balance
 * @param {number} amount - Expense amount (positive value)
 * @param {Date} createdDate - Date of the expense
 * @param {string} reason - Reason for the expense
 * @param {string} staffFullName - Full name of the staff
 * @param {string} staffId - ID of the staff
 * @param {string} tripId - ID of the trip (optional)
 * @param {string} description - Additional description (optional)
 * @returns {Promise<Object>} - The created expense document
 */
export const createExpense = async (amount, createdDate, reason, staffFullName, staffId, tripId = null, description = '') => {
    try {
        // Validate inputs
        if (amount === null || amount === undefined) throw new Error('Amount is required');
        if (!createdDate) throw new Error('Created date is required');
        if (!reason) throw new Error('Reason is required');
        if (!staffFullName) throw new Error('Staff full name is required');
        if (!staffId) throw new Error('Staff ID is required');

        // Ensure amount is always positive
        const positiveAmount = Math.abs(amount);
        const formattedDate = createdDate instanceof Date ? createdDate : new Date(createdDate);

        // Get staff document to get the short name
        const staffDoc = await getStaffById(staffId);
        if (!staffDoc) {
            throw new Error(`Staff with ID ${staffId} not found`);
        }
        const staffShortName = staffDoc.shortName;

        // Create expense document
        const expenseData = {
            amount: positiveAmount,
            createdDate: formattedDate.toISOString(),
            reason,
            staffFullName,
            staffId,
            staffShortName,
            tripId,
            description,
            isCredit: false, // Expenses always decrease balance
            createdAt: serverTimestamp()
        };

        const expensesCollectionRef = collection(db, 'expenses');
        const docRef = await addDoc(expensesCollectionRef, expenseData);

        // Update the staff balance (decrease balance for expense)
        await balanceService.addExpense(staffShortName, positiveAmount, reason, formattedDate);

        return {
            id: docRef.id,
            ...expenseData,
            createdDate: formattedDate
        };
    } catch (error) {
        console.error('Error creating expense:', error);
        throw error;
    }
};

/**
 * Create a new expense record without updating staff balance
 * This is used for trip expenses that are not yet approved
 * @param {number} amount - Expense amount (positive value)
 * @param {Date} createdDate - Date of the expense
 * @param {string} reason - Reason for the expense
 * @param {string} staffFullName - Full name of the staff
 * @param {string} staffId - ID of the staff
 * @param {string} tripId - ID of the trip (required)
 * @param {string} description - Additional description (optional)
 * @returns {Promise<Object>} - The created expense document
 */
export const createExpenseWithoutBalanceUpdate = async (amount, createdDate, reason, staffFullName, staffId, tripId, description = '') => {
    try {
        // Validate inputs
        if (amount === null || amount === undefined) throw new Error('Amount is required');
        if (!createdDate) throw new Error('Created date is required');
        if (!reason) throw new Error('Reason is required');
        if (!staffFullName) throw new Error('Staff full name is required');
        if (!staffId) throw new Error('Staff ID is required');
        if (!tripId) throw new Error('Trip ID is required for expenses without balance update');

        // Ensure amount is always positive
        const positiveAmount = Math.abs(amount);
        const formattedDate = createdDate instanceof Date ? createdDate : new Date(createdDate);

        // Get staff document to get the short name
        const staffDoc = await getStaffById(staffId);
        if (!staffDoc) {
            throw new Error(`Staff with ID ${staffId} not found`);
        }
        const staffShortName = staffDoc.shortName;

        // Create expense document
        const expenseData = {
            amount: positiveAmount,
            createdDate: formattedDate.toISOString(),
            reason,
            staffFullName,
            staffId,
            staffShortName,
            tripId,
            description,
            isCredit: false, // Expenses always decrease balance
            balanceUpdated: false, // Flag to indicate balance has not been updated yet
            createdAt: serverTimestamp()
        };

        const expensesCollectionRef = collection(db, 'expenses');
        const docRef = await addDoc(expensesCollectionRef, expenseData);

        return {
            id: docRef.id,
            ...expenseData,
            createdDate: formattedDate
        };
    } catch (error) {
        console.error('Error creating expense without balance update:', error);
        throw error;
    }
};

/**
 * Get all expenses for a staff member
 * @param {string} staffId - ID of the staff
 * @returns {Promise<Array>} - Array of expense documents
 */
export const getExpensesByStaffId = async (staffId) => {
    try {
        if (!staffId) throw new Error('Staff ID is required');

        const expensesCollection = collection(db, 'expenses');
        const expensesQuery = query(expensesCollection, where('staffId', '==', staffId));
        const expensesSnapshot = await getDocs(expensesQuery);

        const expenses = [];
        expensesSnapshot.forEach((doc) => {
            const data = doc.data();
            expenses.push({
                id: doc.id,
                ...data,
                createdDate: data.createdDate ? new Date(data.createdDate) : null
            });
        });

        // Sort expenses by date (newest first)
        expenses.sort((a, b) => {
            if (!a.createdDate) return 1;
            if (!b.createdDate) return -1;
            return b.createdDate - a.createdDate;
        });

        return expenses;
    } catch (error) {
        console.error('Error getting expenses by staff ID:', error);
        throw error;
    }
};

/**
 * Get all expenses for a trip
 * @param {string} tripId - ID of the trip
 * @returns {Promise<Array>} - Array of expense documents
 */
export const getExpensesByTripId = async (tripId) => {
    try {
        if (!tripId) throw new Error('Trip ID is required');

        const expensesCollection = collection(db, 'expenses');
        const expensesQuery = query(expensesCollection, where('tripId', '==', tripId));
        const expensesSnapshot = await getDocs(expensesQuery);

        const expenses = [];
        expensesSnapshot.forEach((doc) => {
            const data = doc.data();
            expenses.push({
                id: doc.id,
                ...data,
                createdDate: data.createdDate ? new Date(data.createdDate) : null
            });
        });

        // Sort expenses by date (newest first)
        expenses.sort((a, b) => {
            if (!a.createdDate) return 1;
            if (!b.createdDate) return -1;
            return b.createdDate - a.createdDate;
        });

        return expenses;
    } catch (error) {
        console.error('Error getting expenses by trip ID:', error);
        throw error;
    }
};

/**
 * Get all expenses
 * @returns {Promise<Array>} - Array of all expense documents
 */
export const getAllExpenses = async () => {
    try {
        const expensesCollection = collection(db, 'expenses');
        const expensesSnapshot = await getDocs(expensesCollection);

        const expenses = [];
        expensesSnapshot.forEach((doc) => {
            const data = doc.data();
            expenses.push({
                id: doc.id,
                ...data,
                createdDate: data.createdDate ? new Date(data.createdDate) : null
            });
        });

        // Sort expenses by date (newest first)
        expenses.sort((a, b) => {
            if (!a.createdDate) return 1;
            if (!b.createdDate) return -1;
            return b.createdDate - a.createdDate;
        });

        return expenses;
    } catch (error) {
        console.error('Error getting all expenses:', error);
        throw error;
    }
};

/**
 * Get expenses summary by staff
 * @returns {Promise<Array>} - Array of staff with their expense counts and latest expenses
 */
export const getExpensesSummaryByStaff = async () => {
    try {
        // Fetch all staff members
        const staffCollection = collection(db, 'staff');
        const staffSnapshot = await getDocs(staffCollection);

        // Fetch all expenses
        const expensesCollection = collection(db, 'expenses');
        const expensesSnapshot = await getDocs(expensesCollection);

        // Create a map of expense counts and latest expenses by staff ID
        const expenseMap = {};
        expensesSnapshot.forEach((doc) => {
            const data = doc.data();
            const staffId = data.staffId;

            if (!expenseMap[staffId]) {
                expenseMap[staffId] = {
                    count: 0,
                    expenses: []
                };
            }

            expenseMap[staffId].count++;
            expenseMap[staffId].expenses.push({
                id: doc.id,
                ...data,
                createdDate: data.createdDate ? new Date(data.createdDate) : null
            });
        });

        // Sort expenses by date (newest first) for each staff member
        Object.keys(expenseMap).forEach((staffId) => {
            expenseMap[staffId].expenses.sort((a, b) => {
                if (!a.createdDate) return 1;
                if (!b.createdDate) return -1;
                return b.createdDate - a.createdDate;
            });
        });

        // Create staff expense summary list
        const staffExpenseSummary = [];
        for (const staffDoc of staffSnapshot.docs) {
            const staffData = staffDoc.data();
            const staffId = staffDoc.id;

            // Get expense data if it exists, otherwise create default
            const expenseData = expenseMap[staffId] || {
                count: 0,
                expenses: []
            };

            // Get the latest 3 expenses
            const latestExpenses = expenseData.expenses.slice(0, 3);

            staffExpenseSummary.push({
                id: staffId,
                ...staffData,
                expenseCount: expenseData.count,
                latestExpenses: latestExpenses
            });
        }

        return staffExpenseSummary;
    } catch (error) {
        console.error('Error getting expenses summary by staff:', error);
        throw error;
    }
};

/**
 * Get staff document by ID
 * @param {string} staffId - Staff ID
 * @returns {Promise<Object|null>} - Staff document or null if not found
 */
export const getStaffById = async (staffId) => {
    try {
        if (!staffId) throw new Error('Staff ID is required');

        const staffDocRef = doc(db, 'staff', staffId);
        const staffDoc = await getDoc(staffDocRef);

        if (!staffDoc.exists()) {
            return null;
        }

        return {
            id: staffDoc.id,
            ...staffDoc.data()
        };
    } catch (error) {
        console.error('Error getting staff by ID:', error);
        throw error;
    }
};

/**
 * Update an expense record and update the staff balance based on the difference
 * @param {string} expenseId - ID of the expense to update
 * @param {number} newAmount - New expense amount (positive value)
 * @param {Date} createdDate - Date of the expense
 * @param {string} reason - Reason for the expense
 * @param {string} staffFullName - Full name of the staff
 * @param {string} staffId - ID of the staff
 * @param {string} tripId - ID of the trip (optional)
 * @param {string} description - Additional description (optional)
 * @returns {Promise<Object>} - The updated expense document
 */
export const updateExpenseAndBalance = async (expenseId, newAmount, createdDate, reason, staffFullName, staffId, tripId = null, description = '') => {
    try {
        // Validate inputs
        if (!expenseId) throw new Error('Expense ID is required');
        if (newAmount === null || newAmount === undefined) throw new Error('Amount is required');
        if (!createdDate) throw new Error('Created date is required');
        if (!reason) throw new Error('Reason is required');
        if (!staffFullName) throw new Error('Staff full name is required');
        if (!staffId) throw new Error('Staff ID is required');

        // Ensure amount is always positive
        const positiveNewAmount = Math.abs(newAmount);
        const formattedDate = createdDate instanceof Date ? createdDate : new Date(createdDate);

        // Get staff document to get the short name
        const staffDoc = await getStaffById(staffId);
        if (!staffDoc) {
            throw new Error(`Staff with ID ${staffId} not found`);
        }
        const staffShortName = staffDoc.shortName;

        // Get the current expense to calculate the difference
        const expenseDocRef = doc(db, 'expenses', expenseId);
        const expenseDoc = await getDoc(expenseDocRef);

        if (!expenseDoc.exists()) {
            throw new Error(`Expense with ID ${expenseId} not found`);
        }

        const currentExpenseData = expenseDoc.data();
        const currentAmount = currentExpenseData.amount || 0;

        // Calculate the difference (positive means the expense increased, negative means it decreased)
        const amountDifference = positiveNewAmount - currentAmount;

        // Update expense document
        const expenseData = {
            amount: positiveNewAmount,
            createdDate: formattedDate.toISOString(),
            reason,
            staffFullName,
            staffId,
            staffShortName,
            tripId,
            description,
            updatedAt: serverTimestamp()
        };

        await updateDoc(expenseDocRef, expenseData);

        // Only update the balance if there's a difference
        if (amountDifference !== 0) {
            // If amountDifference is positive, we need to decrease the balance more
            // If amountDifference is negative, we need to increase the balance (or decrease it less)
            if (amountDifference > 0) {
                // Expense increased, decrease balance more
                await balanceService.addExpense(staffShortName, Math.abs(amountDifference), reason, formattedDate);
            } else {
                // Expense decreased, increase balance
                await balanceService.addCredit(staffShortName, Math.abs(amountDifference), reason, formattedDate);
            }
        }

        return {
            id: expenseId,
            ...expenseData,
            createdDate: formattedDate
        };
    } catch (error) {
        console.error('Error updating expense and balance:', error);
        throw error;
    }
};
