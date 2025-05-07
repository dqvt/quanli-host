<script setup>
// Core imports
import { onMounted, ref, watch } from 'vue';

// Service imports
import { supabase } from '@/config/supabase';
import { calculateAssistantWage, calculateDriverWage } from '@/services/salary';
import { calculateTotalExpenses, formatExpensesToFrontend, getStatusSeverity, useTripList } from '@/services/trip';

// Define the selection query (copied from trip.js)
const TRIP_SELECT_WITH_RELATIONS = `
    *,
    customers(id, company_name, representative_name),
    vehicles(id, license_number),
    driver:staff!fk_driver(id, full_name),
    assistant:staff!fk_assistant(id, full_name)
`;

// PrimeVue component imports
import CustomTooltip from '@/components/ui/CustomTooltip.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/calendar';
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

// Use the trip list composable with ALL status filter for all trips
const { 
    filteredTrips: approvedTrips, 
    loading: loadingApproved, 
    setPriced, 
    fetchData: fetchApprovedData, 
    vehicleList,
    staffList,
    customerList,
    driverFilterValue,
    assistantFilterValue,
    customerFilterValue,
    vehicleLicenseNumberFilter,
    startDateFilter,
    endDateFilter
} = useTripList('ALL');

// State management
const settingPriceState = ref({});
const calculatedWages = ref({});

// Calculate wages when price input changes
const calculateWagesForInput = (trip) => {
    // Convert to number and ensure it's valid
    const priceForStaff = Number(trip.price_for_staff) || 0;
    
    if (!trip || priceForStaff <= 0) {
        if (calculatedWages.value && calculatedWages.value[trip.id]) {
            calculatedWages.value[trip.id] = null;
        }
        return;
    }
    
    // Ensure calculatedWages.value is an object
    if (!calculatedWages.value) {
        calculatedWages.value = {};
    }
    
    calculatedWages.value[trip.id] = {
        driverWage: calculateDriverWage({ ...trip, price_for_staff: priceForStaff }),
        assistantWage: calculateAssistantWage({ ...trip, price_for_staff: priceForStaff })
    };
    
    // Debug
    console.log(`Calculated wages for trip ${trip.id} with price ${priceForStaff}:`, calculatedWages.value[trip.id]);
};

// Watch for price input changes to update calculated wages
watch(() => approvedTrips.value, (newTrips) => {
    if (newTrips && newTrips.length) {
        console.log("Watching trips for price changes");
        newTrips.forEach(trip => {
            if (trip.id && trip.price_for_staff) {
                console.log(`Trip ${trip.id} has price_for_staff: ${trip.price_for_staff}`);
                calculateWagesForInput(trip);
            }
        });
    }
}, { deep: true });

// Function to handle setting the price for a trip
const handleSetPrice = async (trip) => {
    // Convert to number and ensure it's greater than 0
    const priceForStaff = Number(trip.price_for_staff) || 0;
    
    if (priceForStaff <= 0) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Giá chuyến đi phải lớn hơn 0',
            life: 3000
        });
        return;
    }

    settingPriceState.value[trip.id] = true;

    try {
        // Use a fixed price for customer (e.g., 10% higher than staff price)
        const priceForCustomer = priceForStaff * 1.1;
        
        console.log('Setting price for trip:', {
            tripId: trip.id,
            priceForStaff,
            priceForCustomer
        });
        
        // Pass both prices to the setPriced function
        const result = await setPriced(trip.id, priceForCustomer, priceForStaff);
        
        console.log('Result from setPriced:', result);
        
        // Clear the calculated wages after successful update
        if (calculatedWages.value) {
            calculatedWages.value[trip.id] = null;
        }

        // Show success message with wage information
        const driverWage = calculateDriverWage({ ...trip, price_for_staff: priceForStaff });
        const assistantWage = calculateAssistantWage({ ...trip, price_for_staff: priceForStaff });

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: `Đã cập nhật giá chuyến đi và tính lương. Lương tài xế: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(driverWage)}, Lương phụ xe: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(assistantWage)}`,
            life: 5000
        });

        // Explicitly refresh the approved trips list
        await fetchApprovedData.trips();
        
        // For debugging
        console.log('Trips after refresh:', approvedTrips.value);
        
        // Force a re-fetch of the specific trip to ensure we have the latest data
        await refetchTrip(trip.id);
    } catch (error) {
        console.error('Error setting price:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể cập nhật giá chuyến đi',
            life: 3000
        });
    } finally {
        settingPriceState.value[trip.id] = false;
    }
};

