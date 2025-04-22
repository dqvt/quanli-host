<script setup>
import { useAuthStore } from '@/stores/auth';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
let unsubscribeAuth;

onMounted(() => {
    // Initialize auth state
    unsubscribeAuth = authStore.init();

    // Handle redirect from 404.html
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('redirect');
    if (redirectPath) {
        // Remove the redirect parameter and clean up the URL
        window.history.replaceState(null, '', '/quanli-host' + (redirectPath.startsWith('/auth') ? redirectPath : '/auth/login'));
    }
});

onUnmounted(() => {
    // Clean up auth subscription when app is unmounted
    if (unsubscribeAuth) {
        unsubscribeAuth();
    }
});
</script>

<template>
    <Toast />
    <ConfirmDialog />
    <router-view />
</template>

<style scoped></style>
