<script setup>
import { useTripEdit } from '@/services/trip';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import TripForm from './TripForm.vue';

const route = useRoute();
const tripId = route.params.id;

const { loading, saving, errorMessage, deleteDialog, submitted, validationErrors, tripData, vehicles, staffList, customerList, router, fetchData, deleteTrip, updateTrip } = useTripEdit(tripId);

onMounted(async () => {
    if (!tripId) {
        router.push('/trip/list');
        return;
    }
    await Promise.all([fetchData.tripData(), fetchData.vehicles(), fetchData.staff(), fetchData.customers()]);
});

// Handle form submission
const handleSubmit = () => {
    updateTrip();
};

// Handle router navigation
const handleCancel = () => {
    router.push('/trip/list');
};
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Cập nhật thông tin chuyến đi</h2>

        <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
            {{ errorMessage }}
        </div>

        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner class="w-12 h-12" />
        </div>

        <TripForm v-else v-model:initialData="tripData" :loading="loading" :submitted="submitted" :validationErrors="validationErrors" :vehicles="vehicles" :staffList="staffList" :customerList="customerList" @submit="handleSubmit">
            <template #actions>
                <div class="flex justify-between items-center mt-4">
                    <Button type="button" label="Xóa" icon="pi pi-trash" severity="danger" @click="deleteDialog = true" outlined size="small" />

                    <div class="flex gap-2">
                        <Button type="button" label="Hủy" @click="handleCancel" class="p-button-secondary" :disabled="saving" />
                        <Button type="submit" :label="saving ? 'Đang lưu...' : 'Lưu thay đổi'" icon="pi pi-save" :loading="saving" :disabled="saving" />
                    </div>
                </div>
            </template>
        </TripForm>

        <!-- Delete Confirmation Dialog -->
        <Dialog v-model:visible="deleteDialog" header="Xác nhận xóa" :modal="true" :style="{ width: '450px' }">
            <div class="flex items-center gap-3">
                <i class="pi pi-exclamation-triangle text-yellow-500 text-2xl" />
                <span>
                    Bạn có chắc chắn muốn xóa chuyến xe từ
                    <b>{{ tripData.startingPoint }}</b> đến <b>{{ tripData.endingPoint }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
                <Button label="Có" icon="pi pi-check" @click="deleteTrip" severity="danger" outlined />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.field label {
    font-weight: 500;
}

:deep(.p-inputtext),
:deep(.p-dropdown),
:deep(.p-calendar),
:deep(.p-inputnumber) {
    width: 100%;
}

:deep(.p-calendar .p-inputtext) {
    width: 100%;
}
</style>
