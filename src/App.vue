<script setup>
import { useAuthStore } from '@/stores/auth';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { onMounted, onUnmounted } from 'vue';

const authStore = useAuthStore();
let unsubscribeAuth;

onMounted(() => {
    // Initialize auth state
    unsubscribeAuth = authStore.init();
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
