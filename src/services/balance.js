import { db } from '@/config/firebase';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

/**
 * Add an expense transaction for a staff member
 * @param {string} staffShortName - Staff short name identifier
 * @param {number} amount - Expense amount (positive value)
 * @param {string} reason - Reason for the expense
 * @param {Date} date - Date of the expense
 * @returns {Promise<Object>} - The updated balance document
 */
export const addExpense = async (staffShortName, amount, reason, date) => {
    return updateBalance(staffShortName, amount, reason, date, false);
};

/**
 * Add a credit transaction for a staff member
 * @param {string} staffShortName - Staff short name identifier
 * @param {number} amount - Credit amount (positive value)
 * @param {string} reason - Reason for the credit
 * @param {Date} date - Date of the credit
 * @returns {Promise<Object>} - The updated balance document
 */
export const addCredit = async (staffShortName, amount, reason, date) => {
    return updateBalance(staffShortName, amount, reason, date, true);
};

/**
 * Update staff balance with a new transaction
 * @param {string} staffShortName - Staff short name identifier
 * @param {number} amount - Transaction amount (positive value)
 * @param {string} reason - Reason for the transaction
 * @param {Date} date - Date of the transaction
 * @param {boolean} isCredit - Whether this is a credit transaction
 * @returns {Promise<Object>} - The updated balance document
 */
export const updateBalance = async (staffShortName, amount, reason, date, isCredit = false) => {
    try {
        // Validate inputs
        if (!staffShortName) throw new Error('Staff short name is required');
        if (amount === null || amount === undefined) throw new Error('Amount is required');
        if (!reason) throw new Error('Reason is required');
        if (!date) throw new Error('Date is required');

        // Ensure amount is always positive
        const positiveAmount = Math.abs(amount);

        // Get staff information to get the full name
        const staffDoc = await getStaffByShortName(staffShortName);
        if (!staffDoc) {
            throw new Error(`Staff with short name ${staffShortName} not found`);
        }

        const staffFullName = staffDoc.fullName;
        const dateModified = date instanceof Date ? date : new Date(date);

        // Create or update the balance document
        const balanceCollectionRef = collection(db, 'balance');
        const balanceQuery = query(balanceCollectionRef, where('staffShortName', '==', staffShortName));
        const balanceSnapshot = await getDocs(balanceQuery);

        let currentBalance = 0;
        let balanceDocRef;
        let balanceDocId;

        // Check if balance document already exists
        if (!balanceSnapshot.empty) {
            // Update existing balance document
            balanceDocId = balanceSnapshot.docs[0].id;
            balanceDocRef = doc(db, 'balance', balanceDocId);
            const balanceData = balanceSnapshot.docs[0].data();
            currentBalance = balanceData.balance || 0;
        } else {
            // Create new balance document
            balanceDocRef = doc(collection(db, 'balance'));
            balanceDocId = balanceDocRef.id;
        }

        // Calculate new balance
        const newBalance = isCredit
            ? currentBalance + positiveAmount // Add for credit (advance payment)
            : currentBalance - positiveAmount; // Subtract for expense

        // Update balance document
        const balanceData = {
            staffShortName,
            staffFullName,
            balance: newBalance,
            dateModified: dateModified.toISOString(),
            updatedAt: serverTimestamp()
        };

        if (balanceSnapshot.empty) {
            // Create new document
            balanceData.createdAt = serverTimestamp();
            await setDoc(balanceDocRef, balanceData);
        } else {
            // Update existing document
            await updateDoc(balanceDocRef, balanceData);
        }

        return {
            id: balanceDocId,
            ...balanceData,
            dateModified: new Date(balanceData.dateModified)
        };
    } catch (error) {
        console.error('Error updating balance:', error);
        throw error;
    }
};

/**
 * Get staff document by short name
 * @param {string} shortName - Staff short name
 * @returns {Promise<Object|null>} - Staff document or null if not found
 */
