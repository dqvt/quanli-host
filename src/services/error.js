import { defineStore } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';

export const useErrorStore = defineStore('error', () => {
    const errorMessage = ref(null);
    const toast = useToast();

    function showError(error) {
        let message = 'An error occurred';
        
        if (error?.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }

        // Handle database constraint errors
        if (message.includes('violates not-null constraint')) {
            message = 'Required fields cannot be empty';
        }

        errorMessage.value = message;
        toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
    }

    function clearError() {
        errorMessage.value = null;
    }

    return {
        errorMessage,
        showError,
        clearError
    };
}); 