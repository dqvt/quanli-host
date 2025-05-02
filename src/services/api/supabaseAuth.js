import { supabase } from '@/config/supabase';

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Supabase auth user credential
 */
export const login = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        return data.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

/**
 * Sign out the current user
 * @returns {Promise} - Supabase auth sign out result
 */
export const logout = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
};

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>} - Current user or null if not authenticated
 */
export const getCurrentUser = async () => {
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        return data.user;
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
};

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function to be called when auth state changes
 * @returns {Function} - Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            callback(session.user);
        } else if (event === 'SIGNED_OUT') {
            callback(null);
        }
    });

    return data.subscription.unsubscribe;
};
