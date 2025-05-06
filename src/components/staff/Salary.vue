<script setup>
import { supabase } from '@/config/supabase';
import { formatCurrency } from '@/services/salary';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import TabPanel from 'primevue/tabpanel';
import TabView from 'primevue/tabview';
import Tag from 'primevue/tag';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const staffId = route.params.id;
const staffInfo = ref(null);
const trips = ref([]);
const loading = ref(true);

// Separate trips based on role (driver or assistant)
const driverTrips = computed(() => trips.value.filter(trip => trip.role === 'driver'));
const assistantTrips = computed(() => trips.value.filter(trip => trip.role === 'assistant'));

// Format date for display
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN').format(date);
};

// Get trip status tag severity
const getStatusSeverity = (status) => {
    switch (status) {
        case 'PENDING': return 'warning';
        case 'WAITING_FOR_PRICE': return 'info';
        case 'PRICED': return 'success';
        default: return 'secondary';
    }
};

// Translate status for display
const translateStatus = (status) => {
    switch (status) {
        case 'PENDING': return 'Chờ xử lý';
        case 'WAITING_FOR_PRICE': return 'Chờ báo giá';
        case 'PRICED': return 'Đã báo giá';
        default: return status;
    }
};

// Calculate total expenses from expense object
const calculateTotalExpenses = (expenses) => {
    if (!expenses) return 0;
    
    return (
        Number(expenses.policeFee || 0) +
        Number(expenses.tollFee || 0) +
        Number(expenses.foodFee || 0) +
        Number(expenses.gasMoney || 0) +
        Number(expenses.mechanicFee || 0)
    );
};

// Load staff details and their trips
const loadStaffData = async () => {
    try {
        loading.value = true;
        
        // Fetch staff information
        const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('*')
            .eq('id', staffId)
            .single();
            
        if (staffError) throw staffError;
        staffInfo.value = staffData;
        
        // Fetch trips for this staff member
        const { data: driverTrips, error: driverError } = await supabase
            .from('trips')
            .select(`
                *,
                customers:customer_id(*),
                vehicles:vehicle_id(*),
                driver:driver_id(*),
                assistant:assistant_id(*)
            `)
            .eq('driver_id', staffId)
            .eq('status', 'PRICED');

        if (driverError) throw driverError;

        const { data: assistantTrips, error: assistantError } = await supabase
            .from('trips')
            .select(`
                *,
                customers:customer_id(*),
                vehicles:vehicle_id(*),
                driver:driver_id(*),
                assistant:assistant_id(*)
            `)
            .eq('assistant_id', staffId)
            .eq('status', 'PRICED');

        if (assistantError) throw assistantError;

        // Combine trips and add role information
        trips.value = [
            ...(driverTrips || []).map(trip => ({ 
                ...trip, 
                role: 'driver',
                salary: trip.salary?.driver || 0 
            })),
            ...(assistantTrips || []).map(trip => ({ 
                ...trip, 
                role: 'assistant',
                salary: trip.salary?.assistant || 0 
            }))
        ];
    } catch (error) {
        console.error('Error loading staff data:', error);
        trips.value = []; // Reset trips on error
    } finally {
        loading.value = false;
    }
};

