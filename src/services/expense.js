import { db } from '@/config/firebase';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import * as balanceService from './balance';

// Constants
const EXPENSES_COLLECTION = 'expenses';

// Helper functions
const validateBaseExpenseData = (amount, createdDate, reason, staffFullName, staffId) => {
    if (amount === null || amount === undefined) throw new Error('Amount is required');
    if (!createdDate) throw new Error('Created date is required');
    if (!reason) throw new Error('Reason is required');
    if (!staffFullName) throw new Error('Staff full name is required');
    if (!staffId) throw new Error('Staff ID is required');
};

const formatExpenseDate = (date) => {
    return date instanceof Date ? date : new Date(date);
};

const getStaffById = async (staffId) => {
    const staffDoc = await getDoc(doc(db, 'staff', staffId));
    if (!staffDoc.exists()) {
        throw new Error(`Staff with ID ${staffId} not found`);
    }
    return staffDoc.data();
};

const createBaseExpenseData = (amount, formattedDate, reason, staffFullName, staffId, staffShortName, tripId, description) => ({
    amount: Math.abs(amount),
    createdDate: formattedDate.toISOString(),
    reason,
    staffFullName,
    staffId,
    staffShortName,
    tripId,
    description,
    isCredit: false,
    createdAt: serverTimestamp()
});

const formatExpenseResponse = (docId, expenseData, formattedDate) => ({
    id: docId,
    ...expenseData,
    createdDate: formattedDate
});

const sortExpensesByDate = (expenses) => {
    return expenses.sort((a, b) => {
        if (!a.createdDate) return 1;
        if (!b.createdDate) return -1;
        return b.createdDate - a.createdDate;
    });
};

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
        validateBaseExpenseData(amount, createdDate, reason, staffFullName, staffId);

        const formattedDate = formatExpenseDate(createdDate);
        const staffDoc = await getStaffById(staffId);

        const expenseData = createBaseExpenseData(amount, formattedDate, reason, staffFullName, staffId, staffDoc.shortName, tripId, description);

        const expensesCollectionRef = collection(db, EXPENSES_COLLECTION);
        const docRef = await addDoc(expensesCollectionRef, expenseData);

        // Update the staff balance
        await balanceService.addExpense(staffDoc.shortName, expenseData.amount, reason, formattedDate);

        return formatExpenseResponse(docRef.id, expenseData, formattedDate);
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
        validateBaseExpenseData(amount, createdDate, reason, staffFullName, staffId);
        if (!tripId) throw new Error('Trip ID is required for expenses without balance update');

        const formattedDate = formatExpenseDate(createdDate);
        const staffDoc = await getStaffById(staffId);

        const expenseData = {
            ...createBaseExpenseData(amount, formattedDate, reason, staffFullName, staffId, staffDoc.shortName, tripId, description),
            balanceUpdated: false
        };

        const expensesCollectionRef = collection(db, EXPENSES_COLLECTION);
        const docRef = await addDoc(expensesCollectionRef, expenseData);

        return formatExpenseResponse(docRef.id, expenseData, formattedDate);
    } catch (error) {
        console.error('Error creating expense without balance update:', error);
        throw error;
    }
};

/**
 * Get expenses with common query logic
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Array>} - Array of expense documents
 */
const getExpenses = async (queryParams = null) => {
    try {
        const expensesCollection = collection(db, EXPENSES_COLLECTION);
        const expensesQuery = queryParams ? query(expensesCollection, where(queryParams.field, '==', queryParams.value)) : query(expensesCollection);

        const expensesSnapshot = await getDocs(expensesQuery);

        const expenses = expensesSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdDate: data.createdDate ? new Date(data.createdDate) : null
            };
        });

        return sortExpensesByDate(expenses);
    } catch (error) {
        console.error('Error getting expenses:', error);
        throw error;
    }
};

/**
 * Get all expenses for a staff member
 * @param {string} staffId - ID of the staff
 * @returns {Promise<Array>} - Array of expense documents
 */
export const getExpensesByStaffId = async (staffId) => {
    if (!staffId) throw new Error('Staff ID is required');
    return getExpenses({ field: 'staffId', value: staffId });
};

/**
 * Get all expenses for a trip
 * @param {string} tripId - ID of the trip
 * @returns {Promise<Array>} - Array of expense documents
 */
export const getExpensesByTripId = async (tripId) => {
    if (!tripId) throw new Error('Trip ID is required');
    return getExpenses({ field: 'tripId', value: tripId });
};

/**
 * Get all expenses
 * @returns {Promise<Array>} - Array of all expense documents
 */
export const getAllExpenses = async () => {
    return getExpenses();
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
        if (!expenseId) throw new Error('Expense ID is required');
        validateBaseExpenseData(newAmount, createdDate, reason, staffFullName, staffId);

        const formattedDate = formatExpenseDate(createdDate);
        const staffDoc = await getStaffById(staffId);
        const expenseDocRef = doc(db, EXPENSES_COLLECTION, expenseId);
        const expenseDoc = await getDoc(expenseDocRef);

        if (!expenseDoc.exists()) {
            throw new Error(`Expense with ID ${expenseId} not found`);
        }

        const currentExpenseData = expenseDoc.data();
        const currentAmount = currentExpenseData.amount || 0;
        const amountDifference = Math.abs(newAmount) - currentAmount;

        const expenseData = {
            ...createBaseExpenseData(newAmount, formattedDate, reason, staffFullName, staffId, staffDoc.shortName, tripId, description),
            updatedAt: serverTimestamp()
        };

        await updateDoc(expenseDocRef, expenseData);

        // Update balance if there's a difference
        if (amountDifference !== 0) {
            if (amountDifference > 0) {
                await balanceService.addExpense(staffDoc.shortName, Math.abs(amountDifference), reason, formattedDate);
            } else {
                await balanceService.addCredit(staffDoc.shortName, Math.abs(amountDifference), reason, formattedDate);
            }
        }

        return formatExpenseResponse(expenseId, expenseData, formattedDate);
    } catch (error) {
        console.error('Error updating expense and balance:', error);
        throw error;
    }
};