async function getStaffByShortName(shortName) {
    try {
        const staffCollection = collection(db, 'staff');
        const q = query(staffCollection, where('shortName', '==', shortName));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        return {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data()
        };
    } catch (error) {
        console.error('Error getting staff by short name:', error);
        throw error;
    }
}

/**
 * Get the current balance for a staff member
 * @param {string} staffShortName - Staff short name identifier
 * @returns {Promise<Object>} - Balance information including total amount and last modification date
 */
export const getStaffBalance = async (staffShortName) => {
    try {
        if (!staffShortName) throw new Error('Staff short name is required');

        // Get balance document
        const balanceCollectionRef = collection(db, 'balance');
        const balanceQuery = query(balanceCollectionRef, where('staffShortName', '==', staffShortName));
        const balanceSnapshot = await getDocs(balanceQuery);

        let balanceData = null;
        if (!balanceSnapshot.empty) {
            balanceData = {
                id: balanceSnapshot.docs[0].id,
                ...balanceSnapshot.docs[0].data(),
                dateModified: balanceSnapshot.docs[0].data().dateModified ? new Date(balanceSnapshot.docs[0].data().dateModified) : null
            };
        } else {
            // No balance document found, create default data
            const staffDoc = await getStaffByShortName(staffShortName);
            if (!staffDoc) {
                throw new Error(`Staff with short name ${staffShortName} not found`);
            }

            balanceData = {
                staffShortName,
                staffFullName: staffDoc.fullName,
                balance: 0,
                dateModified: null
            };
        }

        // Get transaction history
        const expensesCollection = collection(db, 'expenses');
        const expensesQuery = query(expensesCollection, where('staffShortName', '==', staffShortName));
        const expensesSnapshot = await getDocs(expensesQuery);

        const transactions = [];
        expensesSnapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                ...data,
                date: data.date ? new Date(data.date) : null
            });
        });

        // Sort transactions by date (newest first)
        transactions.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date - a.date;
        });

        return {
            ...balanceData,
            transactions
        };
    } catch (error) {
        console.error('Error getting staff balance:', error);
        throw error;
    }
};

/**
 * Get balances for all staff members
 * @returns {Promise<Array>} - Array of staff balance information
 */
export const getAllStaffBalances = async () => {
    try {
        // Fetch all staff members
        const staffCollection = collection(db, 'staff');
        const staffSnapshot = await getDocs(staffCollection);

        // Fetch all balance documents
        const balanceCollection = collection(db, 'balance');
        const balanceSnapshot = await getDocs(balanceCollection);

        // Fetch all expense transactions
        const expensesCollection = collection(db, 'expenses');
        const expensesSnapshot = await getDocs(expensesCollection);

        // Create a map of balances by staff short name
        const balanceMap = {};
        balanceSnapshot.forEach((doc) => {
            const data = doc.data();
            balanceMap[data.staffShortName] = {
                id: doc.id,
                ...data,
                dateModified: data.dateModified ? new Date(data.dateModified) : null
            };
        });

        // Create a map of expense counts and latest transactions by staff short name
        const expenseMap = {};
        expensesSnapshot.forEach((doc) => {
            const data = doc.data();
            const shortName = data.staffShortName;

            if (!expenseMap[shortName]) {
                expenseMap[shortName] = {
                    count: 0,
                    transactions: []
                };
            }

            expenseMap[shortName].count++;
            expenseMap[shortName].transactions.push({
                id: doc.id,
                ...data,
                date: data.date ? new Date(data.date) : null
            });
        });

        // Sort transactions by date (newest first) for each staff member
        Object.keys(expenseMap).forEach((shortName) => {
            expenseMap[shortName].transactions.sort((a, b) => {
                if (!a.date) return 1;
                if (!b.date) return -1;
                return b.date - a.date;
            });
        });

        // Create staff balance list
        const staffBalances = [];
        for (const staffDoc of staffSnapshot.docs) {
            const staffData = staffDoc.data();
            const shortName = staffData.shortName;

            // Get balance data if it exists, otherwise create default
            const balanceData = balanceMap[shortName] || {
                balance: 0,
                dateModified: null
            };

            // Get expense data if it exists, otherwise create default
            const expenseData = expenseMap[shortName] || {
                count: 0,
                transactions: []
            };

            // Get the latest 3 transactions
            const latestTransactions = expenseData.transactions.slice(0, 3);

            staffBalances.push({
                id: staffDoc.id,
                ...staffData,
                balance: balanceData.balance || 0,
                lastModified: balanceData.dateModified,
                expenseCount: expenseData.count,
                latestTransactions: latestTransactions
            });
        }

        return staffBalances;
    } catch (error) {
        console.error('Error getting all staff balances:', error);
        throw error;
    }
};