// Function to refetch a specific trip after price update
const refetchTrip = async (tripId) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .select(TRIP_SELECT_WITH_RELATIONS)
            .eq('id', tripId)
            .single();
            
        if (error) throw error;
        
        console.log('Refetched trip data:', data);
        
        // Update the trip in the list
        const index = approvedTrips.value.findIndex(t => t.id === tripId);
        if (index !== -1) {
            const updatedTrip = {
                id: data.id,
                customerId: data.customer_id,
                vehicleId: data.vehicle_id,
                driverId: data.driver_id,
                assistantId: data.assistant_id,
                startingPoint: data.starting_point,
                endingPoint: data.ending_point,
                distance: data.distance,
                tripDate: data.trip_date,
                status: data.status,
                price: Number(data.price || 0),
                price_for_staff: Number(data.price_for_staff || 0),
                price_for_customer: Number(data.price_for_customer || 0),
                expenses: formatExpensesToFrontend(data.expenses),
                // Add derived fields
                customerDisplayName: data.customers?.company_name || data.customers?.representative_name || 'Unknown',
                vehicleLicenseNumber: data.vehicles?.license_number || 'Unknown',
                driverName: data.driver?.full_name || 'Unknown',
                assistantDriverName: data.assistant?.full_name || 'Unknown',
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
            
            console.log('Updating trip in list:', updatedTrip);
            approvedTrips.value[index] = updatedTrip;
        }
    } catch (err) {
        console.error('Error refetching trip:', err);
    }
};

// Function to format tooltip content for expenses in plain text
const formatExpensesTooltip = (expenses) => {
    if (!expenses) return 'Không có chi phí';
    
    const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
    const totalExpenses = calculateTotalExpenses(expenses);
    
    // Create table-like format for better readability
    return `<div class="expense-tooltip">
        <table>
            <tr><td class="expense-label">Tiền dầu:</td><td class="expense-value">${formatter.format(Number(expenses.gasMoney || 0))}</td></tr>
            <tr><td class="expense-label">Tiền CSGT:</td><td class="expense-value">${formatter.format(Number(expenses.policeFee || 0))}</td></tr>
            <tr><td class="expense-label">Tiền phí đường:</td><td class="expense-value">${formatter.format(Number(expenses.tollFee || 0))}</td></tr>
            <tr><td class="expense-label">Tiền ăn:</td><td class="expense-value">${formatter.format(Number(expenses.foodFee || 0))}</td></tr>
            <tr><td class="expense-label">Tiền sửa xe:</td><td class="expense-value">${formatter.format(Number(expenses.mechanicFee || 0))}</td></tr>
            <tr class="total-row"><td class="expense-label">Tổng chi phí:</td><td class="expense-value">${formatter.format(totalExpenses)}</td></tr>
        </table>
    </div>`;
};

// Fetch data on component mount
onMounted(async () => {
    await fetchApprovedData.trips();
});
</script>

