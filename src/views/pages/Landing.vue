<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
    <div class="min-h-screen flex flex-column align-items-center justify-content-center bg-surface-50 dark:bg-surface-900">
        <div class="text-center mb-5">
            <div class="text-900 text-4xl font-bold mb-4">Quản Lí Chuyến Xe</div>
            <div class="text-600 text-xl mb-8">Hệ thống quản lí chuyến xe</div>
            <div class="flex justify-content-center">
                <Button label="Đăng Nhập" icon="pi pi-user" severity="secondary" @click="router.push('/auth/login')" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.text-900 {
    color: var(--surface-900);
}
.text-600 {
    color: var(--surface-600);
}
</style>
