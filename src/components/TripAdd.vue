<script setup>
import { useTripAdd } from '@/services/trip';
import Button from 'primevue/button';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import TripForm from './TripForm.vue';

const router = useRouter();
const { loading, errorMessage, submitted, validationErrors, tripData, vehicles, staffList, customerList, fetchData, createTrip } = useTripAdd();

const handleSubmit = () => {
    createTrip();
};

onMounted(async () => {
    await Promise.all([fetchData.vehicles(), fetchData.staff(), fetchData.customers()]);
});
</script>

<template>
    <div class="card">
        <h2>Thêm chuyến xe mới</h2>
        <small v-if="errorMessage" class="p-error">{{ errorMessage }}</small>

        <TripForm v-model:initialData="tripData" :loading="loading" :submitted="submitted" :validationErrors="validationErrors" :vehicles="vehicles" :staffList="staffList" :customerList="customerList" @submit="handleSubmit">
            <template #actions>
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" label="Hủy" @click="router.push('/trip/list')" class="p-button-secondary" :disabled="loading" />
                    <Button type="submit" :label="loading ? 'Đang lưu...' : 'Lưu thông tin'" icon="pi pi-save" :loading="loading" :disabled="loading" />
                </div>
            </template>
        </TripForm>
    </div>
</template>

<style scoped>
.p-invalid .p-inputnumber-input {
    border-color: #f44336 !important;
}

.p-invalid .p-inputtext {
    border-color: #f44336 !important;
}
</style>
