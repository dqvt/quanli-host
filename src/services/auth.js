import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getCurrentUser, login, logout, onAuthStateChange } from './api/supabaseAuth';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const loading = ref(true);
    const error = ref(null);

    const isAuthenticated = computed(() => !!user.value);
    const isAdmin = computed(() => user.value?.user_metadata?.role === 'admin');

    async function init() {
        try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                user.value = currentUser;
            }
            loading.value = false;
            return onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN') {
                    user.value = session.user;
                } else if (event === 'SIGNED_OUT') {
                    user.value = null;
                }
            });
        } catch (err) {
            error.value = err.message;
            loading.value = false;
            throw err;
        }
    }

    async function loginUser(email, password) {
        try {
            loading.value = true;
            error.value = null;
            const { user: loggedInUser, error: loginError } = await login(email, password);
            if (loginError) throw loginError;
            user.value = loggedInUser;
            return loggedInUser;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function logoutUser() {
        try {
            loading.value = true;
            error.value = null;
            await logout();
            user.value = null;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        user,
        loading,
        error,
        isAuthenticated,
        isAdmin,
        init,
        loginUser,
        logoutUser
    };
}); 