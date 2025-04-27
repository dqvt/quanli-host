import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';

// Constants
const CUSTOMER_DEBT_COLLECTION = 'customerDebt';
const CUSTOMER_PAYMENT_COLLECTION = 'customerPayment';

/**
 * Add or update a debt record for a customer for a specific year
 * @param {string} customerId - Customer ID
 * @param {string} customerName - Company name
 * @param {string} representativeName - Representative name
 * @param {number} year - Year of the debt
 * @param {number} amount - Debt amount
 * @returns {Promise<Object>} - The debt document
 */
export const addOrUpdateDebt = async (customerId, customerName, representativeName, year, amount) => {
    // Use representative name if company name is not provided
    const displayName = customerName || representativeName;
    try {
        // Check if debt record already exists for this customer and year
        const debtQuery = query(collection(db, CUSTOMER_DEBT_COLLECTION), where('customerId', '==', customerId), where('year', '==', year));

        const debtSnapshot = await getDocs(debtQuery);

        if (!debtSnapshot.empty) {
            // Update existing debt record
            const debtDoc = debtSnapshot.docs[0];
            const debtRef = doc(db, CUSTOMER_DEBT_COLLECTION, debtDoc.id);

            await updateDoc(debtRef, {
                amount: amount,
                updatedAt: serverTimestamp()
            });

            return {
                id: debtDoc.id,
                customerId,
                customerName,
                representativeName,
                year,
                amount
            };
        } else {
            // Create new debt record
            const debtData = {
                customerId,
                customerName: displayName,
                representativeName,
                year,
                amount,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, CUSTOMER_DEBT_COLLECTION), debtData);

            return {
                id: docRef.id,
                ...debtData
            };
        }
    } catch (error) {
        console.error('Error adding/updating debt:', error);
        throw error;
    }
};

/**
 * Add a payment record for a customer
 * @param {string} customerId - Customer ID
 * @param {string} customerName - Company name
 * @param {number} amount - Payment amount
 * @param {Date} paymentDate - Date of payment
 * @param {number} year - Year the payment applies to
 * @param {string} notes - Additional notes
 * @returns {Promise<Object>} - The payment document
 */
export const addPayment = async (customerId, customerName, amount, paymentDate, year, notes = '', representativeName = '') => {
    // Use representative name if company name is not provided
    const displayName = customerName || representativeName;
    try {
        const paymentData = {
            customerId,
            customerName: displayName,
            amount,
            paymentDate: paymentDate instanceof Date ? paymentDate : new Date(paymentDate),
            year,
            notes,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, CUSTOMER_PAYMENT_COLLECTION), paymentData);

        return {
            id: docRef.id,
            ...paymentData
        };
    } catch (error) {
        console.error('Error adding payment:', error);
        throw error;
    }
};

/**
 * Delete a payment record
 * @param {string} paymentId - Payment document ID
 * @returns {Promise<void>}
 */
export const deletePayment = async (paymentId) => {
    try {
        await deleteDoc(doc(db, CUSTOMER_PAYMENT_COLLECTION, paymentId));
    } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
    }
};

/**
 * Get all debt records for a specific customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} - Array of debt records
 */
export const getCustomerDebt = async (customerId) => {
    try {
        const debtQuery = query(collection(db, CUSTOMER_DEBT_COLLECTION), where('customerId', '==', customerId));

        const debtSnapshot = await getDocs(debtQuery);

        return debtSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting customer debt:', error);
        throw error;
    }
};

/**
 * Get all payment records for a specific customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} - Array of payment records
 */
export const getCustomerPayments = async (customerId) => {
    try {
        const paymentQuery = query(collection(db, CUSTOMER_PAYMENT_COLLECTION), where('customerId', '==', customerId));

        const paymentSnapshot = await getDocs(paymentQuery);

        return paymentSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting customer payments:', error);
        throw error;
    }
};

