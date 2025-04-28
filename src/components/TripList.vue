<script setup>
// Core imports
import { onMounted, ref } from 'vue';

// Service imports
import { calculateTotalExpenses, getStatusSeverity, updateTrip, useTripList, validateDistance } from '@/services/trip';
import { calculateAssistantWage, calculateDriverWage } from '@/services/wage';

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

// Use the trip list composable with PENDING status filter for pending trips
const { filteredTrips, loading, fetchData, approveTrip, approvingTripId, driverFilterValue, assistantFilterValue, customerFilterValue, vehicleLicenseNumberFilter, startDateFilter, endDateFilter, staffList, customerList, vehicleList } =
    useTripList('PENDING');

// Use another instance of the trip list composable with NON_PENDING status filter for approved trips
const { filteredTrips: approvedTrips, loading: loadingApproved, setPriced, fetchData: fetchApprovedData } = useTripList('NON_PENDING');

// State management
const confirmDialog = ref(false);
const tripToApprove = ref(null);
const savingState = ref({});
const editModeState = ref({});
const priceInputState = ref({});
const settingPriceState = ref({});
const validationErrors = ref({});

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
    // Toggle edit mode
    editModeState.value[tripId] = !editModeState.value[tripId];

    // Clear validation errors when toggling edit mode
    if (!editModeState.value[tripId]) {
        validationErrors.value = {};
    }
};

// Validate trip data before saving
const validateTripEdit = (trip) => {
    // Clear previous validation errors
    validationErrors.value = {};

    // Validate required fields
    if (!trip.startingPoint) {
        validationErrors.value.startingPoint = 'Vui lòng nhập điểm xuất phát';
    }

    if (!trip.endingPoint) {
        validationErrors.value.endingPoint = 'Vui lòng nhập điểm đến';
    }

    // Validate distance using the imported validateDistance function
    const isDistanceValid = validateDistance(trip.distance, { value: validationErrors.value });

    // Return true if no validation errors
    return Object.keys(validationErrors.value).length === 0 && isDistanceValid;
};

// Save trip changes to Supabase
const saveTrip = async (trip) => {
    const tripId = trip.id;

    // Validate trip data before saving
    if (!validateTripEdit(trip)) {
        // Show validation errors
        let errorMessage = 'Vui lòng sửa các lỗi sau:';
        Object.values(validationErrors.value).forEach((error) => {
            errorMessage += `\n- ${error}`;
        });

        toast.add({
            severity: 'error',
            summary: 'Lỗi xác thực',
            detail: errorMessage,
            life: 5000
        });
        return;
    }

    savingState.value[tripId] = true;

    try {
        // Prepare data for update
        const updateData = {
            starting_point: trip.startingPoint,
            ending_point: trip.endingPoint,
            distance: trip.distance,
            expenses: {
                police_fee: trip.expenses.policeFee,
                toll_fee: trip.expenses.tollFee,
                food_fee: trip.expenses.foodFee,
                gas_money: trip.expenses.gasMoney,
                mechanic_fee: trip.expenses.mechanicFee
            },
            updated_at: new Date().toISOString()
        };

        // Use the updateTrip function from the trip service
        await updateTrip(tripId, updateData);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã cập nhật thông tin chuyến đi',
            life: 3000
        });

        // Exit edit mode after successful save
        editModeState.value[tripId] = false;

        // Refresh the trip list
        await fetchData.trips();
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

// Function to handle setting the price for a trip
const handleSetPrice = async (tripId) => {
    const price = priceInputState.value[tripId];

    if (!price || price <= 0) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Giá chuyến đi phải lớn hơn 0',
            life: 3000
        });
        return;
    }

    settingPriceState.value[tripId] = true;

    try {
        await setPriced(tripId, price);
        // Clear the price input after successful update
        priceInputState.value[tripId] = null;

        // Show success message with wage information
        const trip = approvedTrips.value.find((t) => t.id === tripId);
        if (trip) {
            const driverWage = calculateDriverWage({ ...trip, price });
            const assistantWage = calculateAssistantWage({ ...trip, price });

            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: `Đã cập nhật giá chuyến đi và tính lương. Lương tài xế: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(driverWage)}, Lương phụ xe: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(assistantWage)}`,
                life: 5000
            });
        }

        // Explicitly refresh the approved trips list
        await fetchApprovedData.trips();
    } catch (error) {
        console.error('Error setting price:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể cập nhật giá chuyến đi',
            life: 3000
        });
    } finally {
        settingPriceState.value[tripId] = false;
    }
};

