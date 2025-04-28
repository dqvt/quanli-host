import { supabase } from '@/config/supabase';

/**
 * Generic function to fetch all records from a table
 * @param {string} table - Table name
 * @returns {Promise<Array>} - Array of records
 */
export const getAll = async (table) => {
    try {
        const { data, error } = await supabase
            .from(table)
            .select('*');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error fetching all records from ${table}:`, error);
        throw error;
    }
};

/**
 * Generic function to fetch a record by ID
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<Object>} - Record data
 */
export const getById = async (table, id) => {
    try {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error fetching record from ${table} with ID ${id}:`, error);
        throw error;
    }
};

/**
 * Generic function to fetch records by a field value
 * @param {string} table - Table name
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @returns {Promise<Array>} - Array of records
 */
export const getByField = async (table, field, value) => {
    try {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq(field, value);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error fetching records from ${table} where ${field} = ${value}:`, error);
        throw error;
    }
};

/**
 * Generic function to create a new record
 * @param {string} table - Table name
 * @param {Object} data - Record data
 * @returns {Promise<Object>} - Created record
 */
export const create = async (table, data) => {
    try {
        // Add timestamps
        const dataWithTimestamps = {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data: createdData, error } = await supabase
            .from(table)
            .insert(dataWithTimestamps)
            .select()
            .single();
        
        if (error) throw error;
        return createdData;
    } catch (error) {
        console.error(`Error creating record in ${table}:`, error);
        throw error;
    }
};

/**
 * Generic function to update a record
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} - Updated record
 */
export const update = async (table, id, data) => {
    try {
        // Add updated_at timestamp
        const dataWithTimestamp = {
            ...data,
            updated_at: new Date().toISOString()
        };
        
        const { data: updatedData, error } = await supabase
            .from(table)
            .update(dataWithTimestamp)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return updatedData;
    } catch (error) {
        console.error(`Error updating record in ${table} with ID ${id}:`, error);
        throw error;
    }
};

/**
 * Generic function to delete a record
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<void>}
 */
export const remove = async (table, id) => {
    try {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    } catch (error) {
        console.error(`Error deleting record from ${table} with ID ${id}:`, error);
        throw error;
    }
};
