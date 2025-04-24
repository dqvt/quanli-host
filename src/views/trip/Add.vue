<script setup>
import Button from 'primevue/button';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import TripForm from './TripForm.vue';
import { useTripAdd } from './tripmixin';

const router = useRouter();

const { loading, errorMessage, submitted, validationErrors, tripData, vehicles, staffList, customerList, fetchVehicles, fetchStaffList, fetchCustomers, handleSubmit } = useTripAdd();

// Custom submit handler for authenticated trips (status = APPROVED)
const submitAuthenticatedTrip = () => {
    // Pass false for isPublic to set status to APPROVED
    handleSubmit(false);
};

onMounted(async () => {
    await Promise.all([fetchVehicles(), fetchStaffList(), fetchCustomers()]);
});

// Handle router navigation
const handleCancel = () => {
    router.push('/trip/list');
};
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Thêm Chuyến Đi Mới</h2>

        <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
            {{ errorMessage }}
        </div>

        <TripForm v-model:initialData="tripData" :loading="loading" :submitted="submitted" :validationErrors="validationErrors" :vehicles="vehicles" :staffList="staffList" :customerList="customerList" @submit="submitAuthenticatedTrip">
            <template #actions>
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" label="Hủy" @click="handleCancel" class="p-button-secondary" :disabled="loading" />
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