/**
 * Update staff balance directly without creating a transaction record
 * @param {string} staffShortName - Staff short name identifier
 * @param {number} amount - Amount to add to the balance (positive value)
 * @param {string} reason - Reason for the update
 * @param {Date} date - Date of the update
 * @returns {Promise<Object>} - The updated balance document
 */
export const updateStaffBalanceDirectly = async (staffShortName, amount, reason, date) => {
    try {
        // Validate inputs
        if (!staffShortName) throw new Error('Staff short name is required');
        if (amount === null || amount === undefined) throw new Error('Amount is required');
        if (!reason) throw new Error('Reason is required');
        if (!date) throw new Error('Date is required');

        // Ensure amount is always positive
        const positiveAmount = Math.abs(amount);

        // Get staff information to get the full name
        const staffDoc = await getStaffByShortName(staffShortName);
        if (!staffDoc) {
            throw new Error(`Staff with short name ${staffShortName} not found`);
        }

        const staffFullName = staffDoc.fullName;
        const dateModified = date instanceof Date ? date : new Date(date);

        // Create or update the balance document
        const balanceCollectionRef = collection(db, 'balance');
        const balanceQuery = query(balanceCollectionRef, where('staffShortName', '==', staffShortName));
        const balanceSnapshot = await getDocs(balanceQuery);

        let currentBalance = 0;
        let balanceDocRef;
        let balanceDocId;

        // Check if balance document already exists
        if (!balanceSnapshot.empty) {
            // Update existing balance document
            balanceDocId = balanceSnapshot.docs[0].id;
            balanceDocRef = doc(db, 'balance', balanceDocId);
            const balanceData = balanceSnapshot.docs[0].data();
            currentBalance = balanceData.balance || 0;
        } else {
            // Create new balance document
            balanceDocRef = doc(collection(db, 'balance'));
            balanceDocId = balanceDocRef.id;
        }

        // Calculate new balance (always add the amount)
        const newBalance = currentBalance + positiveAmount;

        // Update balance document
        const balanceData = {
            staffShortName,
            staffFullName,
            balance: newBalance,
            dateModified: dateModified.toISOString(),
            updatedAt: serverTimestamp()
        };

        if (balanceSnapshot.empty) {
            // Create new document
            balanceData.createdAt = serverTimestamp();
            await setDoc(balanceDocRef, balanceData);
        } else {
            // Update existing document
            await updateDoc(balanceDocRef, balanceData);
        }

        return {
            id: balanceDocId,
            ...balanceData,
            dateModified: new Date(balanceData.dateModified)
        };
    } catch (error) {
        console.error('Error updating staff balance directly:', error);
        throw error;
    }
};

/**
 * Set staff balance to a specific value
 * @param {string} staffShortName - Staff short name identifier
 * @param {number} newBalance - New balance value (positive value)
 * @param {string} reason - Reason for the update
 * @param {Date} date - Date of the update
 * @returns {Promise<Object>} - The updated balance document
 */
