<script setup>
import { supabase } from '@/config/supabase';
import { addOrUpdateDebt, formatCurrency } from '@/services/debt';
import { formatTimestamp } from '@/services/trip';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const customerId = route.params.id;
const customer = ref(null);
const trips = ref([]);
const loading = ref(false);
const confirmDebtDialog = ref(false);
const currentYear = new Date().getFullYear();
const expandedMonths = ref({});

// Function to group trips by month
const groupTripsByMonth = (trips) => {
    const groupedTrips = {};

    // Process all trips
    trips.forEach((trip) => {
        if (!trip.tripDate) return;

        const tripDate = new Date(trip.tripDate);
        const year = tripDate.getFullYear();
        const month = tripDate.getMonth() + 1; // JavaScript months are 0-indexed

        const key = `${year}-${month.toString().padStart(2, '0')}`;

        if (!groupedTrips[key]) {
            groupedTrips[key] = {
                year,
                month,
                trips: [],
                totalPrice: 0,
                totalExpenses: 0,
                displayName: `Tháng ${month.toString().padStart(2, '0')}/${year}`
            };
        }

        groupedTrips[key].trips.push(trip);
        groupedTrips[key].totalPrice += trip.price || 0;

        // Calculate expenses for this trip
        if (trip.expenses) {
            const expenseTotal = Object.values(trip.expenses).reduce((sum, value) => sum + (value || 0), 0);
            groupedTrips[key].totalExpenses += expenseTotal;
        }
    });

    // Convert to array and sort by date (newest first)
    return Object.values(groupedTrips).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
};

// Computed properties
const totalTripPrice = computed(() => {
    return trips.value.reduce((sum, trip) => sum + (trip.price || 0), 0);
});

const totalTripExpenses = computed(() => {
    return trips.value.reduce((sum, trip) => {
        if (!trip.expenses) return sum;
        const expenseTotal = Object.values(trip.expenses).reduce((expSum, value) => expSum + (value || 0), 0);
        return sum + expenseTotal;
    }, 0);
});

const totalProfit = computed(() => {
    return totalTripPrice.value - totalTripExpenses.value;
});

// Group trips by month
const monthlyTrips = computed(() => {
    return groupTripsByMonth(trips.value);
});

// Toggle month expansion
function toggleMonthExpansion(monthKey) {
    expandedMonths.value[monthKey] = !expandedMonths.value[monthKey];
}

// Initialize expanded state for all months
function initializeExpandedMonths() {
    const months = groupTripsByMonth(trips.value);
    months.forEach((month, index) => {
        // Expand only the first month by default
        expandedMonths.value[`${month.year}-${month.month.toString().padStart(2, '0')}`] = index === 0;
    });
}

onMounted(async () => {
    await fetchData();
    // Initialize expanded months after data is loaded
    initializeExpandedMonths();
});

async function fetchData() {
    loading.value = true;
    try {
        // Fetch customer data
        await fetchCustomer();

        // Fetch trips for this customer
        await fetchCustomerTrips();
    } catch (error) {
        console.error('Error fetching data:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải dữ liệu chuyến xe',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function fetchCustomer() {
    try {
        const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).single();

        if (error) throw error;

        if (data) {
            customer.value = {
                id: data.id,
                companyName: data.company_name,
                representativeName: data.representative_name,
                contactNumber: data.contact_number,
                email: data.email,
                address: data.address,
                taxNumber: data.tax_number
            };
        } else {
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không tìm thấy thông tin khách hàng',
                life: 3000
            });
            router.push('/customer/list');
        }
    } catch (error) {
        console.error('Error fetching customer:', error);
        throw error;
    }
}

