<script setup>
// Core imports
import { onMounted, ref, watch } from 'vue';

// Service imports
import { calculateAssistantWage, calculateDriverWage } from '@/services/salary';
import { calculateTotalExpenses, getStatusSeverity, useTripList } from '@/services/trip';

// PrimeVue component imports
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import Button from 'primevue/button';
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

// Use the trip list composable with NON_PENDING status filter for approved trips
const { filteredTrips: approvedTrips, loading: loadingApproved, setPriced, fetchData: fetchApprovedData, vehicleList } = useTripList('NON_PENDING');

// State management
const priceInputState = ref({});
const settingPriceState = ref({});
const calculatedWages = ref({});

// Calculate wages when price input changes
const calculateWagesForInput = (tripId, priceForStaff) => {
    if (!tripId || !priceForStaff || priceForStaff <= 0) {
        if (calculatedWages.value && calculatedWages.value[tripId]) {
            calculatedWages.value[tripId] = null;
        }
        return;
    }
    
    const trip = approvedTrips.value.find(t => t.id === tripId);
    if (trip) {
        // Ensure calculatedWages.value is an object
        if (!calculatedWages.value) {
            calculatedWages.value = {};
        }
        
        calculatedWages.value[tripId] = {
            driverWage: calculateDriverWage({ ...trip, price_for_staff: priceForStaff }),
            assistantWage: calculateAssistantWage({ ...trip, price_for_staff: priceForStaff })
        };
    }
};

// Watch for price input changes to update calculated wages
watch(priceInputState, (newValues) => {
    if (newValues) {
        Object.entries(newValues).forEach(([tripId, price]) => {
            if (tripId && price) {
                calculateWagesForInput(tripId, price);
            }
        });
    }
}, { deep: true });

// Function to handle setting the price for a trip
const handleSetPrice = async (tripId) => {
    const priceForStaff = priceInputState.value[tripId];

    if (!priceForStaff || priceForStaff <= 0) {
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
        // Use a fixed price for customer (e.g., 10% higher than staff price)
        const priceForCustomer = priceForStaff * 1.1;
        
        // Pass both prices to the setPriced function
        await setPriced(tripId, priceForCustomer, priceForStaff);
        
        // Clear the price input and calculated wages after successful update
        priceInputState.value[tripId] = null;
        if (calculatedWages.value) {
            calculatedWages.value[tripId] = null;
        }

        // Show success message with wage information
        const trip = approvedTrips.value.find((t) => t.id === tripId);
        if (trip) {
            const driverWage = calculateDriverWage({ ...trip, price_for_staff: priceForStaff });
            const assistantWage = calculateAssistantWage({ ...trip, price_for_staff: priceForStaff });

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

// Fetch data on component mount
onMounted(async () => {
    await fetchApprovedData.trips();
});
</script>

<template>
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
                            <td class="px-3 py-2 border-r border-blue-100">
                                <SearchableSelect
                                    v-model="trip.vehicleId"
                                    :options="vehicleList"
                                    optionLabel="label"
                                    optionValue="value"
                                    :disabled="true"
                                    class="w-full text-xs"
                                    :placeholder="trip.vehicleLicenseNumber"
                                />
                            </td>
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
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.priceForStaff || trip.price_for_staff || trip.price) }}
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <InputNumber 
                                        v-model="priceInputState[trip.id]" 
                                        mode="currency" 
                                        currency="VND" 
                                        locale="vi-VN" 
                                        :minFractionDigits="0" 
                                        :maxFractionDigits="0" 
                                        placeholder="Nhập giá cho nhân viên" 
                                        class="w-full text-xs"
                                        @update:modelValue="value => calculateWagesForInput(trip.id, value)" 
                                    />
                                    <div v-if="calculatedWages.value && calculatedWages.value[trip.id]" class="text-xs mt-1 text-gray-500">
                                        <div class="flex justify-between">
                                            <span>Lương tài xế:</span>
                                            <span class="font-medium text-blue-600">{{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculatedWages.value[trip.id].driverWage) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span>Lương phụ xe:</span>
                                            <span class="font-medium text-blue-600">{{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculatedWages.value[trip.id].assistantWage) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <!-- Driver wage (only for PRICED status) -->
                            <td class="px-3 py-2 border-r border-blue-100">
                                <div v-if="trip.status === 'PRICED'" class="whitespace-nowrap font-medium text-blue-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculateDriverWage(trip)) }}
                                </div>
                                <div v-else-if="calculatedWages.value && calculatedWages.value[trip.id]" class="whitespace-nowrap font-medium text-blue-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculatedWages.value[trip.id].driverWage) }}
                                </div>
                                <div v-else class="text-gray-400 italic">Chưa có</div>
                            </td>

                            <!-- Assistant wage (only for PRICED status) -->
                            <td class="px-3 py-2 border-r border-blue-100">
                                <div v-if="trip.status === 'PRICED'" class="whitespace-nowrap font-medium text-blue-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculateAssistantWage(trip)) }}
                                </div>
                                <div v-else-if="calculatedWages.value && calculatedWages.value[trip.id]" class="whitespace-nowrap font-medium text-blue-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculatedWages.value[trip.id].assistantWage) }}
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