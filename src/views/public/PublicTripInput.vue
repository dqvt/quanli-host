<script setup>
import TripForm from '@/views/trip/TripForm.vue';
import { useTripAdd } from '@/views/trip/tripmixin';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const successMessage = ref('');

// Use the tripmixin
const { loading, errorMessage, submitted, validationErrors, tripData, vehicles, staffList, customerList, fetchVehicles, fetchStaffList, fetchCustomers, handleSubmit } = useTripAdd();

onMounted(async () => {
    await Promise.all([fetchVehicles(), fetchStaffList(), fetchCustomers()]);
});

// Custom success handler for public trip submission
const handlePublicSuccess = () => {
    // Show toast notification
    toast.add({
        severity: 'success',
        summary: 'Thành công',
        detail: 'Chuyến đi đã được lưu thành công!',
        life: 3000
    });

    // Reload the page after a short delay to allow the toast to be seen
    setTimeout(() => {
        window.location.reload();
    }, 1000);
};

// Custom submit handler for public trip submission
const submitPublicTrip = () => {
    // Pass true for isPublic and the custom success handler
    handleSubmit(true, handlePublicSuccess);
};

// Handle cancel - just reset the form instead of navigating
const handleCancel = () => {
    if (confirm('Bạn có chắc muốn hủy nhập liệu?')) {
        tripData.value = {
            tripDate: new Date(),
            startingPoint: '',
            endingPoint: '',
            distance: null,
            driverName: '',
            customerName: '',
            assistantDriverName: '',
            vehicleLicenseNumber: '',
            expenses: {
                policeFee: 0,
                tollFee: 0,
                foodFee: 0,
                gasMoney: 0,
                mechanicFee: 0
            },
            notes: ''
        };
        submitted.value = false;
        successMessage.value = '';
    }
};
</script>

<template>
    <div class="min-h-screen bg-surface-50 dark:bg-surface-900 p-4">
        <div class="max-w-7xl mx-auto">
            <div class="card">
                <h2 class="text-2xl font-bold mb-4">Thêm Chuyến Đi Mới</h2>

                <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
                    {{ errorMessage }}
                </div>

                <div v-if="successMessage" class="p-4 mb-4 bg-green-100 text-green-700 rounded">
                    {{ successMessage }}
                </div>

                <TripForm v-model:initialData="tripData" :loading="loading" :submitted="submitted" :validationErrors="validationErrors" :vehicles="vehicles" :staffList="staffList" :customerList="customerList" @submit="submitPublicTrip">
                    <template #actions>
                        <div class="flex justify-end gap-2 mt-4">
                            <Button type="button" label="Hủy" @click="handleCancel" class="p-button-secondary" :disabled="loading" />
                            <Button type="submit" :label="loading ? 'Đang lưu...' : 'Lưu thông tin'" icon="pi pi-save" :loading="loading" :disabled="loading" />
                        </div>
                    </template>
                </TripForm>
            </div>
        </div>
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
