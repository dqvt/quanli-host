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
 * @returns {Promise} - Promise that resolves when sign out is complete
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
 * Register a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise} - Supabase auth user credential
 */
export const register = async (email, password, displayName) => {
    try {
        // Create user with email and password
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName
                }
            }
        });
        
        if (error) throw error;
        return data.user;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
};

/**
 * Get the current authenticated user
 * @returns {Object|null} - Current user or null if not authenticated
 */
export const getCurrentUser = async () => {
    try {
        const { data } = await supabase.auth.getUser();
        return data.user;
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
};

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Function} - Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null);
    });
    
    return data.subscription.unsubscribe;
};
