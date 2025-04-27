<script setup>
import { db } from '@/config/firebase';
import { calculateTotalExpenses, formatTimestamp, getStatusSeverity, useTripList } from '@/services/trip';
import { doc, updateDoc } from 'firebase/firestore';
import Button from 'primevue/button';
import DatePicker from 'primevue/calendar';
import Dialog from 'primevue/dialog';
import Select from 'primevue/dropdown';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

// Function to translate status values to Vietnamese
const translateStatus = (status) => {
    const translations = {
        PENDING: 'Chờ duyệt',
        WAITING_FOR_PRICE: 'Chờ báo giá',
        PRICED: 'Đã báo giá'
    };
    return translations[status] || status;
};

const { filteredTrips, loading, fetchData, approveTrip, approvingTripId, driverFilterValue, assistantFilterValue, customerFilterValue, startDateFilter, endDateFilter, staffList, customerList } = useTripList();

// Add confirmation dialog functionality
const confirmDialog = ref(false);
const tripToApprove = ref(null);

// Function to show confirmation dialog before approving
const confirmApprove = (tripId) => {
    tripToApprove.value = tripId;
    confirmDialog.value = true;
};

// Function to handle approval after confirmation
const handleApprove = () => {
    if (tripToApprove.value) {
        approveTrip(tripToApprove.value);
        tripToApprove.value = null;
    }
    confirmDialog.value = false;
};

// Toast for notifications
const toast = useToast();

// Saving state
const savingState = ref({});

// Edit mode state for each trip
const editModeState = ref({});

// Function to toggle edit mode
const toggleEditMode = (tripId) => {
    editModeState.value[tripId] = !editModeState.value[tripId];
};

// Function to save trip changes
const saveTrip = async (trip) => {
    const tripId = trip.id;
    savingState.value[tripId] = true;

    try {
        const tripRef = doc(db, 'trips', tripId);

        // Prepare data for update
        const updateData = {
            startingPoint: trip.startingPoint,
            endingPoint: trip.endingPoint,
            distance: trip.distance,
            'expenses.policeFee': trip.expenses.policeFee,
            'expenses.tollFee': trip.expenses.tollFee,
            'expenses.foodFee': trip.expenses.foodFee,
            'expenses.gasMoney': trip.expenses.gasMoney,
            'expenses.mechanicFee': trip.expenses.mechanicFee
        };

        // Update in Firestore
        await updateDoc(tripRef, updateData);

        // Show success message
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã cập nhật thông tin chuyến đi',
            life: 3000
        });

        // Exit edit mode after successful save
        editModeState.value[tripId] = false;
    } catch (error) {
        console.error('Error updating trip:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể cập nhật thông tin chuyến đi',
            life: 3000
        });
    } finally {
        savingState.value[tripId] = false;
    }
};

onMounted(() => {
    fetchData.staff();
    fetchData.customers();
    fetchData.trips();
});
</script>

