<script setup>
// Core imports
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { onMounted, ref } from 'vue';

// Service imports
import { calculateTotalExpenses, getStatusSeverity, useTripList } from '@/services/trip';

// PrimeVue component imports
import { InputText } from 'primevue';
import Button from 'primevue/button';
import DatePicker from 'primevue/calendar';
import Dialog from 'primevue/dialog';
import Select from 'primevue/dropdown';
import Fluid from 'primevue/fluid';
import InputNumber from 'primevue/inputnumber';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';

// Status translation map
const STATUS_TRANSLATIONS = {
    PENDING: 'Chờ duyệt',
    WAITING_FOR_PRICE: 'Chờ báo giá',
    PRICED: 'Đã báo giá'
};

// Function to translate status values to Vietnamese
const translateStatus = (status) => STATUS_TRANSLATIONS[status] || status;

// Initialize toast for notifications
const toast = useToast();

// Use the trip list composable with PENDING status filter
const { filteredTrips, loading, fetchData, approveTrip, approvingTripId, driverFilterValue, assistantFilterValue, customerFilterValue, vehicleLicenseNumberFilter, startDateFilter, endDateFilter, staffList, customerList, vehicleList } =
    useTripList('PENDING');

// State management
const confirmDialog = ref(false);
const tripToApprove = ref(null);
const savingState = ref({});
const editModeState = ref({});

// Trip approval functions
const confirmApprove = (tripId) => {
    tripToApprove.value = tripId;
    confirmDialog.value = true;
};

const handleApprove = () => {
    if (tripToApprove.value) {
        approveTrip(tripToApprove.value);
        tripToApprove.value = null;
    }
    confirmDialog.value = false;
};

// Edit mode functions
const toggleEditMode = (tripId) => {
    editModeState.value[tripId] = !editModeState.value[tripId];
};

// Save trip changes to Firestore
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

        await updateDoc(tripRef, updateData);

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

// Fetch data on component mount
onMounted(() => {
    fetchData.staff();
    fetchData.customers();
    fetchData.vehicles();
    fetchData.trips();
});
</script>

