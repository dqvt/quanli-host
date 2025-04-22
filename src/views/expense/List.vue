<script setup>
import { db } from '@/config/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const vehicles = ref([]);
const loading = ref(false);
const deleteDialog = ref(false);
const vehicleToDelete = ref(null);

onMounted(() => {
    fetchVehicles();
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

function confirmDelete(vehicle) {
    vehicleToDelete.value = vehicle;
    deleteDialog.value = true;
}

async function deleteVehicle() {
    if (!vehicleToDelete.value) return;

    try {
        const vehicleRef = doc(db, 'vehicles', vehicleToDelete.value.id);
        await deleteDoc(vehicleRef);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa xe',
            life: 3000
        });

        await fetchVehicles();
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa xe. Vui lòng thử lại.',
            life: 3000
        });
    } finally {
        deleteDialog.value = false;
        vehicleToDelete.value = null;
    }
}

function getStatusSeverity(status) {
    return status === 'ACTIVE' ? 'success' : 'danger';
}
</script>

<template>
    <div class="card">
        <div class="font-semibold text-xl mb-4">Danh sách xe</div>
        <div class="flex justify-between items-center mb-4">
            <Button label="Thêm xe mới" icon="pi pi-plus" @click="router.push('/vehicle/add')" />
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <!-- Results table -->
        <DataTable
            v-else
            :value="vehicles"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            responsiveLayout="scroll"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} vehicles"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        >
            <Column field="licensePlate" header="Biển số xe" sortable></Column>
            <Column field="manufacturer" header="Hãng sản xuất" sortable></Column>
            <Column field="model" header="Model" sortable></Column>
            <Column field="vehicleType" header="Loại xe" sortable>
                <template #body="slotProps">
                    {{ slotProps.data.vehicleType === 'TRUCK' ? 'Xe tải' : slotProps.data.vehicleType === 'CONTAINER' ? 'Xe container' : 'Xe đầu kéo' }}
                </template>
            </Column>
            <Column field="yearOfManufacture" header="Năm sản xuất" sortable></Column>
            <Column field="status" header="Trạng thái" sortable>
                <template #body="slotProps">
                    <Tag :severity="getStatusSeverity(slotProps.data.status)" :value="slotProps.data.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'" />
                </template>
            </Column>
            <Column header="Thao tác" style="width: 8rem">
                <template #body="slotProps">
                    <div class="flex gap-2">
                        <Button icon="pi pi-pencil" outlined rounded @click="router.push(`/vehicle/edit/${slotProps.data.id}`)" />
                        <Button icon="pi pi-trash" severity="danger" outlined rounded @click="confirmDelete(slotProps.data)" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Delete Confirmation Dialog -->
        <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="Xác nhận xóa" :modal="true">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-yellow-500" style="font-size: 2rem" />
                <span>
                    Bạn có chắc chắn muốn xóa xe biển số
                    <b>{{ vehicleToDelete?.licensePlate }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
                <Button label="Có" icon="pi pi-check" @click="deleteVehicle" severity="danger" outlined />
            </template>
        </Dialog>

        <!-- Empty state -->
        <div v-if="!loading && vehicles.length === 0" class="text-center p-4">
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
