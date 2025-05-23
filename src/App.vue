<script setup>
import Preloader from '@/components/ui/Preloader.vue';
import { useAuthStore } from '@/services/auth';
import { useErrorStore } from '@/services/error';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { onMounted, onUnmounted, ref } from 'vue';

const authStore = useAuthStore();
const errorStore = useErrorStore();
const loading = ref(true);
let unsubscribeAuth = null;

onMounted(async () => {
    console.log('App mounted, initializing auth state');
    // Initialize auth state
    try {
        unsubscribeAuth = await authStore.init();
    } catch (error) {
        console.error('Error initializing auth:', error);
        errorStore.showError(error);
    }

    // Handle redirect from 404.html
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('redirect');
    if (redirectPath) {
        console.log('Handling redirect from 404.html:', redirectPath);
        // Remove the redirect parameter and clean up the URL
        window.history.replaceState(null, '', '/quanli-host' + (redirectPath.startsWith('/auth') ? redirectPath : '/auth/login'));
    }

    // Simulate loading time for preloader
    setTimeout(() => {
        console.log('Preloader timeout complete, setting loading to false');
        loading.value = false;
    }, 1500);
});

onUnmounted(() => {
    // Clean up auth subscription when app is unmounted
    if (typeof unsubscribeAuth === 'function') {
        unsubscribeAuth();
    }
});
</script>

<template>
    <Preloader v-if="loading" />
    <template v-else>
        <Toast />
        <ConfirmDialog />
        <!-- Global error message -->
        <div v-if="errorStore.errorMessage" class="fixed top-0 left-0 right-0 z-50 p-4">
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">Error: </strong>
                <span class="block sm:inline">{{ errorStore.errorMessage }}</span>
                <span class="absolute top-0 bottom-0 right-0 px-4 py-3" @click="errorStore.clearError()">
                    <svg class="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <title>Close</title>
                        <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                    </svg>
                </span>
            </div>
        </div>
        <router-view />
    </template>
</template>

<style scoped></style>