<template>
    <Fluid>
        <!-- Approved Trips Section -->
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div class="flex items-center mb-4">
                <i class="pi pi-tag mr-3 text-green-500 text-2xl"></i>
                <div>
                    <h2 class="font-bold text-xl text-gray-800">Danh sách tất cả chuyến xe</h2>
                    <p class="text-sm text-gray-500">Xem và quản lý tất cả chuyến xe</p>
                </div>
                <div class="ml-auto bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full text-sm">{{ approvedTrips.length }} chuyến</div>
            </div>

            <!-- Filter Section -->
            <div class="bg-gray-50 rounded-lg p-4 shadow-sm mb-4">
                <div class="flex flex-col gap-4">
                    <div class="flex gap-4">
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
                            <SearchableSelect v-model="vehicleLicenseNumberFilter" :options="vehicleList" optionLabel="label" optionValue="value" placeholder="Chọn biển số xe" class="w-full" :showClear="true" />
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

            <!-- Loading indicator for approved trips -->
            <div v-if="loadingApproved" class="flex justify-center items-center p-4">
                <ProgressSpinner style="width: 50px; height: 50px" />
            </div>

            <!-- Approved trips table -->
            <div v-else-if="approvedTrips.length > 0" class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="min-w-full border-collapse text-xs">
                    <thead class="sticky top-0">
                        <tr class="bg-green-50 border-b green-blue-200">
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Biển số xe</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Thời gian đi</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Điểm đi</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Điểm đến</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Khoảng cách</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Tài xế</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Phụ xe</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Khách hàng</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Tổng chi phí</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Trạng thái</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Giá chuyến đi</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Lương tài xế</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800 border-r border-green-100">Lương phụ xe</th>
                            <th class="px-3 py-3 text-left font-semibold text-gray-800">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(trip, index) in approvedTrips" :key="trip.id" :class="{ 'bg-blue-50/30': index % 2 === 0 }" class="border-b border-blue-100 transition-colors">
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
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100 relative">
                                <CustomTooltip :content="formatExpensesTooltip(trip.expenses)" position="top">
                                    <div class="w-full text-right">
                                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculateTotalExpenses(trip.expenses)) }}
                                    </div>
                                </CustomTooltip>
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap border-r border-blue-100" :title="translateStatus(trip.status)">
                                <Tag :severity="getStatusSeverity(trip.status)" :value="translateStatus(trip.status)" class="text-xs" />
                            </td>

                            <!-- Price input field (only for WAITING_FOR_PRICE status) -->
                            <td class="px-3 py-2 border-r border-blue-100">
                                <div v-if="trip.status === 'PRICED'" class="whitespace-nowrap font-medium text-green-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(trip.price_for_staff || 0)) }}
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <InputNumber 
                                        v-model="trip.price_for_staff" 
                                        mode="currency" 
                                        currency="VND" 
                                        locale="vi-VN" 
                                        :minFractionDigits="0" 
                                        :maxFractionDigits="0" 
                                        placeholder="Nhập giá" 
                                        class="w-full text-xs"
                                        @update:modelValue="() => calculateWagesForInput(trip)" 
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
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(calculateDriverWage(trip) || 0)) }}
                                </div>
                                <div v-else-if="calculatedWages.value && calculatedWages.value[trip.id]" class="whitespace-nowrap font-medium text-blue-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculatedWages.value[trip.id].driverWage) }}
                                </div>
                                <div v-else class="text-gray-400 italic">Chưa có</div>
                            </td>

                            <!-- Assistant wage (only for PRICED status) -->
                            <td class="px-3 py-2 border-r border-blue-100">
                                <div v-if="trip.status === 'PRICED'" class="whitespace-nowrap font-medium text-blue-600">
                                    {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(calculateAssistantWage(trip) || 0)) }}
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
                                        @click="handleSetPrice(trip)"
                                        class="text-xs"
                                        :disabled="!trip.price_for_staff || trip.price_for_staff <= 0"
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
                <p class="text-gray-600">Không tìm thấy chuyến xe nào</p>
            </div>
        </div>
    </Fluid>
</template>

<style scoped>
/* Expense tooltip styles */
:deep(.expense-tooltip) {
    padding: 4px;
}

:deep(.expense-tooltip table) {
    width: 100%;
    border-collapse: collapse;
}

:deep(.expense-tooltip tr) {
    border-bottom: 1px solid #eaeaea;
}

:deep(.expense-tooltip tr:last-child) {
    border-bottom: none;
}

:deep(.expense-tooltip .expense-label) {
    padding: 4px 8px 4px 0;
    text-align: left;
    font-weight: 500;
    color: #64748b;
}

:deep(.expense-tooltip .expense-value) {
    padding: 4px 0 4px 8px;
    text-align: right;
    font-weight: 600;
    color: #1e40af;
}

:deep(.expense-tooltip .total-row) {
    border-top: 2px solid #cbd5e1;
    margin-top: 4px;
}

:deep(.expense-tooltip .total-row .expense-label) {
    font-weight: 600;
    color: #334155;
}

:deep(.expense-tooltip .total-row .expense-value) {
    font-weight: 700;
    color: #1e3a8a;
}
</style> 