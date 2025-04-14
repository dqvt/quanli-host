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

const driverFilterValue = ref('');
const drivers = ref([]);
const filteredDrivers = ref([]);
const trips = ref([]); // Store all trips
const filteredTrips = ref([]); // Store filtered trips
const loading = ref(false);

async function fetchDrivers() {
    try {
        const tripsCollection = collection(db, 'trips');
        const querySnapshot = await getDocs(tripsCollection);

        // Get unique driver names from all trips
        const uniqueDrivers = new Set();
        querySnapshot.forEach((doc) => {
            const driverName = doc.data().driverName;
            if (driverName) {
                uniqueDrivers.add(driverName);
            }
        });

        // Update drivers ref with unique values
        drivers.value = Array.from(uniqueDrivers).sort();
        filteredDrivers.value = [...drivers.value];
    } catch (error) {
        console.error('Error fetching drivers:', error);
    }
}

async function fetchTrips(driverName = '') {
    loading.value = true;
    try {
        const tripsCollection = collection(db, 'trips');
        let querySnapshot;

        if (driverName) {
            const q = query(tripsCollection, where('driverName', '==', driverName));
            querySnapshot = await getDocs(q);
        } else {
            querySnapshot = await getDocs(tripsCollection);
        }

        const tripsData = [];
        querySnapshot.forEach((doc) => {
            tripsData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        filteredTrips.value = tripsData;
    } catch (error) {
        console.error('Error fetching trips:', error);
    } finally {
        loading.value = false;
    }
}

function searchDriver(event) {
    setTimeout(() => {
        if (!event.query.trim().length) {
            filteredDrivers.value = [...drivers.value];
        } else {
            filteredDrivers.value = drivers.value.filter((driver) => {
                return driver.toLowerCase().startsWith(event.query.toLowerCase());
            });
        }
    }, 250);
}

watch(driverFilterValue, (newValue) => {
    fetchTrips(newValue);
});

onMounted(() => {
    fetchDrivers();
    fetchTrips();
});
</script>

<script>
// Add this helper function
function getStatusSeverity(status) {
    const severityMap = {
        COMPLETED: 'success',
        IN_PROGRESS: 'info',
        CANCELLED: 'danger',
        PENDING: 'warning'
    };
    return severityMap[status] || 'info';
}
</script>

<template>
    <Fluid class="flex flex-col gap-8">
        <!-- Driver Filter Section -->
        <div class="card">
            <div class="font-semibold text-xl mb-4">Lọc theo tài xế</div>
            <div class="flex flex-col gap-4">
                <!-- AutoComplete for driver filtering -->
                <AutoComplete v-model="driverFilterValue" :suggestions="filteredDrivers" placeholder="Nhập tên tài xế" @complete="searchDriver($event)" class="w-full">
                    <template #item="slotProps">
                        <div class="flex align-items-center">
                            <span class="pi pi-user mr-2"></span>
                            <span>{{ slotProps.item }}</span>
                        </div>
                    </template>
                </AutoComplete>

                <!-- Active filter indicator -->
                <div v-if="driverFilterValue" class="p-2 bg-primary-50 rounded">
                    <div class="flex items-center gap-2">
                        <span class="pi pi-filter"></span>
                        <span>Đang lọc theo tài xế: {{ driverFilterValue }}</span>
                        <Button icon="pi pi-times" class="p-button-rounded p-button-text p-button-sm" @click="driverFilterValue = ''" tooltip="Xóa bộ lọc" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Results Section -->
        <div class="card">
            <div class="font-semibold text-xl mb-4">Danh sách chuyến xe</div>

            <!-- Loading indicator -->
            <div v-if="loading" class="flex justify-center items-center p-4">
                <ProgressSpinner style="width: 50px; height: 50px" />
            </div>

            <!-- Results table -->
            <DataTable
                v-else
                :value="filteredTrips"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                responsiveLayout="scroll"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} trips"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            >
                <Column field="id" header="ID" sortable></Column>
                <Column field="driverName" header="Tài xế" sortable></Column>
                <Column field="startLocation" header="Điểm đi" sortable></Column>
                <Column field="endLocation" header="Điểm đến" sortable></Column>
                <Column field="startTime" header="Thời gian đi" sortable>
                    <template #body="slotProps">
                        {{ new Date(slotProps.data.startTime).toLocaleString('vi-VN') }}
                    </template>
                </Column>
                <Column field="status" header="Trạng thái" sortable>
                    <template #body="slotProps">
                        <Tag :severity="getStatusSeverity(slotProps.data.status)" :value="slotProps.data.status" />
                    </template>
                </Column>
            </DataTable>

            <!-- Empty state -->
            <div v-if="!loading && filteredTrips.length === 0" class="text-center p-4">
                <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
                <p>Không tìm thấy chuyến xe nào</p>
            </div>
        </div>
    </Fluid>
</template>