export const setStaffBalance = async (staffShortName, newBalance, reason, date) => {
    try {
        // Validate inputs
        if (!staffShortName) throw new Error('Staff short name is required');
        if (newBalance === null || newBalance === undefined) throw new Error('New balance is required');
        if (!reason) throw new Error('Reason is required');
        if (!date) throw new Error('Date is required');

        // Ensure balance is always positive
        const positiveBalance = Math.abs(newBalance);

        // Get staff information to get the full name
        const staffDoc = await getStaffByShortName(staffShortName);
        if (!staffDoc) {
            throw new Error(`Staff with short name ${staffShortName} not found`);
        }

        const staffFullName = staffDoc.fullName;
        const dateModified = date instanceof Date ? date : new Date(date);

        // Create or update the balance document
        const balanceCollectionRef = collection(db, 'balance');
        const balanceQuery = query(balanceCollectionRef, where('staffShortName', '==', staffShortName));
        const balanceSnapshot = await getDocs(balanceQuery);

        let balanceDocRef;
        let balanceDocId;

        // Check if balance document already exists
        if (!balanceSnapshot.empty) {
            // Update existing balance document
            balanceDocId = balanceSnapshot.docs[0].id;
            balanceDocRef = doc(db, 'balance', balanceDocId);
        } else {
            // Create new balance document
            balanceDocRef = doc(collection(db, 'balance'));
            balanceDocId = balanceDocRef.id;
        }

        // Update balance document with the new balance value
        const balanceData = {
            staffShortName,
            staffFullName,
            balance: positiveBalance,
            dateModified: dateModified.toISOString(),
            updatedAt: serverTimestamp()
        };

        if (balanceSnapshot.empty) {
            // Create new document
            balanceData.createdAt = serverTimestamp();
            await setDoc(balanceDocRef, balanceData);
        } else {
            // Update existing document
            await updateDoc(balanceDocRef, balanceData);
        }

        return {
            id: balanceDocId,
            ...balanceData,
            dateModified: new Date(balanceData.dateModified)
        };
    } catch (error) {
        console.error('Error setting staff balance:', error);
        throw error;
    }
};

/**
 * Update the balance for expenses associated with a trip
 * This is used when a trip is approved and we need to update the staff balance
 * @param {string} tripId - ID of the trip
 * @returns {Promise<Array>} - Array of updated expense documents
 */
export const updateBalanceForTripExpenses = async (tripId) => {
    try {
        console.log('updateBalanceForTripExpenses called with tripId:', tripId);

        if (!tripId) throw new Error('Trip ID is required');

        const expensesCollection = collection(db, 'expenses');
        const expensesQuery = query(expensesCollection, where('tripId', '==', tripId));
        const expensesSnapshot = await getDocs(expensesQuery);

        console.log(`Found ${expensesSnapshot.size} expenses for trip ${tripId}`);

        if (expensesSnapshot.empty) {
            console.log(`No expenses found for trip ${tripId}`);
            return [];
        }

        const updatedExpenses = await Promise.all(
            expensesSnapshot.docs.map(async (expenseDoc) => {
                const expenseId = expenseDoc.id;
                const expenseData = expenseDoc.data();

                console.log('Processing expense:', { id: expenseId, ...expenseData });

                // Only update balance if it hasn't been updated before
                if (!expenseData.balanceUpdated) {
                    console.log('Expense balance not updated yet, updating now...');

                    if (!expenseData.staffShortName) {
                        console.error('Missing staffShortName in expense:', expenseId);
                        throw new Error('Missing staffShortName in expense');
                    }

                    // Update the staff balance
                    await updateBalance(
                        expenseData.staffShortName,
                        expenseData.amount,
                        expenseData.reason || 'Chi phí chuyến đi',
                        expenseData.createdDate ? new Date(expenseData.createdDate) : new Date(),
                        false // isCredit = false because this is an expense
                    );

                    // Mark the expense as having its balance updated
                    const expenseDocRef = doc(db, 'expenses', expenseId);
                    await updateDoc(expenseDocRef, {
                        balanceUpdated: true,
                        updatedAt: serverTimestamp()
                    });

                    console.log('Expense balance updated successfully');
                } else {
                    console.log('Expense balance already updated, skipping');
                }

                return {
                    id: expenseId,
                    ...expenseData,
                    balanceUpdated: true
                };
            })
        );

        console.log('All expenses updated successfully:', updatedExpenses);
        return updatedExpenses;
    } catch (error) {
        console.error('Error updating balance for trip expenses:', error);
        throw error;
    }
};
