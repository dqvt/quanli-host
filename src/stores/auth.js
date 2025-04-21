import { login as firebaseLogin, logout as firebaseLogout, getCurrentUser, onAuthStateChange } from '@/services/auth';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
    // State
    const user = ref(null);
    const loading = ref(true);
    const initialized = ref(false);

    // Getters
    const isAuthenticated = computed(() => !!user.value);
    const userEmail = computed(() => user.value?.email || '');
    const displayName = computed(() => user.value?.displayName || '');
    const userId = computed(() => user.value?.uid || '');

    // Actions
    function setUser(newUser) {
        user.value = newUser;
    }

    async function login(email, password) {
        try {
            const userCredential = await firebaseLogin(email, password);
            setUser(userCredential);
            return userCredential;
        } catch (error) {
            console.error('Login error in store:', error);
            throw error;
        }
    }

    async function logout() {
        try {
            await firebaseLogout();
            setUser(null);
        } catch (error) {
            console.error('Logout error in store:', error);
            throw error;
        }
    }

    function init() {
        if (initialized.value) return;

        loading.value = true;

        // Set initial user if already logged in
        const currentUser = getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }

        // Subscribe to auth state changes
        const unsubscribe = onAuthStateChange((authUser) => {
            setUser(authUser);
            loading.value = false;
        });

        initialized.value = true;

        // Return unsubscribe function to be called when the app is unmounted
        return unsubscribe;
    }

    return {
        user,
        loading,
        isAuthenticated,
        userEmail,
        displayName,
        userId,
        login,
        logout,
        init
    };
});