async function fetchCustomerTrips() {
    try {
        const { data, error } = await supabase
            .from('trips')
            .select(
                `
                *,
                vehicles(id, license_number),
                driver:staff!fk_driver(id, full_name),
                assistant:staff!fk_assistant(id, full_name)
            `
            )
            .eq('customer_id', customerId);

        if (error) throw error;

        // Transform data to match the expected format
        const tripsData = data.map((trip) => ({
            id: trip.id,
            customerId: trip.customer_id,
            vehicleId: trip.vehicle_id,
            driverId: trip.driver_id,
            assistantId: trip.assistant_id,
            startingPoint: trip.starting_point,
            endingPoint: trip.ending_point,
            distance: trip.distance,
            tripDate: trip.trip_date,
            status: trip.status,
            price: trip.price,
            expenses: {
                policeFee: trip.expenses?.police_fee || 0,
                tollFee: trip.expenses?.toll_fee || 0,
                foodFee: trip.expenses?.food_fee || 0,
                gasMoney: trip.expenses?.gas_money || 0,
                mechanicFee: trip.expenses?.mechanic_fee || 0
            },
            // Add derived fields
            vehicleLicenseNumber: trip.vehicles?.license_number || 'Unknown',
            driverName: trip.driver?.full_name || 'Unknown',
            assistantDriverName: trip.assistant?.full_name || 'Unknown',
            createdAt: trip.created_at,
            updatedAt: trip.updated_at
        }));

        // Sort trips by date (newest first)
        trips.value = tripsData.sort((a, b) => {
            const dateA = a.tripDate ? new Date(a.tripDate) : new Date(0);
            const dateB = b.tripDate ? new Date(b.tripDate) : new Date(0);
            return dateB - dateA;
        });

        // Initialize expanded months after trips are loaded
        initializeExpandedMonths();
    } catch (error) {
        console.error('Error fetching trips:', error);
        throw error;
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function calculateTotalExpensesValue(expenses) {
    if (!expenses) return 0;
    return Object.values(expenses).reduce((sum, value) => sum + (value || 0), 0);
}

async function addAsDebt() {
    try {
        // Allow adding debt even when total price is 0
        if (totalTripPrice.value < 0) {
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Tổng giá trị chuyến xe không thể âm',
                life: 3000
            });
            return;
        }

        await addOrUpdateDebt(customerId, customer.value.companyName, customer.value.representativeName, currentYear, totalTripPrice.value);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã thêm tổng giá trị chuyến xe vào công nợ',
            life: 3000
        });

        confirmDebtDialog.value = false;
    } catch (error) {
        console.error('Error adding debt:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể thêm công nợ',
            life: 3000
        });
    }
}

function goBack() {
    router.push(`/customer/debt/${customerId}`);
}
</script>