<template>
    <Fluid class="flex flex-col gap-8">
        <!-- Approve Trip Confirmation Dialog -->
        <Dialog v-model:visible="confirmDialog" header="Xác nhận duyệt chuyến" :style="{ width: '450px' }" :modal="true">
            <div class="confirmation-content">
                <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem; color: var(--yellow-500)" />
                <span>Bạn có chắc chắn muốn duyệt chuyến xe này không?</span>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" outlined @click="confirmDialog = false" />
                <Button label="Có, duyệt chuyến" icon="pi pi-check" severity="success" @click="handleApprove" autofocus />
            </template>
        </Dialog>

        <!-- Results Section -->
        <div class="card">
            <div class="font-semibold text-xl mb-4">Danh sách chuyến xe chờ duyệt</div>

            <!-- Filter Section -->
            <div class="bg-gray-50 rounded-lg p-4 shadow-sm mb-4">
                <div class="flex items-center gap-4 flex-nowrap">
                    <!-- Driver -->
                    <div class="w-[20%]">
                        <span class="font-semibold text-gray-700 mr-2 whitespace-nowrap">Tài xế:</span>
                        <Select v-model="driverFilterValue" :options="staffList" optionLabel="label" optionValue="value" placeholder="Chọn tài xế" class="w-full" :showClear="true" />
                    </div>

                    <!-- Assistant -->
                    <div class="w-[20%]">
                        <span class="font-semibold text-gray-700 mr-2 whitespace-nowrap">Phụ xe:</span>
                        <Select v-model="assistantFilterValue" :options="staffList" optionLabel="label" optionValue="value" placeholder="Chọn phụ xe" class="w-full" :showClear="true" />
                    </div>

                    <!-- Customer -->
                    <div class="w-[25%]">
                        <span class="font-semibold text-gray-700 mr-2 whitespace-nowrap">Khách hàng:</span>
                        <Select v-model="customerFilterValue" :options="customerList" optionLabel="label" optionValue="value" placeholder="Chọn khách hàng" class="w-full" :showClear="true" />
                    </div>

                    <!-- Date Range -->
                    <div class="flex gap-4 w-[35%]">
                        <div class="w-1/2">
                            <span class="font-semibold text-gray-700 mr-2 whitespace-nowrap">Từ ngày:</span>
                            <DatePicker v-model="startDateFilter" dateFormat="dd/mm/yy" placeholder="Từ ngày" showIcon class="w-full" />
                        </div>
                        <div class="w-1/2">
                            <span class="font-semibold text-gray-700 mr-2 whitespace-nowrap">Đến ngày:</span>
                            <DatePicker v-model="endDateFilter" dateFormat="dd/mm/yy" placeholder="Đến ngày" showIcon class="w-full" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-center mb-4">
                <Button label="Thêm chuyến xe mới" icon="pi pi-plus" @click="$router.push('/trip/add')" />
            </div>
            <!-- Loading indicator -->
            <div v-if="loading" class="flex justify-center items-center p-4">
                <ProgressSpinner style="width: 50px; height: 50px" />
            </div>

            <!-- Results table using v-for -->
            <div v-else>
                <!-- Custom Table -->
                <div class="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
                    <div class="min-w-full">
                        <!-- Table Header -->
                        <div class="bg-gray-100 border-b border-gray-300 sticky top-0">
                            <div class="grid grid-cols-17 gap-2 py-3 px-4 text-sm font-bold text-gray-800">
                                <div class="px-3 py-2 border-r border-gray-200">Biển số xe</div>
                                <div class="px-3 py-2 border-r border-gray-200">Thời gian đi</div>
                                <div class="px-3 py-2 border-r border-gray-200">Điểm đi</div>
                                <div class="px-3 py-2 border-r border-gray-200">Điểm đến</div>
                                <div class="px-3 py-2 border-r border-gray-200">Khoảng cách</div>
                                <div class="px-3 py-2 border-r border-gray-200">Tài xế</div>
                                <div class="px-3 py-2 border-r border-gray-200">Phụ xe</div>
                                <div class="px-3 py-2 border-r border-gray-200">Khách hàng</div>
                                <div class="px-3 py-2 border-r border-gray-200">Chi phí CSGT</div>
                                <div class="px-3 py-2 border-r border-gray-200">Phí cầu đường</div>
                                <div class="px-3 py-2 border-r border-gray-200">Chi phí ăn uống</div>
                                <div class="px-3 py-2 border-r border-gray-200">Chi phí xăng</div>
                                <div class="px-3 py-2 border-r border-gray-200">Chi phí sửa chữa</div>
                                <div class="px-3 py-2 border-r border-gray-200">Tổng chi phí</div>
                                <div class="px-3 py-2 border-r border-gray-200">Trạng thái</div>
                                <div class="px-3 py-2 border-r border-gray-200">Ngày tạo</div>
                                <div class="px-3 py-2">Thao tác</div>
                            </div>
                        </div>

                        <!-- Table Rows -->
                        <div v-for="(trip, index) in filteredTrips" :key="trip.id" class="border-b border-gray-200 hover:bg-gray-50" :class="{ 'bg-gray-50': index % 2 === 0 }">
                            <div class="grid grid-cols-17 gap-2 py-2 px-4 text-sm">
                                <div class="px-3 py-2">{{ trip.vehicleLicenseNumber }}</div>
                                <div class="px-3 py-2">{{ $formatDate(trip.tripDate) }}</div>

                                <!-- Editable fields with consistent styling -->
                                <div class="px-3 py-2">
                                    <input v-model="trip.startingPoint" :disabled="!editModeState[trip.id]" class="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                </div>
                                <div class="px-3 py-2">
                                    <input v-model="trip.endingPoint" :disabled="!editModeState[trip.id]" class="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                </div>
                                <div class="px-3 py-2">
                                    <input v-model="trip.distance" type="number" :disabled="!editModeState[trip.id]" class="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                </div>

                                <div class="px-3 py-2">{{ trip.driverName }}</div>
                                <div class="px-3 py-2">{{ trip.assistantDriverName }}</div>
                                <div class="px-3 py-2">{{ trip.customerDisplayName }}</div>

                                <!-- Editable expense fields with currency format -->
                                <div class="px-3 py-2">
                                    <InputNumber v-model="trip.expenses.policeFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" class="w-full" :disabled="!editModeState[trip.id]" />
                                </div>
                                <div class="px-3 py-2">
                                    <InputNumber v-model="trip.expenses.tollFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" class="w-full" :disabled="!editModeState[trip.id]" />
                                </div>
                                <div class="px-3 py-2">
                                    <InputNumber v-model="trip.expenses.foodFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" class="w-full" :disabled="!editModeState[trip.id]" />
                                </div>
                                <div class="px-3 py-2">
                                    <InputNumber v-model="trip.expenses.gasMoney" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" class="w-full" :disabled="!editModeState[trip.id]" />
                                </div>
                                <div class="px-3 py-2">
                                    <InputNumber v-model="trip.expenses.mechanicFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" class="w-full" :disabled="!editModeState[trip.id]" />
                                </div>

                                <div class="px-3 py-2">{{ calculateTotalExpenses(trip.expenses) }}</div>

                                <div class="px-3 py-2">
                                    <Tag :severity="getStatusSeverity(trip.status)" :value="translateStatus(trip.status)" />
                                </div>

                                <div class="px-3 py-2">{{ formatTimestamp(trip.createdAt) }}</div>

                                <!-- Combined Actions column -->
                                <div class="px-3 py-2">
                                    <div class="flex gap-2">
                                        <Button icon="pi pi-save" label="Lưu" severity="info" size="small" @click="saveTrip(trip)" :loading="savingState[trip.id]" tooltip="Lưu thay đổi" class="p-button-sm" :disabled="!editModeState[trip.id]" />
                                        <Button
                                            :icon="editModeState[trip.id] ? 'pi pi-times' : 'pi pi-pencil'"
                                            :label="editModeState[trip.id] ? 'Hủy' : 'Sửa'"
                                            :severity="editModeState[trip.id] ? 'secondary' : 'primary'"
                                            outlined
                                            size="small"
                                            @click="toggleEditMode(trip.id)"
                                            :tooltip="editModeState[trip.id] ? 'Hủy chỉnh sửa' : 'Chỉnh sửa chuyến xe'"
                                            class="p-button-sm"
                                        />
                                        <Button
                                            v-if="trip.status === 'PENDING'"
                                            icon="pi pi-check"
                                            label="Duyệt"
                                            severity="success"
                                            size="small"
                                            :loading="approvingTripId === trip.id"
                                            @click="confirmApprove(trip.id)"
                                            class="p-button-sm"
                                            :disabled="editModeState[trip.id]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty state -->
            <div v-if="!loading && filteredTrips.length === 0" class="text-center p-4">
                <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
                <p>Không tìm thấy chuyến xe nào</p>
            </div>
        </div>
    </Fluid>