onMounted(loadStaffData);
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-4">
                <Button label="Quay lại" icon="pi pi-arrow-left" @click="$router.push('/staff/list')" />
                <div class="font-semibold text-xl" v-if="staffInfo">
                    Chuyến xe của {{ staffInfo.full_name }}
                </div>
            </div>
        </div>

        <div v-if="loading" class="flex justify-center my-8">
            <ProgressSpinner />
        </div>

        <div v-else-if="trips.length === 0" class="text-center my-8">
            <i class="pi pi-car mb-4" style="font-size: 2rem"></i>
            <p>Nhân viên này chưa có chuyến xe nào</p>
        </div>

        <TabView v-else>
            <TabPanel header="Tất cả chuyến">
                <DataTable 
                    :value="trips" 
                    :paginator="true" 
                    :rows="10"
                    :rowsPerPageOptions="[5, 10, 20, 50]"
                    responsiveLayout="scroll"
                    sortField="trip_date"
                    :sortOrder="-1"
                    stripedRows
                    tableStyle="min-width: 100%"
                >
                    <Column field="role" header="Vai trò" style="width: 8rem">
                        <template #body="{ data }">
                            <Tag 
                                :value="data.role === 'driver' ? 'Tài xế' : 'Phụ xe'" 
                                :severity="data.role === 'driver' ? 'success' : 'info'" 
                            />
                        </template>
                    </Column>
                    <Column field="trip_date" header="Ngày đi" sortable style="width: 10rem">
                        <template #body="{ data }">
                            {{ formatDate(data.trip_date) }}
                        </template>
                    </Column>
                    <Column field="starting_point" header="Điểm đi" sortable>
                        <template #body="{ data }">
                            <div class="truncate max-w-xs">{{ data.starting_point }}</div>
                        </template>
                    </Column>
                    <Column field="ending_point" header="Điểm đến" sortable>
                        <template #body="{ data }">
                            <div class="truncate max-w-xs">{{ data.ending_point }}</div>
                        </template>
                    </Column>
                    <Column field="distance" header="Khoảng cách" sortable style="width: 10rem">
                        <template #body="{ data }">
                            {{ data.distance || 0 }} km
                        </template>
                    </Column>
                    <Column field="price_for_staff" header="Giá chuyến" sortable style="width: 12rem">
                        <template #body="{ data }">
                            {{ formatCurrency(data.price_for_staff || 0) }}
                        </template>
                    </Column>
                    <Column field="salary" header="Lương" sortable style="width: 12rem">
                        <template #body="{ data }">
                            {{ formatCurrency(data.salary || 0) }}
                        </template>
                    </Column>
                    <Column field="status" header="Trạng thái" sortable style="width: 10rem">
                        <template #body="{ data }">
                            <Tag :value="translateStatus(data.status)" :severity="getStatusSeverity(data.status)" />
                        </template>
                    </Column>
                </DataTable>
            </TabPanel>
            
            <TabPanel header="Tài xế" :disabled="driverTrips.length === 0">
                <DataTable 
                    :value="driverTrips" 
                    :paginator="true" 
                    :rows="10"
                    :rowsPerPageOptions="[5, 10, 20, 50]"
                    responsiveLayout="scroll"
                    sortField="trip_date"
                    :sortOrder="-1"
                    stripedRows
                    tableStyle="min-width: 100%"
                >
                    <Column field="trip_date" header="Ngày đi" sortable style="width: 10rem">
                        <template #body="{ data }">
                            {{ formatDate(data.trip_date) }}
                        </template>
                    </Column>
                    <Column field="customers.company_name" header="Khách hàng" sortable style="width: 15rem">
                        <template #body="{ data }">
                            {{ data.customers?.company_name || data.customers?.representative_name || 'N/A' }}
                        </template>
                    </Column>
                    <Column field="vehicles.license_number" header="Biển số xe" style="width: 10rem">
                        <template #body="{ data }">
                            {{ data.vehicles?.license_number || 'N/A' }}
                        </template>
                    </Column>
                    <Column field="starting_point" header="Điểm đi" sortable>
                        <template #body="{ data }">
                            <div class="truncate max-w-xs">{{ data.starting_point }}</div>
                        </template>
                    </Column>
                    <Column field="ending_point" header="Điểm đến" sortable>
                        <template #body="{ data }">
                            <div class="truncate max-w-xs">{{ data.ending_point }}</div>
                        </template>
                    </Column>
                    <Column field="price_for_staff" header="Giá chuyến" sortable style="width: 12rem">
                        <template #body="{ data }">
                            {{ formatCurrency(data.price_for_staff || 0) }}
                        </template>
                    </Column>
                    <Column field="salary" header="Lương" sortable style="width: 12rem">
                        <template #body="{ data }">
                            {{ formatCurrency(data.salary || 0) }}
                        </template>
                    </Column>
                </DataTable>
            </TabPanel>
            
            <TabPanel header="Phụ xe" :disabled="assistantTrips.length === 0">
                <DataTable 
                    :value="assistantTrips" 
                    :paginator="true" 
                    :rows="10"
                    :rowsPerPageOptions="[5, 10, 20, 50]"
                    responsiveLayout="scroll"
                    sortField="trip_date"
                    :sortOrder="-1"
                    stripedRows
                    tableStyle="min-width: 100%"
                >
                    <Column field="trip_date" header="Ngày đi" sortable style="width: 10rem">
                        <template #body="{ data }">
                            {{ formatDate(data.trip_date) }}
                        </template>
                    </Column>
                    <Column field="customers.company_name" header="Khách hàng" sortable style="width: 15rem">
                        <template #body="{ data }">
                            {{ data.customers?.company_name || data.customers?.representative_name || 'N/A' }}
                        </template>
                    </Column>
                    <Column field="vehicles.license_number" header="Biển số xe" style="width: 10rem">
                        <template #body="{ data }">
                            {{ data.vehicles?.license_number || 'N/A' }}
                        </template>
                    </Column>
                    <Column field="driver.full_name" header="Tài xế" style="width: 15rem">
                        <template #body="{ data }">
                            {{ data.driver?.full_name || 'N/A' }}
                        </template>
                    </Column>
                    <Column field="starting_point" header="Điểm đi" sortable>
                        <template #body="{ data }">
                            <div class="truncate max-w-xs">{{ data.starting_point }}</div>
                        </template>
                    </Column>
                    <Column field="ending_point" header="Điểm đến" sortable>
                        <template #body="{ data }">
                            <div class="truncate max-w-xs">{{ data.ending_point }}</div>
                        </template>
                    </Column>
                    <Column field="price_for_staff" header="Giá chuyến" sortable style="width: 12rem">
                        <template #body="{ data }">
                            {{ formatCurrency(data.price_for_staff || 0) }}
                        </template>
                    </Column>
                    <Column field="salary" header="Lương" sortable style="width: 12rem">
                        <template #body="{ data }">
                            {{ formatCurrency(data.salary || 0) }}
                        </template>
                    </Column>
                </DataTable>
            </TabPanel>
        </TabView>
    </div>
</template>

<style scoped>
.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card {
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
}
</style>