<template>
    <div class="card">
        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <div v-else>
            <!-- Customer info header -->
            <div class="flex justify-between items-center mb-4">
                <div>
                    <Button icon="pi pi-arrow-left" text @click="goBack" class="mr-2" />
                    <span class="font-semibold text-xl">Danh sách chuyến xe của khách hàng</span>
                </div>
            </div>

            <!-- Customer details -->
            <Card class="mb-4">
                <template #title>
                    <div class="text-xl font-bold">{{ customer?.companyName || '(Không có tên công ty)' }}</div>
                </template>
                <template #subtitle>
                    <div class="text-gray-600">Người đại diện: {{ customer?.representativeName }}</div>
                </template>
                <template #content>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <div class="text-sm text-gray-600">Số điện thoại</div>
                            <div>{{ customer?.contactNumber || 'Không có' }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Email</div>
                            <div>{{ customer?.email || 'Không có' }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Tổng giá trị chuyến xe</div>
                            <div class="text-xl font-bold text-blue-600">
                                {{ formatCurrency(totalTripPrice) }}
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Summary cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card class="shadow-sm">
                    <template #title>
                        <div class="text-lg font-bold">Tổng giá trị chuyến xe</div>
                    </template>
                    <template #content>
                        <div class="text-2xl font-bold text-blue-600">{{ formatCurrency(totalTripPrice) }}</div>
                    </template>
                </Card>

                <Card class="shadow-sm">
                    <template #title>
                        <div class="text-lg font-bold">Tổng chi phí</div>
                    </template>
                    <template #content>
                        <div class="text-2xl font-bold text-orange-500">{{ formatCurrency(totalTripExpenses) }}</div>
                    </template>
                </Card>

                <Card class="shadow-sm">
                    <template #title>
                        <div class="text-lg font-bold">Lợi nhuận</div>
                    </template>
                    <template #content>
                        <div class="text-2xl font-bold" :class="{ 'text-green-600': totalProfit > 0, 'text-red-500': totalProfit <= 0 }">
                            {{ formatCurrency(totalProfit) }}
                        </div>
                    </template>
                </Card>
            </div>

            <!-- Trips grouped by month -->
            <div v-if="monthlyTrips.length > 0">
                <div v-for="month in monthlyTrips" :key="`${month.year}-${month.month}`" class="mb-4">
                    <!-- Month header with toggle -->
                    <div class="flex justify-between items-center p-3 bg-blue-50 rounded-t-lg border border-blue-200 cursor-pointer" @click="toggleMonthExpansion(`${month.year}-${month.month.toString().padStart(2, '0')}`)">
                        <div class="flex items-center">
                            <i :class="expandedMonths[`${month.year}-${month.month.toString().padStart(2, '0')}`] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="mr-2"></i>
                            <span class="font-bold text-lg">{{ month.displayName }}</span>
                        </div>
                        <div class="flex gap-4">
                            <div class="text-right">
                                <div class="text-sm text-gray-600">Tổng chi phí</div>
                                <div class="font-semibold text-orange-500">{{ formatCurrency(month.totalExpenses) }}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-gray-600">Tổng giá trị</div>
                                <div class="font-semibold text-blue-600">{{ formatCurrency(month.totalPrice) }}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-gray-600">Lợi nhuận</div>
                                <div class="font-semibold" :class="month.totalPrice - month.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'">
                                    {{ formatCurrency(month.totalPrice - month.totalExpenses) }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Month trips table (collapsible) -->
                    <div v-if="expandedMonths[`${month.year}-${month.month.toString().padStart(2, '0')}`]" class="border border-t-0 border-gray-200 rounded-b-lg">
                        <DataTable
                            :value="month.trips"
                            :paginator="true"
                            :rows="10"
                            :rowsPerPageOptions="[5, 10, 20, 50]"
                            responsiveLayout="scroll"
                            class="p-datatable-sm"
                            :sortField="'tripDate'"
                            :sortOrder="-1"
                            scrollable
                            scrollHeight="400px"
                            size="small"
                            stripedRows
                        >
                            <Column field="tripDate" header="Ngày đi" sortable style="min-width: 100px; max-width: 120px">
                                <template #body="{ data }">
                                    {{ formatDate(data.tripDate) }}
                                </template>
                            </Column>
                            <Column field="vehicleLicenseNumber" header="Biển số xe" sortable style="min-width: 100px; max-width: 120px"></Column>
                            <Column field="startingPoint" header="Điểm đi" sortable style="min-width: 150px; max-width: 200px">
                                <template #body="{ data }">
                                    <div class="truncate-text" :title="data.startingPoint">{{ data.startingPoint }}</div>
                                </template>
                            </Column>
                            <Column field="endingPoint" header="Điểm đến" sortable style="min-width: 150px; max-width: 200px">
                                <template #body="{ data }">
                                    <div class="truncate-text" :title="data.endingPoint">{{ data.endingPoint }}</div>
                                </template>
                            </Column>
                            <Column field="distance" header="Khoảng cách" sortable style="min-width: 80px; max-width: 100px">
                                <template #body="{ data }"> {{ data.distance || 0 }} km </template>
                            </Column>
                            <Column field="expenses" header="Chi phí" sortable style="min-width: 120px; max-width: 140px">
                                <template #body="{ data }">
                                    {{ formatCurrency(calculateTotalExpensesValue(data.expenses)) }}
                                </template>
                            </Column>
                            <Column field="price" header="Giá chuyến" sortable style="min-width: 120px; max-width: 140px">
                                <template #body="{ data }">
                                    {{ formatCurrency(data.price || 0) }}
                                </template>
                            </Column>
                            <Column field="status" header="Trạng thái" sortable style="min-width: 100px; max-width: 120px">
                                <template #body="{ data }">
                                    <Tag
                                        :value="data.status === 'PENDING' ? 'Chờ duyệt' : data.status === 'WAITING_FOR_PRICE' ? 'Chờ báo giá' : 'Đã báo giá'"
                                        :severity="data.status === 'PENDING' ? 'info' : data.status === 'WAITING_FOR_PRICE' ? 'warning' : 'success'"
                                    />
                                </template>
                            </Column>
                            <Column field="createdAt" header="Ngày tạo" sortable style="min-width: 100px; max-width: 120px">
                                <template #body="{ data }">
                                    {{ formatTimestamp(data.createdAt) }}
                                </template>
                            </Column>
                            <Column header="Thao tác" style="min-width: 100px; max-width: 120px">
                                <template #body="slotProps">
                                    <Button label="Chi tiết" size="small" class="p-button-sm" @click="router.push(`/trip/edit/${slotProps.data.id}`)" />
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>
            </div>

            <!-- Empty state -->
            <div v-if="trips.length === 0" class="text-center p-4">
                <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
                <p>Không tìm thấy chuyến xe nào cho khách hàng này</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.card {
    background-color: white;
    border-radius: 0.5rem;
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 1.5rem;
}

/* Month header hover effect */
.bg-blue-50:hover {
    background-color: #e6f0ff;
}

/* Truncate text in table cells */
.truncate-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

/* DataTable styling */
:deep(.p-datatable-wrapper) {
    overflow-x: auto;
}

:deep(.p-datatable-table) {
    min-width: 100%;
}

:deep(.p-datatable-tbody > tr > td) {
    padding: 0.5rem 0.75rem;
}

:deep(.p-datatable-thead > tr > th) {
    padding: 0.75rem;
    background-color: #f8f9fa;
}

:deep(.p-paginator) {
    padding: 0.5rem;
    font-size: 0.875rem;
}

:deep(.p-tag) {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
}
</style>