/**
 * Get all debt records for all customers
 * @returns {Promise<Array>} - Array of debt records
 */
export const getAllCustomerDebt = async () => {
    try {
        const debtSnapshot = await getDocs(collection(db, CUSTOMER_DEBT_COLLECTION));

        return debtSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting all customer debt:', error);
        throw error;
    }
};

/**
 * Calculate total debt for a customer across all years
 * @param {string} customerId - Customer ID
 * @returns {Promise<number>} - Total debt amount
 */
export const calculateTotalDebt = async (customerId) => {
    try {
        const debts = await getCustomerDebt(customerId);
        const payments = await getCustomerPayments(customerId);

        const totalDebt = debts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
        const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

        return totalDebt - totalPayments;
    } catch (error) {
        console.error('Error calculating total debt:', error);
        throw error;
    }
};

/**
 * Calculate remaining debt for a specific year after payments
 * @param {string} customerId - Customer ID
 * @param {number} year - Year to calculate for
 * @returns {Promise<number>} - Remaining debt for the year
 */
export const calculateYearDebt = async (customerId, year) => {
    try {
        // Get debt for the year
        const debtQuery = query(collection(db, CUSTOMER_DEBT_COLLECTION), where('customerId', '==', customerId), where('year', '==', year));

        const debtSnapshot = await getDocs(debtQuery);

        if (debtSnapshot.empty) {
            return 0;
        }

        const debtAmount = debtSnapshot.docs[0].data().amount || 0;

        // Get payments for the year
        const paymentQuery = query(collection(db, CUSTOMER_PAYMENT_COLLECTION), where('customerId', '==', customerId), where('year', '==', year));

        const paymentSnapshot = await getDocs(paymentQuery);

        const totalPayments = paymentSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

        return debtAmount - totalPayments;
    } catch (error) {
        console.error('Error calculating year debt:', error);
        throw error;
    }
};

/**
 * Get debt summary for all customers
 * @returns {Promise<Array>} - Array of customer debt summaries
 */
export const getDebtSummary = async () => {
    try {
        // Get all customers
        const customerSnapshot = await getDocs(collection(db, 'customers'));
        const customers = customerSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Get all debt records
        const debtSnapshot = await getDocs(collection(db, CUSTOMER_DEBT_COLLECTION));
        const debts = debtSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Get all payment records
        const paymentSnapshot = await getDocs(collection(db, CUSTOMER_PAYMENT_COLLECTION));
        const payments = paymentSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Calculate summary for each customer
        const summary = customers.map((customer) => {
            const customerDebts = debts.filter((debt) => debt.customerId === customer.id);
            const customerPayments = payments.filter((payment) => payment.customerId === customer.id);

            const totalDebt = customerDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
            const totalPayments = customerPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const remainingDebt = totalDebt - totalPayments;

            // Group debts by year
            const debtsByYear = {};
            customerDebts.forEach((debt) => {
                if (!debtsByYear[debt.year]) {
                    debtsByYear[debt.year] = {
                        debt: 0,
                        payments: 0
                    };
                }
                debtsByYear[debt.year].debt += debt.amount || 0;
            });

            // Add payments by year
            customerPayments.forEach((payment) => {
                if (!debtsByYear[payment.year]) {
                    debtsByYear[payment.year] = {
                        debt: 0,
                        payments: 0
                    };
                }
                debtsByYear[payment.year].payments += payment.amount || 0;
            });

            // Calculate remaining debt by year
            Object.keys(debtsByYear).forEach((year) => {
                debtsByYear[year].remaining = debtsByYear[year].debt - debtsByYear[year].payments;
            });

            return {
                id: customer.id,
                representativeName: customer.representativeName,
                companyName: customer.companyName,
                totalDebt,
                totalPayments,
                remainingDebt,
                debtsByYear
            };
        });

        return summary;
    } catch (error) {
        console.error('Error getting debt summary:', error);
        throw error;
    }
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