// Debug function to log approved trips
const logApprovedTrips = () => {
    console.log('Approved Trips:', approvedTrips.value);
    console.log('Loading Approved:', loadingApproved.value);

    // Check if there are any trips with WAITING_FOR_PRICE status
    const waitingForPriceTrips = approvedTrips.value.filter((trip) => trip.status === 'WAITING_FOR_PRICE');
    console.log('Waiting for price trips:', waitingForPriceTrips);

    // Check if there are any trips with PRICED status
    const pricedTrips = approvedTrips.value.filter((trip) => trip.status === 'PRICED');
    console.log('Priced trips:', pricedTrips);
};

// Fetch data on component mount
onMounted(async () => {
    // Fetch data for pending trips
    fetchData.staff();
    fetchData.customers();
    fetchData.vehicles();
    await fetchData.trips();

    // Fetch data for approved trips
    await fetchApprovedData.trips();

    // Log approved trips for debugging
    setTimeout(() => {
        logApprovedTrips();
    }, 1000);
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

        <!-- Pending Trips Section -->
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div class="flex items-center mb-4">
                <i class="pi pi-clock mr-3 text-yellow-500 text-2xl"></i>
                <div>
                    <h2 class="font-bold text-xl text-gray-800">Danh sách chuyến xe chờ duyệt</h2>
                    <p class="text-sm text-gray-500">Các chuyến xe đang chờ được duyệt</p>
                </div>
                <div class="ml-auto bg-yellow-100 text-yellow-800 font-semibold px-3 py-1 rounded-full text-sm">{{ filteredTrips.length }} chuyến</div>
            </div>

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
            <div v-else class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="min-w-full border-collapse text-xs">
                    <thead class="sticky top-0">
                        <tr class="bg-yellow-50 border-b border-yellow-200">
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Biển số xe</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Thời gian đi</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Điểm đi</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Điểm đến</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Khoảng cách</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Tài xế</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Phụ xe</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Khách hàng</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Chi phí CSGT</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Phí cầu đường</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Chi phí ăn uống</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Chi phí xăng</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Chi phí sửa chữa</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Tổng chi phí</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-yellow-100">Trạng thái</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(trip, index) in filteredTrips" :key="trip.id" :class="{ 'bg-yellow-50/30': index % 2 === 0 }" class="border-b border-yellow-100 hover:bg-yellow-50/50 transition-colors">
                            <td class="px-3 py-2 whitespace-nowrap border-r border-yellow-100" :title="trip.vehicleLicenseNumber">{{ trip.vehicleLicenseNumber }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-yellow-100" :title="$formatDate(trip.tripDate)">{{ $formatDate(trip.tripDate) }}</td>

                            <!-- Editable fields -->
                            <td class="px-3 py-2 border-r border-yellow-100">
                                <div class="flex flex-col">
                                    <InputText
                                        v-model="trip.startingPoint"
                                        :disabled="!editModeState[trip.id]"
                                        class="w-full text-xs disabled:bg-gray-50 disabled:text-gray-500"
                                        :class="{ 'p-invalid': validationErrors.startingPoint && editModeState[trip.id] }"
                                    />
                                    <small v-if="validationErrors.startingPoint && editModeState[trip.id]" class="text-red-500 text-xs mt-1">
                                        {{ validationErrors.startingPoint }}
                                    </small>
                                </div>
                            </td>
                            <td class="px-3 py-2 border-r border-yellow-100">
                                <div class="flex flex-col">
                                    <InputText
                                        v-model="trip.endingPoint"
                                        :disabled="!editModeState[trip.id]"
                                        class="w-full text-xs disabled:bg-gray-50 disabled:text-gray-500"
                                        :class="{ 'p-invalid': validationErrors.endingPoint && editModeState[trip.id] }"
                                    />
                                    <small v-if="validationErrors.endingPoint && editModeState[trip.id]" class="text-red-500 text-xs mt-1">
                                        {{ validationErrors.endingPoint }}
                                    </small>
                                </div>
                            </td>
                            <td class="px-3 py-2 border-r border-yellow-100">
                                <div class="flex flex-col">
                                    <InputText
                                        v-model="trip.distance"
                                        type="number"
                                        :disabled="!editModeState[trip.id]"
                                        class="w-full text-xs disabled:bg-gray-50 disabled:text-gray-500"
                                        :class="{ 'p-invalid': validationErrors.distance && editModeState[trip.id] }"
                                    />
                                    <small v-if="validationErrors.distance && editModeState[trip.id]" class="text-red-500 text-xs mt-1">
                                        {{ validationErrors.distance }}
                                    </small>
                                </div>
                            </td>

                            <td class="px-3 py-2 whitespace-nowrap border-r border-yellow-100" :title="trip.driverName">{{ trip.driverName }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-yellow-100" :title="trip.assistantDriverName">{{ trip.assistantDriverName }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-yellow-100" :title="trip.customerDisplayName">{{ trip.customerDisplayName }}</td>

                            <!-- Editable expense fields with currency format -->
                            <td class="px-3 py-2 border-r border-yellow-100">
                                <InputNumber v-model="trip.expenses.policeFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>
                            <td class="px-3 py-2 border-r border-yellow-100">
                                <InputNumber v-model="trip.expenses.tollFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>
                            <td class="px-3 py-2 border-r border-yellow-100">
                                <InputNumber v-model="trip.expenses.foodFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>
                            <td class="px-3 py-2 border-r border-yellow-100">
                                <InputNumber v-model="trip.expenses.gasMoney" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>
                            <td class="px-3 py-2 border-r border-yellow-100">
                                <InputNumber v-model="trip.expenses.mechanicFee" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" :disabled="!editModeState[trip.id]" class="w-full text-xs" />
                            </td>

                            <td class="px-3 py-2 whitespace-nowrap border-r border-yellow-100" :title="calculateTotalExpenses(trip.expenses)">
                                {{ calculateTotalExpenses(trip.expenses) }}
                            </td>

                            <td class="px-3 py-2 whitespace-nowrap border-r border-yellow-100" :title="translateStatus(trip.status)">
                                <Tag :severity="getStatusSeverity(trip.status)" :value="translateStatus(trip.status)" class="text-xs" />
                            </td>

                            <!-- Actions column -->
                            <td class="px-3 py-2">
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

            <!-- Empty state for pending trips -->
            <div v-if="!loading && filteredTrips.length === 0" class="text-center p-8 bg-yellow-50 rounded-lg border border-yellow-200">
                <i class="pi pi-inbox mb-4 text-yellow-500" style="font-size: 2.5rem"></i>
                <p class="text-gray-600">Không tìm thấy chuyến xe nào chờ duyệt</p>
            </div>
        </div>
    </Fluid>
    <!-- Divider -->
    <div class="my-8 border-t border-gray-200 relative">
        <div class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-gray-400">
            <i class="pi pi-arrow-down"></i>
        </div>
    </div>
    <Fluid>
        <!-- Approved Trips Section -->
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div class="flex items-center mb-4">
                <i class="pi pi-tag mr-3 text-blue-500 text-2xl"></i>
                <div>
                    <h2 class="font-bold text-xl text-gray-800">Danh sách chuyến xe đã duyệt chờ báo giá</h2>
                    <p class="text-sm text-gray-500">Các chuyến xe đã được duyệt và đang chờ báo giá</p>
                </div>
                <div class="ml-auto bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full text-sm">{{ approvedTrips.length }} chuyến</div>
            </div>

            <!-- Loading indicator for approved trips -->
            <div v-if="loadingApproved" class="flex justify-center items-center p-4">
                <ProgressSpinner style="width: 50px; height: 50px" />
            </div>

            <!-- Approved trips table -->
            <div v-else-if="approvedTrips.length > 0" class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="min-w-full border-collapse text-xs">
                    <thead class="sticky top-0">
                        <tr class="bg-blue-50 border-b border-blue-200">
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Biển số xe</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Thời gian đi</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Điểm đi</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Điểm đến</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Khoảng cách</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Tài xế</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Phụ xe</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Khách hàng</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Tổng chi phí</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Trạng thái</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Giá chuyến đi</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Lương tài xế</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-blue-100">Lương phụ xe</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(trip, index) in approvedTrips" :key="trip.id" :class="{ 'bg-blue-50/30': index % 2 === 0 }" class="border-b border-blue-100 hover:bg-blue-50/50 transition-colors">
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="trip.vehicleLicenseNumber">{{ trip.vehicleLicenseNumber }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="$formatDate(trip.tripDate)">{{ $formatDate(trip.tripDate) }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="trip.startingPoint">{{ trip.startingPoint }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="trip.endingPoint">{{ trip.endingPoint }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="trip.distance">{{ trip.distance }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="trip.driverName">{{ trip.driverName }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="trip.assistantDriverName">{{ trip.assistantDriverName }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="trip.customerDisplayName">{{ trip.customerDisplayName }}</td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="calculateTotalExpenses(trip.expenses)">
                                {{ calculateTotalExpenses(trip.expenses) }}
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="translateStatus(trip.status)">
                                <Tag :severity="getStatusSeverity(trip.status)" :value="translateStatus(trip.status)" class="text-xs" />
                            </td>

                            <!-- Price input field (only for WAITING_FOR_PRICE status) -->
                            <td class="px-3 py-2 border-r border-blue-100">
                                <div v-if="trip.status === 'PRICED'" class="whitespace-nowrap font-medium text-green-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.price) }}
                                </div>
                                <InputNumber v-else v-model="priceInputState[trip.id]" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" placeholder="Nhập giá chuyến đi" class="w-full text-xs" />
                            </td>

                            <!-- Driver wage (only for PRICED status) -->
                            <td class="px-3 py-2 border-r border-blue-100">
                                <div v-if="trip.status === 'PRICED'" class="whitespace-nowrap font-medium text-blue-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculateDriverWage(trip)) }}
                                </div>
                                <div v-else class="text-gray-400 italic">Chưa có</div>
                            </td>

                            <!-- Assistant wage (only for PRICED status) -->
                            <td class="px-3 py-2 border-r border-blue-100">
                                <div v-if="trip.status === 'PRICED'" class="whitespace-nowrap font-medium text-blue-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculateAssistantWage(trip)) }}
                                </div>
                                <div v-else class="text-gray-400 italic">Chưa có</div>
                            </td>

                            <!-- Actions column -->
                            <td class="px-3 py-2">
                                <div class="flex gap-1">
                                    <Button
                                        v-if="trip.status === 'WAITING_FOR_PRICE'"
                                        icon="pi pi-check"
                                        label="Báo giá"
                                        severity="success"
                                        size="small"
                                        :loading="settingPriceState[trip.id]"
                                        @click="handleSetPrice(trip.id)"
                                        class="text-xs"
                                        :disabled="!priceInputState[trip.id] || priceInputState[trip.id] <= 0"
                                    />
                                    <div v-else-if="trip.status === 'PRICED'" class="text-xs text-green-600 flex items-center"><i class="pi pi-check-circle mr-1"></i> Đã báo giá</div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Empty state for approved trips -->
            <div v-else class="text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
                <i class="pi pi-inbox mb-4 text-blue-500" style="font-size: 2.5rem"></i>
                <p class="text-gray-600">Không tìm thấy chuyến xe nào đã duyệt chờ báo giá</p>
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
