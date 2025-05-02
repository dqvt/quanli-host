<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { useAuthStore } from '@/services/auth';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const checked = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const copySuccess = ref(false);

// Function to copy the public trip input URL to clipboard
const copyPublicTripUrl = () => {
    // Get the base URL of the application
    const baseUrl = window.location.origin + import.meta.env.BASE_URL;
    // Construct the full URL to the public trip input page
    const publicTripUrl = baseUrl + 'public/trip/add';

    // Copy to clipboard
    navigator.clipboard
        .writeText(publicTripUrl)
        .then(() => {
            copySuccess.value = true;
            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã sao chép đường dẫn vào clipboard!',
                life: 3000
            });

            // Reset success state after 3 seconds
            setTimeout(() => {
                copySuccess.value = false;
            }, 3000);
        })
        .catch((err) => {
            console.error('Không thể sao chép: ', err);
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không thể sao chép đường dẫn. Vui lòng thử lại.',
                life: 3000
            });
        });
};

const handleLogin = async () => {
    // Reset error message
    errorMessage.value = '';

    // Validate form
    if (!email.value || !password.value) {
        errorMessage.value = 'Vui lòng nhập email và mật khẩu';
        return;
    }

    loading.value = true;

    try {
        await authStore.login(email.value, password.value);
        toast.add({ severity: 'success', summary: 'Đăng nhập thành công', detail: 'Chào mừng bạn quay trở lại!', life: 3000 });
        console.log('Login successful, redirecting to home page');
        router.push('/');
    } catch (error) {
        console.error('Login error:', error);

        // Handle Supabase auth errors
        if (error.message) {
            if (error.message.includes('Invalid login credentials')) {
                errorMessage.value = 'Email hoặc mật khẩu không chính xác';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage.value = 'Email chưa được xác nhận';
            } else if (error.message.includes('Invalid email')) {
                errorMessage.value = 'Email không hợp lệ';
            } else {
                errorMessage.value = 'Đăng nhập thất bại: ' + error.message;
            }
        } else {
            errorMessage.value = 'Đăng nhập thất bại. Vui lòng thử lại.';
        }
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <FloatingConfigurator />
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                    <div class="text-center mb-8 flex flex-col items-center">
                        <h1 class="text-3xl font-bold mb-2">Vận Tải Đại Quân</h1>
                        <span class="text-muted-color font-medium">Đăng nhập hệ thống quản lý</span>
                    </div>

                    <!-- Loading indicator -->
                    <div v-if="authStore.loading" class="flex justify-center items-center p-4">
                        <ProgressSpinner style="width: 50px; height: 50px" />
                        <span class="ml-2">Vui lòng đợi...</span>
                    </div>

                    <!-- Error message -->
                    <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
                        {{ errorMessage }}
                    </div>

                    <form v-if="!authStore.loading" @submit.prevent="handleLogin">
                        <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                        <InputText id="email1" type="email" placeholder="Nhập email" class="w-full md:w-[30rem] mb-8" v-model="email" />

                        <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Mật Khẩu</label>
                        <Password id="password1" v-model="password" placeholder="Nhập mật khẩu" :toggleMask="true" class="mb-4" fluid :feedback="false"></Password>

                        <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                            <div class="flex items-center">
                                <Checkbox v-model="checked" id="rememberme1" binary class="mr-2"></Checkbox>
                                <label for="rememberme1">Ghi nhớ đăng nhập</label>
                            </div>
                        </div>
                        <Button type="submit" :label="loading ? 'Đang đăng nhập...' : 'Đăng nhập'" class="w-full" :loading="loading" :disabled="loading"></Button>
                    </form>

                    <!-- Public Trip URL Button -->
                    <div class="mt-8 text-center">
                        <Button type="button" :label="copySuccess ? 'Đã sao chép!' : 'Sao chép đường dẫn nhập chuyến đi'" icon="pi pi-copy" severity="secondary" outlined class="w-full" @click="copyPublicTripUrl" :disabled="copySuccess" />
                        <div class="mt-2 text-sm text-gray-500">Sao chép đường dẫn để gửi cho tài xế nhập thông tin chuyến đi</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
