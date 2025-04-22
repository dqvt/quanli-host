<script setup>
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import { onMounted, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const deleteDialog = ref(false);
const tripToDelete = ref(null);

const driverFilterValue = ref('');
const drivers = ref([]);
const filteredDrivers = ref([]);
const filteredTrips = ref([]); // Store filtered trips
const loading = ref(false);

// We're now using the global $formatDate method defined in main.js

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

// Removed unused searchDriver function

watch(driverFilterValue, (newValue) => {
    fetchTrips(newValue);
});

onMounted(() => {
    fetchDrivers();
    fetchTrips();
});

async function confirmDelete(trip) {
    tripToDelete.value = trip;
    deleteDialog.value = true;
}

async function deleteTrip() {
    if (!tripToDelete.value) return;

    try {
        const tripRef = doc(db, 'trips', tripToDelete.value.id);
        await deleteDoc(tripRef);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa chuyến xe',
            life: 3000
        });

        // Refresh the trips list
        await fetchTrips(driverFilterValue.value);
    } catch (error) {
        console.error('Error deleting trip:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa chuyến xe. Vui lòng thử lại.',
            life: 3000
        });
    } finally {
        deleteDialog.value = false;
        tripToDelete.value = null;
    }
}
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

// Add new helper function for formatting timestamps
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    if (timestamp.seconds) {
        // Firestore Timestamp
        return new Date(timestamp.seconds * 1000).toLocaleString('vi-VN');
    }
    return new Date(timestamp).toLocaleString('vi-VN');
}

// Add helper function to calculate total expenses
function calculateTotalExpenses(expenses) {
    if (!expenses) return '0 ₫';
    const total = Object.values(expenses).reduce((sum, value) => sum + (value || 0), 0);
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total);
}
</script>

<template>
    <Fluid class="flex flex-col gap-8">
        <!-- Results Section -->
        <div class="card">
            <div class="font-semibold text-xl mb-4">Danh sách chuyến xe</div>
            <div class="flex justify-between items-center mb-4">
                <Button label="Thêm chuyến xe mới" icon="pi pi-plus" @click="$router.push('/TripInput')" />
            </div>
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
                class="p-datatable-sm"
            >
                <!-- Basic Information -->
                <Column field="tripDate" header="Thời gian đi" sortable>
                    <template #body="slotProps">
                        {{ $formatDate(slotProps.data.tripDate) }}
                    </template>
                </Column>
                <Column field="startingPoint" header="Điểm đi" sortable></Column>
                <Column field="endingPoint" header="Điểm đến" sortable></Column>
                <Column field="distance" header="Khoảng cách" sortable>
                    <template #body="slotProps"> {{ slotProps.data.distance }} km </template>
                </Column>

                <!-- Personnel Information -->
                <Column field="driverName" header="Tài xế" sortable></Column>
                <Column field="assistantDriverName" header="Phụ xe" sortable></Column>
                <Column field="customerName" header="Khách hàng" sortable></Column>

                <!-- Expenses -->
                <Column header="Chi phí CSGT" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.policeFee || 0) }}
                    </template>
                </Column>
                <Column header="Phí cầu đường" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.tollFee || 0) }}
                    </template>
                </Column>
                <Column header="Chi phí ăn uống" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.foodFee || 0) }}
                    </template>
                </Column>
                <Column header="Chi phí xăng" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.gasMoney || 0) }}
                    </template>
                </Column>
                <Column header="Chi phí sửa chữa" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.mechanicFee || 0) }}
                    </template>
                </Column>

                <!-- Total Expenses -->
                <Column header="Tổng chi phí" sortable>
                    <template #body="slotProps">
                        {{ calculateTotalExpenses(slotProps.data.expenses) }}
                    </template>
                </Column>

                <!-- Status and Timestamps -->
                <Column field="status" header="Trạng thái" sortable>
                    <template #body="slotProps">
                        <Tag :severity="getStatusSeverity(slotProps.data.status)" :value="slotProps.data.status" />
                    </template>
                </Column>
                <Column field="createdAt" header="Ngày tạo" sortable>
                    <template #body="slotProps">
                        {{ formatTimestamp(slotProps.data.createdAt) }}
                    </template>
                </Column>
                <Column field="updatedAt" header="Cập nhật lúc" sortable>
                    <template #body="slotProps">
                        {{ formatTimestamp(slotProps.data.updatedAt) }}
                    </template>
                </Column>

                <!-- Add Actions Column -->
                <Column header="Thao tác" :exportable="false" style="min-width: 8rem">
                    <template #body="slotProps">
                        <div class="flex gap-2">
                            <Button icon="pi pi-trash" severity="danger" outlined rounded @click="confirmDelete(slotProps.data)" :disabled="slotProps.data.status === 'IN_PROGRESS'" />
                        </div>
                    </template>
                </Column>
            </DataTable>

            <!-- Delete Confirmation Dialog -->
            <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="Xác nhận xóa" :modal="true">
                <div class="flex align-items-center gap-3">
                    <i class="pi pi-exclamation-triangle text-yellow-500" style="font-size: 2rem" />
                    <span>
                        Bạn có chắc chắn muốn xóa chuyến xe từ
                        <b>{{ tripToDelete?.startingPoint }}</b> đến <b>{{ tripToDelete?.endingPoint }}</b
                        >?
                    </span>
                </div>
                <template #footer>
                    <Button label="Không" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
                    <Button label="Có" icon="pi pi-check" @click="deleteTrip" severity="danger" outlined />
                </template>
            </Dialog>

            <!-- Empty state -->
            <div v-if="!loading && filteredTrips.length === 0" class="text-center p-4">
                <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
                <p>Không tìm thấy chuyến xe nào</p>
            </div>
        </div>
    </Fluid>
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
