<script setup>
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const loading = ref(false);
const pendingTrips = ref([]);
const selectedTrips = ref([]);

async function fetchPendingTrips() {
    loading.value = true;
    try {
        const tripsCollection = collection(db, 'trips');
        const q = query(tripsCollection, where('status', '==', 'PENDING'));
        const querySnapshot = await getDocs(q);

        const tripsData = [];
        querySnapshot.forEach((doc) => {
            tripsData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        pendingTrips.value = tripsData;
    } catch (error) {
        console.error('Error fetching pending trips:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch pending trips', life: 3000 });
    } finally {
        loading.value = false;
    }
}

async function approveTrip(tripId) {
    try {
        const tripRef = doc(db, 'trips', tripId);
        await updateDoc(tripRef, {
            status: 'APPROVED',
            approvedAt: new Date().toISOString()
        });

        toast.add({ severity: 'success', summary: 'Success', detail: 'Trip approved successfully', life: 3000 });
        await fetchPendingTrips(); // Refresh the list
    } catch (error) {
        console.error('Error approving trip:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to approve trip', life: 3000 });
    }
}

async function approveBulkTrips() {
    if (selectedTrips.value.length === 0) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please select trips to approve', life: 3000 });
        return;
    }

    loading.value = true;
    try {
        const updatePromises = selectedTrips.value.map((trip) => {
            const tripRef = doc(db, 'trips', trip.id);
            return updateDoc(tripRef, {
                status: 'APPROVED',
                approvedAt: new Date().toISOString()
            });
        });

        await Promise.all(updatePromises);
        toast.add({ severity: 'success', summary: 'Success', detail: `${selectedTrips.value.length} trips approved successfully`, life: 3000 });
        selectedTrips.value = []; // Clear selection
        await fetchPendingTrips(); // Refresh the list
    } catch (error) {
        console.error('Error approving trips:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to approve selected trips', life: 3000 });
    } finally {
        loading.value = false;
    }
}

function getStatusSeverity(status) {
    const severityMap = {
        APPROVED: 'success',
        PENDING: 'warning',
        REJECTED: 'danger'
    };
    return severityMap[status] || 'info';
}

onMounted(() => {
    fetchPendingTrips();
});
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-4">
            <div class="font-semibold text-xl">Danh sách chuyến xe chờ duyệt</div>
            <Button v-if="selectedTrips.length > 0" label="Duyệt các chuyến đã chọn" icon="pi pi-check" @click="approveBulkTrips" :loading="loading" />
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <!-- Results table -->
        <DataTable v-else v-model:selection="selectedTrips" :value="pendingTrips" :paginator="true" :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]" responsiveLayout="scroll" selectionMode="multiple" dataKey="id" class="p-datatable-sm">
            <Column selectionMode="multiple" headerStyle="width: 3rem" />
            <Column field="startingPoint" header="Điểm đi" sortable />
            <Column field="endingPoint" header="Điểm đến" sortable />
            <Column field="driverName" header="Tài xế" sortable />
            <Column field="tripDate" header="Thời gian đi" sortable>
                <template #body="slotProps">
                    {{ $formatDate(slotProps.data.tripDate) }}
                </template>
            </Column>
            <Column field="status" header="Trạng thái" sortable>
                <template #body="slotProps">
                    <Tag :severity="getStatusSeverity(slotProps.data.status)" :value="slotProps.data.status" />
                </template>
            </Column>
            <Column header="Thao tác" style="width: 8rem">
                <template #body="slotProps">
                    <Button icon="pi pi-check" severity="success" rounded text @click="approveTrip(slotProps.data.id)" tooltip="Duyệt chuyến" />
                </template>
            </Column>
        </DataTable>

        <!-- Empty state -->
        <div v-if="!loading && pendingTrips.length === 0" class="text-center p-4">
            <i class="pi pi-check-circle mb-4" style="font-size: 2rem" />
            <p>Không có chuyến xe nào đang chờ duyệt</p>
        </div>
    </div>
</template>

<style scoped>
.p-datatable-sm .p-datatable-thead > tr > th,
.p-datatable-sm .p-datatable-tbody > tr > td {
    padding: 0.5rem;
}
</style>
