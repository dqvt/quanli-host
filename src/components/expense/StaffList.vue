<script setup>
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-4">
            <div class="font-semibold text-xl">Chức năng này đã bị loại bỏ</div>
            <Button label="Quay lại" icon="pi pi-arrow-left" @click="router.push('/')" />
        </div>
        
        <p>Chức năng quản lý chi phí và số dư đã bị loại bỏ khỏi ứng dụng.</p>
    </div>
</template>
