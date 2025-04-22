<script setup>
import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { onMounted, ref, watch } from 'vue';

// Reactive state using individual refs for better reactivity
const selectedDriver = ref('');
const drivers = ref([]);
const trips = ref([]);
const loading = ref(false);
const filteredDrivers = ref([]);

// Firebase collection reference
const tripsRef = collection(db, 'trips');

// Fetch and process trips data
async function fetchTrips(driverFilter = '') {
    loading.value = true;
    try {
        let queryRef = tripsRef;
        if (driverFilter) {
            queryRef = query(tripsRef, where('driverName', '==', driverFilter));
        }
        const querySnapshot = await getDocs(queryRef);

        trips.value = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log('Fetched trips:', trips.value); // Debug log
    } catch (error) {
        console.error('Error fetching trips:', error);
        trips.value = []; // Reset trips on error
    } finally {
        loading.value = false;
    }
}

// Fetch and process drivers data
async function fetchDrivers() {
    try {
        const querySnapshot = await getDocs(tripsRef);
        const uniqueDrivers = new Set(querySnapshot.docs.map((doc) => doc.data().driverName).filter(Boolean));
        drivers.value = Array.from(uniqueDrivers).sort();
        console.log('Fetched drivers:', drivers.value); // Debug log
    } catch (error) {
        console.error('Error fetching drivers:', error);
        drivers.value = []; // Reset drivers on error
    }
}

// Search drivers for autocomplete
function searchDrivers(event) {
    const searchQuery = event.query.toLowerCase();
    filteredDrivers.value = drivers.value.filter((driver) => driver.toLowerCase().startsWith(searchQuery));
}

// Status helper
const getStatusSeverity = (status) =>
    ({
        COMPLETED: 'success',
        IN_PROGRESS: 'info',
        CANCELLED: 'danger',
        PENDING: 'warning'
    })[status] || 'info';

// Initialize data
onMounted(async () => {
    await fetchDrivers();
    await fetchTrips();
});

// Watch for driver selection changes
watch(selectedDriver, (newValue) => {
    fetchTrips(newValue);
});
</script>

<template>
    <Fluid class="flex flex-col gap-8">
        <!-- Driver Filter -->
        <div class="card">
            <h3 class="font-semibold text-xl mb-4">Lọc theo tài xế</h3>
            <div class="flex flex-col gap-4">
                <AutoComplete v-model="selectedDriver" :suggestions="filteredDrivers" placeholder="Nhập tên tài xế" class="w-full" @complete="searchDrivers">
                    <template #item="{ item }">
                        <div class="flex align-items-center">
                            <span class="pi pi-user mr-2"></span>
                            <span>{{ item }}</span>
                        </div>
                    </template>
                </AutoComplete>

                <!-- Active Filter Indicator -->
                <div v-if="selectedDriver" class="p-2 bg-primary-50 rounded flex items-center gap-2">
                    <span class="pi pi-filter"></span>
                    <span>Đang lọc theo tài xế: {{ selectedDriver }}</span>
                    <Button icon="pi pi-times" class="p-button-rounded p-button-text p-button-sm" @click="selectedDriver = ''" tooltip="Xóa bộ lọc" />
                </div>
            </div>
        </div>

        <!-- Trips Table -->
        <div class="card">
            <h3 class="font-semibold text-xl mb-4">Danh sách chuyến xe</h3>

            <div v-if="loading" class="flex justify-center items-center p-4">
                <ProgressSpinner style="width: 50px; height: 50px" />
            </div>

            <template v-else>
                <DataTable :value="trips" :paginator="true" :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]" responsiveLayout="scroll" :loading="loading">
                    <Column field="id" header="ID" sortable />
                    <Column field="driverName" header="Tài xế" sortable />
                    <Column field="startLocation" header="Điểm đi" sortable />
                    <Column field="endLocation" header="Điểm đến" sortable />
                    <Column field="startTime" header="Thời gian đi" sortable>
                        <template #body="{ data }">
                            {{ new Date(data.startTime).toLocaleString('vi-VN') }}
                        </template>
                    </Column>
                    <Column field="status" header="Trạng thái" sortable>
                        <template #body="{ data }">
                            <Tag :severity="getStatusSeverity(data.status)" :value="data.status" />
                        </template>
                    </Column>
                </DataTable>

                <div v-if="!trips.length" class="text-center p-4">
                    <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
                    <p>Không tìm thấy chuyến xe nào</p>
                </div>
            </template>
        </div>
    </Fluid>
</template>
