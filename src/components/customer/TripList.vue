<script setup>
import { supabase } from '@/config/supabase';
import { formatCurrency } from '@/services/debt';
import { formatTimestamp } from '@/services/trip';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import TabPanel from 'primevue/tabpanel';
import TabView from 'primevue/tabview';
import Tag from 'primevue/tag';
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
const activeTab = ref(0);

// Function to group trips by month and year with more efficient grouping
const groupTripsByMonth = (trips) => {
    if (!trips || !trips.length) return [];
    
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
                profit: 0,
                displayName: `Tháng ${month.toString().padStart(2, '0')}/${year}`
            };
        }

        const group = groupedTrips[key];
        group.trips.push(trip);
        
        // Calculate financial data in one pass
        const tripPrice = Number(trip.price_for_customer) || 0;
        const tripExpenses = calculateTotalExpensesValue(trip.expenses);
        
        group.totalPrice += tripPrice;
        group.totalExpenses += tripExpenses;
        group.profit = group.totalPrice - group.totalExpenses;
    });

    // Convert to array and sort by date (newest first)
    return Object.values(groupedTrips).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
};

// Calculated expense value for a trip
function calculateTotalExpensesValue(expenses) {
    if (!expenses) return 0;
    return Object.values(expenses).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

// Computed properties for financial summaries
const totalTripPrice = computed(() => {
    return trips.value.reduce((sum, trip) => sum + (Number(trip.price_for_customer) || 0), 0);
});

const totalTripExpenses = computed(() => {
    return trips.value.reduce((sum, trip) => sum + calculateTotalExpensesValue(trip.expenses), 0);
});

const totalProfit = computed(() => {
    return totalTripPrice.value - totalTripExpenses.value;
});

// Group trips by month
const monthlyTrips = computed(() => {
    return groupTripsByMonth(trips.value);
});

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Translate status for display
function translateStatus(status) {
    const statusMap = {
        'PENDING': 'Chờ duyệt',
        'WAITING_FOR_PRICE': 'Chờ báo giá',
        'PRICED': 'Đã báo giá'
    };
    return statusMap[status] || status;
}

// Get severity class for status tag
function getStatusSeverity(status) {
    const severityMap = {
        'PENDING': 'info',
        'WAITING_FOR_PRICE': 'warning',
        'PRICED': 'success'
    };
    return severityMap[status] || 'info';
}

// Main data fetching function
async function fetchData() {
    loading.value = true;
    try {
        await Promise.all([
            fetchCustomer(),
            fetchCustomerTrips()
        ]);
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

// Fetch customer details
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

// Fetch trips for the selected customer
async function fetchCustomerTrips() {
    try {
        const { data, error } = await supabase
            .from('trips')
            .select(`
                *,
                vehicles(id, license_number),
                driver:staff!fk_driver(id, full_name),
                assistant:staff!fk_assistant(id, full_name)
            `)
            .eq('customer_id', customerId);

        if (error) throw error;

        // Transform data to match the expected format
        trips.value = data.map((trip) => ({
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
            price_for_customer: trip.price_for_customer,
            price_for_staff: trip.price_for_staff,
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
        })).sort((a, b) => {
            const dateA = a.tripDate ? new Date(a.tripDate) : new Date(0);
            const dateB = b.tripDate ? new Date(b.tripDate) : new Date(0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error('Error fetching trips:', error);
        throw error;
    }
}

// Go back to customer debt page
function goBack() {
    router.push(`/customer/debt/${customerId}`);
}

// Navigate to trip details
function viewTripDetails(tripId) {
    router.push(`/trip/edit/${tripId}`);
}

onMounted(async () => {
    await fetchData();
});
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

            <!-- Trips in tabs -->
            <div v-if="monthlyTrips.length > 0" class="bg-white p-4 rounded-lg shadow-sm">
                <TabView v-model:activeIndex="activeTab" class="trip-tabs">
                    <TabPanel v-for="month in monthlyTrips" :key="`${month.year}-${month.month}`" :header="month.displayName">
                        <div class="mb-4">
                            <!-- Month summary -->
                            <div class="flex justify-end gap-4 mb-4 bg-gray-50 p-3 rounded-lg">
                                <div class="text-right">
                                    <div class="text-sm text-gray-600">Tổng chi phí</div>
                                    <div class="font-semibold text-orange-500">{{ formatCurrency(month.totalExpenses) }}</div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm text-gray-600">Tổng giá trị</div>
                                    <div class="font-semibold text-blue-600">{{ formatCurrency(month.totalPrice) }}</div>
                                </div>
                            </div>

                            <!-- Trip data table -->
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
                                tableStyle="min-width: 100%"
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
                                    <template #body="{ data }">{{ data.distance || 0 }} km</template>
                                </Column>
                                <Column field="expenses" header="Chi phí" sortable style="min-width: 120px; max-width: 140px">
                                    <template #body="{ data }">
                                        {{ formatCurrency(calculateTotalExpensesValue(data.expenses)) }}
                                    </template>
                                </Column>
                                <Column field="price_for_staff" header="Giá cho nhân viên" sortable style="min-width: 120px; max-width: 140px">
                                    <template #body="{ data }">
                                        {{ formatCurrency(data.price_for_staff || 0) }}
                                    </template>
                                </Column>
                                <Column field="price_for_customer" header="Giá cho khách hàng" sortable style="min-width: 120px; max-width: 140px">
                                    <template #body="{ data }">
                                        {{ formatCurrency(data.price_for_customer || 0) }}
                                    </template>
                                </Column>
                                <Column field="status" header="Trạng thái" sortable style="min-width: 100px; max-width: 120px">
                                    <template #body="{ data }">
                                        <Tag :value="translateStatus(data.status)" :severity="getStatusSeverity(data.status)" />
                                    </template>
                                </Column>
                                <Column field="createdAt" header="Ngày tạo" sortable style="min-width: 100px; max-width: 120px">
                                    <template #body="{ data }">
                                        {{ formatTimestamp(data.createdAt) }}
                                    </template>
                                </Column>
                                <Column header="Thao tác" style="min-width: 100px; max-width: 120px">
                                    <template #body="{ data }">
                                        <Button 
                                            icon="pi pi-external-link" 
                                            label="Chi tiết" 
                                            size="small" 
                                            class="p-button-sm" 
                                            @click="viewTripDetails(data.id)" 
                                        />
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </TabPanel>
                </TabView>
            </div>

            <!-- Empty state -->
            <div v-else class="text-center p-6 bg-gray-50 rounded-lg">
                <i class="pi pi-inbox mb-4 text-gray-400" style="font-size: 3rem"></i>
                <p class="text-lg text-gray-600">Không tìm thấy chuyến xe nào cho khách hàng này</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
    font-weight: 600;
}

:deep(.p-paginator) {
    padding: 0.5rem;
    font-size: 0.875rem;
}

:deep(.p-tag) {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
}

/* Tab styling */
:deep(.p-tabview-nav) {
    border-bottom: 1px solid #e5e7eb;
}

:deep(.p-tabview-nav-link) {
    padding: 0.75rem 1.5rem;
    font-weight: 500;
}

:deep(.p-tabview-selected) {
    background-color: #f0f5ff;
    border-color: #3b82f6;
    color: #3b82f6;
}

.trip-tabs {
    border-radius: 0.5rem;
    overflow: hidden;
}
</style>