<template>
    <Fluid class="flex flex-col gap-8">
        <!-- Approve Trip Confirmation Dialog -->
        <Dialog v-model:visible="confirmDialog" header="Xác nhận duyệt chuyến" :style="{ width: '450px' }" :modal="true">
            <div class="flex items-center">
                <i class="pi pi-exclamation-triangle mr-3 text-yellow-500 text-4xl" />
                <span>Bạn có chắc chắn muốn duyệt chuyến xe này không?</span>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="Không" icon="pi pi-times" outlined @click="confirmDialog = false" />
                    <Button label="Có, duyệt chuyến" icon="pi pi-check" severity="success" @click="handleApprove" autofocus />
                </div>
            </template>
        </Dialog>

        <!-- Results Section -->
        <div class="card">
            <div class="font-semibold text-xl mb-4">Danh sách chuyến xe chờ duyệt</div>

            <!-- Filter Section -->
            <div class="bg-gray-50 rounded-lg p-4 shadow-sm mb-4">
                <div class="flex flex-col gap-4">
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

                        <!-- Vehicle License Number -->
                        <div class="w-[25%]">
                            <span class="font-semibold text-gray-700 mr-2 whitespace-nowrap">Biển số xe:</span>
                            <Select v-model="vehicleLicenseNumberFilter" :options="vehicleList" optionLabel="label" optionValue="value" placeholder="Chọn biển số xe" class="w-full" :showClear="true" />
                        </div>
                    </div>

                    <!-- Date Range -->
                    <div class="flex gap-4">
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

            <!-- Results table using v-for with HTML table structure -->
            <div v-else class="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
                <table class="min-w-full border-collapse text-xs">
                    <thead class="sticky top-0">
                        <tr class="bg-gray-100 border-b border-gray-300">
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Biển số xe</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Thời gian đi</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Điểm đi</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Điểm đến</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Khoảng cách</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Tài xế</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Phụ xe</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Khách hàng</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Chi phí CSGT</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Phí cầu đường</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Chi phí ăn uống</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Chi phí xăng</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Chi phí sửa chữa</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Tổng chi phí</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800 border-r border-gray-200">Trạng thái</th>
                            <th class="px-2 py-2 text-left font-semibold text-gray-800">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(trip, index) in filteredTrips" :key="trip.id" :class="{ 'bg-gray-50': index % 2 === 0 }" class="border-b border-gray-200 hover:bg-gray-50">
                            <td class="px-2 py-2 whitespace-nowrap border-r border-gray-200" :title="trip.vehicleLicenseNumber">{{ trip.vehicleLicenseNumber }}</td>
                            <td class="px-2 py-2 whitespace-nowrap border-r border-gray-200" :title="$formatDate(trip.tripDate)">{{ $formatDate(trip.tripDate) }}</td>

                            <!-- Editable fields -->
                            <td class="px-2 py-2 border-r border-gray-200">
                                <InputText v-model="trip.startingPoint" :disabled="!editModeState[trip.id]" class="w-full text-xs disabled:bg-gray-50 disabled:text-gray-500" />
                            </td>
                            <td class="px-2 py-2 border-r border-gray-200">
                                <InputText v-model="trip.endingPoint" :disabled="!editModeState[trip.id]" class="w-full text-xs disabled:bg-gray-50 disabled:text-gray-500" />
                            </td>
                            <td class="px-2 py-2 border-r border-gray-200">
                                <InputText v-model="trip.distance" type="number" :disabled="!editModeState[trip.id]" class="w-full text-xs disabled:bg-gray-50 disabled:text-gray-500" />
                            </td>

                            <td class="px-2 py-2 whitespace-nowrap border-r border-gray-200" :title="trip.driverName">{{ trip.driverName }}</td>
                            <td class="px-2 py-2 whitespace-nowrap border-r border-gray-200" :title="trip.assistantDriverName">{{ trip.assistantDriverName }}</td>
                            <td class="px-2 py-2 whitespace-nowrap border-r border-gray-200" :title="trip.customerDisplayName">{{ trip.customerDisplayName }}</td>

                            <!-- Editable expense fields with currency format -->
                            <td class="px-2 py-2 border-r border-gray-200">
                                <InputNumber v-model="trip.expenses.policeFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>
                            <td class="px-2 py-2 border-r border-gray-200">
                                <InputNumber v-model="trip.expenses.tollFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>
                            <td class="px-2 py-2 border-r border-gray-200">
                                <InputNumber v-model="trip.expenses.foodFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>
                            <td class="px-2 py-2 border-r border-gray-200">
                                <InputNumber v-model="trip.expenses.gasMoney" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>
                            <td class="px-2 py-2 border-r border-gray-200">
                                <InputNumber v-model="trip.expenses.mechanicFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>

                            <td class="px-2 py-2 whitespace-nowrap border-r border-gray-200" :title="calculateTotalExpenses(trip.expenses)">
                                {{ calculateTotalExpenses(trip.expenses) }}
                            </td>

                            <td class="px-2 py-2 whitespace-nowrap border-r border-gray-200" :title="translateStatus(trip.status)">
                                <Tag :severity="getStatusSeverity(trip.status)" :value="translateStatus(trip.status)" class="text-xs" />
                            </td>

                            <!-- Actions column -->
                            <td class="px-2 py-2">
                                <div class="flex gap-1">
                                    <Button icon="pi pi-save" label="Lưu" severity="info" size="small" @click="saveTrip(trip)" :loading="savingState[trip.id]" tooltip="Lưu thay đổi" class="text-xs" :disabled="!editModeState[trip.id]" />
                                    <Button
                                        :icon="editModeState[trip.id] ? 'pi pi-times' : 'pi pi-pencil'"
                                        :label="editModeState[trip.id] ? 'Hủy' : 'Sửa'"
                                        :severity="editModeState[trip.id] ? 'secondary' : 'primary'"
                                        outlined
                                        size="small"
                                        @click="toggleEditMode(trip.id)"
                                        :tooltip="editModeState[trip.id] ? 'Hủy chỉnh sửa' : 'Chỉnh sửa chuyến xe'"
                                        class="text-xs"
                                    />
                                    <Button
                                        v-if="trip.status === 'PENDING'"
                                        icon="pi pi-check"
                                        label="Duyệt"
                                        severity="success"
                                        size="small"
                                        :loading="approvingTripId === trip.id"
                                        @click="confirmApprove(trip.id)"
                                        class="text-xs"
                                        :disabled="editModeState[trip.id]"
                                    />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
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
/* Custom tooltip style */
[title]:not([title='']):hover {
    position: relative;
}

[title]:not([title='']):hover::after {
    content: attr(title);
    position: absolute;
    left: 0;
    top: 100%;
    z-index: 20;
    background-color: #1f2937; /* bg-gray-800 */
    color: white;
    padding: 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    max-width: 20rem;
}
</style>
