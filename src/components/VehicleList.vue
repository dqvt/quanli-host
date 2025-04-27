<script setup>
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const vehicles = ref([]);
const loading = ref(false);
const licensePlateFilter = ref('');

// Computed property for filtered vehicles
const filteredVehicles = computed(() => {
    if (!licensePlateFilter.value.trim()) {
        return vehicles.value;
    }

    const searchTerm = licensePlateFilter.value.toLowerCase().trim();
    return vehicles.value.filter((vehicle) => vehicle.licensePlate.toLowerCase().includes(searchTerm));
});

// Computed property for total vehicle count
const totalVehicleCount = computed(() => vehicles.value.length);

// Format license plate according to the pattern
function formatLicensePlate(licensePlate) {
    if (!licensePlate) return '';

    // Try to match the pattern: numbers + text + "-" + 3 numbers + "." + remaining numbers
    const parts = licensePlate.match(/^(\d+)([A-Za-z]+)[-]?(\d{3})[.]?(\d+)$/);

    if (parts) {
        // If it matches the pattern, format it
        return `${parts[1]}${parts[2]}-${parts[3]}.${parts[4]}`;
    } else {
        // If it doesn't match the pattern, return as is
        return licensePlate;
    }
}

onMounted(() => {
    fetchVehicles();

    // Check if redirected from direct access to add page
    if (route.query.redirected === 'true') {
        toast.add({
            severity: 'info',
            summary: 'Thông báo',
            detail: 'Trang thêm xe mới chỉ có thể truy cập từ danh sách xe',
            life: 5000
        });

        // Clean up the URL by removing the query parameter
        router.replace({ path: route.path });
    }
});

async function fetchVehicles() {
    loading.value = true;
    try {
        const vehiclesCollection = collection(db, 'vehicles');
        const querySnapshot = await getDocs(vehiclesCollection);

        const vehiclesData = [];
        querySnapshot.forEach((doc) => {
            vehiclesData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        vehicles.value = vehiclesData;
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải danh sách xe',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function getStatusSeverity(status) {
    return status === 'ACTIVE' ? 'success' : 'danger';
}
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-2">
            <div class="font-semibold text-xl">Danh sách xe</div>
            <div class="text-sm bg-gray-100 px-3 py-1 rounded-full">
                Tổng số xe: <span class="font-semibold">{{ totalVehicleCount }}</span>
            </div>
        </div>

        <!-- Search and Add section -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <span class="p-input-icon-left w-full md:w-1/3">
                <i class="pi pi-search" />
                <InputText v-model="licensePlateFilter" placeholder="Tìm kiếm biển số xe" class="w-full" />
            </span>
            <Button label="Thêm xe mới" severity="success" @click="router.push('/vehicle/add')" />
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <!-- Results table -->
        <DataTable
            v-else
            :value="filteredVehicles"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            responsiveLayout="scroll"
            currentPageReportTemplate="Hiển thị {first} đến {last} của {totalRecords} xe"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        >
            <Column field="licensePlate" header="Biển số xe" sortable>
                <template #body="slotProps">
                    {{ formatLicensePlate(slotProps.data.licensePlate) }}
                </template>
            </Column>
            <Column field="manufacturer" header="Hãng sản xuất" sortable></Column>
            <Column field="model" header="Model" sortable></Column>
            <Column field="vehicleType" header="Loại xe" sortable>
                <template #body="slotProps">
                    {{ slotProps.data.vehicleType === 'TRUCK' ? 'Xe tải' : slotProps.data.vehicleType === 'TRAILER' ? 'Rơ móc' : 'Xe đầu kéo' }}
                </template>
            </Column>
            <Column field="yearOfManufacture" header="Năm sản xuất" sortable></Column>
            <Column field="status" header="Trạng thái" sortable>
                <template #body="slotProps">
                    <Tag :severity="getStatusSeverity(slotProps.data.status)" :value="slotProps.data.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'" />
                </template>
            </Column>
            <Column header="Thao tác" style="width: 10rem">
                <template #body="slotProps">
                    <div class="flex gap-2">
                        <Button label="Sửa" severity="info" size="small" @click="router.push(`/vehicle/edit/${slotProps.data.id}`)" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Empty state -->
        <div v-if="!loading && filteredVehicles.length === 0" class="text-center p-4">
            <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
            <p>Không tìm thấy xe nào</p>
        </div>
    </div>
</template>

<style scoped>
.p-datatable-sm .p-datatable-thead > tr > th,
.p-datatable-sm .p-datatable-tbody > tr > td {
    padding: 0.5rem;
    font-size: 0.875rem;
}

/* Add horizontal scroll for better mobile experience */
.p-datatable-wrapper {
    overflow-x: auto;
}

.p-dialog-content {
    @apply p-4;
}
</style>
