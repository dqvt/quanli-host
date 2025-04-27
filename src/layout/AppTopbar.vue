<script setup>
import { useLayout } from '@/layout/composables/layout';
import { useAuthStore } from '@/stores/auth';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import AppConfigurator from './AppConfigurator.vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const authStore = useAuthStore();
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const handleLogout = () => {
    confirm.require({
        message: 'Bạn có chắc chắn muốn đăng xuất?',
        header: 'Xác nhận đăng xuất',
        icon: 'pi pi-info-circle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await authStore.logout();
                toast.add({ severity: 'success', summary: 'Đăng xuất thành công', detail: 'Hẹn gặp lại!', life: 3000 });
                router.push('/auth/login');
            } catch (error) {
                console.error('Logout error:', error);
                toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể đăng xuất. Vui lòng thử lại.', life: 3000 });
            }
        },
        reject: () => {
            // Do nothing on cancel
        }
    });
};
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo">
                <span class="font-bold text-xl">Vận Tải Đại Quân</span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
                <div class="relative">
                    <button
                        v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
                        type="button"
                        class="layout-topbar-action layout-topbar-action-highlight"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <AppConfigurator />
                </div>
            </div>

            <!-- User info and logout button -->
            <div class="flex items-center gap-2">
                <div v-if="authStore.isAuthenticated" class="hidden md:flex items-center mr-2">
                    <i class="pi pi-user mr-2"></i>
                    <div>
                        <div class="font-medium">{{ authStore.displayName || 'User' }}</div>
                        <div class="text-sm text-muted-color">{{ authStore.userEmail }}</div>
                    </div>
                </div>

                <button class="layout-topbar-action p-button p-button-danger" @click="handleLogout" style="background-color: #f44336; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px">
                    <i class="pi pi-sign-out mr-2"></i>
                    <span>Đăng xuất</span>
                </button>
            </div>
        </div>
    </div>
</template>
