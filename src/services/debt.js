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
 * Get debt summary for all customers
 * @returns {Promise<Array>} - Array of customer debt summaries
 */
export const getDebtSummary = async () => {
    try {
        // Get all customers
        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('id, company_name, representative_name');
        
        if (customersError) throw customersError;
        
        // Get debt for each customer
        const debtSummary = await Promise.all(
            customers.map(async (customer) => {
                // Get total debt
                const { data: debts, error: debtsError } = await supabase
                    .from('debts')
                    .select('*')
                    .eq('customer_id', customer.id);
                
                if (debtsError) throw debtsError;
                
                // Get total payments
                const { data: payments, error: paymentsError } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('customer_id', customer.id);
                
                if (paymentsError) throw paymentsError;
                
                // Calculate total debt and payment
                const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
                const totalPayment = payments.reduce((sum, payment) => sum + payment.amount, 0);
                const remainingDebt = totalDebt - totalPayment;
                
                return {
                    id: customer.id,
                    companyName: customer.company_name,
                    representativeName: customer.representative_name,
                    totalDebt,
                    totalPayment,
                    remainingDebt
                };
            })
        );
        
        return debtSummary;
    } catch (error) {
        console.error('Error getting debt summary:', error);
        throw error;
    }
};

/**
 * Get customer debt by customer ID
 * @param {string} customerId - Customer ID
 * @returns {Promise<Object>} - Customer debt data
 */
export const getCustomerDebt = async (customerId) => {
    try {
        // Get customer info
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();
        
        if (customerError) throw customerError;
        
        // Get debts by year
        const { data: debts, error: debtsError } = await supabase
            .from('debts')
            .select('*')
            .eq('customer_id', customerId)
            .order('year', { ascending: false });
        
        if (debtsError) throw debtsError;
        
        // Get total payments
        const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .eq('customer_id', customerId);
        
        if (paymentsError) throw paymentsError;
        
        // Calculate total debt and payment
        const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
        const totalPayment = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const remainingDebt = totalDebt - totalPayment;
        
        return {
            customer,
            debts,
            totalDebt,
            totalPayment,
            remainingDebt
        };
    } catch (error) {
        console.error(`Error getting debt for customer ${customerId}:`, error);
        throw error;
    }
};

/**
 * Get customer payments
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} - Array of payments
 */
export const getCustomerPayments = async (customerId) => {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('customer_id', customerId)
            .order('date', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error getting payments for customer ${customerId}:`, error);
        throw error;
    }
};

/**
 * Add or update customer debt
 * @param {string} customerId - Customer ID
 * @param {string} companyName - Company name
 * @param {string} representativeName - Representative name
 * @param {number} year - Debt year
 * @param {number} amount - Debt amount
 * @returns {Promise<Object>} - Updated debt
 */
export const addOrUpdateDebt = async (customerId, companyName, representativeName, year, amount) => {
    try {
        // Check if debt for this year already exists
        const { data: existingDebt, error: checkError } = await supabase
            .from('debts')
            .select('*')
            .eq('customer_id', customerId)
            .eq('year', year)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 is "No rows returned" error, which is expected if debt doesn't exist
            throw checkError;
        }
        
        if (existingDebt) {
            // Update existing debt
            const { data, error } = await supabase
                .from('debts')
                .update({
                    amount: existingDebt.amount + amount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingDebt.id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } else {
            // Create new debt
            const { data, error } = await supabase
                .from('debts')
                .insert({
                    customer_id: customerId,
                    company_name: companyName,
                    representative_name: representativeName,
                    year,
                    amount,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error(`Error adding/updating debt for customer ${customerId}:`, error);
        throw error;
    }
};

/**
 * Add payment for customer debt
 * @param {string} customerId - Customer ID
 * @param {string} companyName - Company name
 * @param {string} representativeName - Representative name
 * @param {number} amount - Payment amount
 * @param {Date} date - Payment date
 * @param {string} note - Payment note
 * @returns {Promise<Object>} - Created payment
 */
export const addPayment = async (customerId, companyName, representativeName, amount, date, note) => {
    try {
        const { data, error } = await supabase
            .from('payments')
            .insert({
                customer_id: customerId,
                company_name: companyName,
                representative_name: representativeName,
                amount,
                date: date ? new Date(date).toISOString() : new Date().toISOString(),
                note,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error adding payment for customer ${customerId}:`, error);
        throw error;
    }
};

/**
 * Delete payment
 * @param {string} paymentId - Payment ID
 * @returns {Promise<void>}
 */
export const deletePayment = async (paymentId) => {
    try {
        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', paymentId);
        
        if (error) throw error;
    } catch (error) {
        console.error(`Error deleting payment ${paymentId}:`, error);
        throw error;
    }
};