</template>

<style scoped>
/* Grid columns configuration */
.grid-cols-17 {
    grid-template-columns:
        minmax(100px, 1fr) /* License plate */
        minmax(120px, 1fr) /* Date */
        minmax(150px, 1fr) /* Start point */
        minmax(150px, 1fr) /* End point */
        minmax(100px, 1fr) /* Distance */
        minmax(120px, 1fr) /* Driver */
        minmax(120px, 1fr) /* Assistant */
        minmax(150px, 1fr) /* Customer */
        minmax(100px, 1fr) /* Police fee */
        minmax(100px, 1fr) /* Toll fee */
        minmax(100px, 1fr) /* Food fee */
        minmax(100px, 1fr) /* Gas money */
        minmax(100px, 1fr) /* Mechanic fee */
        minmax(120px, 1fr) /* Total */
        minmax(120px, 1fr) /* Status */
        minmax(120px, 1fr) /* Created at */
        minmax(200px, 1fr); /* Actions */
}

/* Make inputs look consistent with PrimeVue components */
input[type='text'],
input[type='number'] {
    @apply transition-colors duration-200;
}

/* Ensure PrimeVue components maintain proper sizing */
:deep(.p-button-sm) {
    @apply text-sm py-1 px-2;
}

:deep(.p-tag) {
    @apply text-sm;
}

/* Make InputNumber components smaller to match other inputs */
:deep(.p-inputnumber-input) {
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
}

:deep(.p-inputnumber) {
    width: 100%;
}

/* Table header styling */
.bg-gray-100.border-b.border-gray-300.sticky {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    z-index: 10;
}
</style>
