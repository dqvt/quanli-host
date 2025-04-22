<script setup>
import { db } from '@/config/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const customers = ref([]);
const loading = ref(false);
const deleteDialog = ref(false);
const customerToDelete = ref(null);

onMounted(() => {
    fetchCustomers();
});

async function fetchCustomers() {
    loading.value = true;
    try {
        const customersCollection = collection(db, 'customers');
        const querySnapshot = await getDocs(customersCollection);

        const customersData = [];
        querySnapshot.forEach((doc) => {
            customersData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        customers.value = customersData;
    } catch (error) {
        console.error('Error fetching customers:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải danh sách khách hàng',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function navigateToAddCustomer() {
    router.push('/customer-add');
}

function confirmDelete(customer) {
    customerToDelete.value = customer;
    deleteDialog.value = true;
}

async function deleteCustomer() {
    if (!customerToDelete.value) return;

    try {
        const customerRef = doc(db, 'customers', customerToDelete.value.id);
        await deleteDoc(customerRef);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa khách hàng',
            life: 3000
        });

        // Refresh the customers list
        await fetchCustomers();
    } catch (error) {
        console.error('Error deleting customer:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa khách hàng. Vui lòng thử lại.',
            life: 3000
        });
    } finally {
        deleteDialog.value = false;
        customerToDelete.value = null;
    }
}
</script>

<template>
    <div class="card">
        <div class="font-semibold text-xl mb-4">Danh sách khách hàng</div>
        <div class="flex justify-between items-center mb-4">
            <Button label="Thêm khách hàng mới" icon="pi pi-plus" @click="navigateToAddCustomer" />
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <!-- Results table -->
        <DataTable
            v-else
            :value="customers"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            responsiveLayout="scroll"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} customers"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        >
            <Column field="representativeName" header="Tên người đại diện" sortable></Column>
            <Column field="companyName" header="Tên công ty" sortable></Column>
            <Column field="contactNumber" header="Số điện thoại" sortable></Column>
            <Column field="email" header="Email" sortable></Column>
            <Column header="Thao tác" style="width: 8rem">
                <template #body="slotProps">
                    <div class="flex gap-2">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="router.push(`/customer-edit/${slotProps.data.id}`)" />
                        <Button icon="pi pi-trash" severity="danger" outlined rounded @click="confirmDelete(slotProps.data)" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Empty state -->
        <div v-if="!loading && customers.length === 0" class="text-center p-4">
            <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
            <p>Không tìm thấy khách hàng nào</p>
        </div>

        <!-- Delete Confirmation Dialog -->
        <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="Xác nhận xóa" :modal="true">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-yellow-500" style="font-size: 2rem" />
                <span>
                    Bạn có chắc chắn muốn xóa khách hàng
                    <b>{{ customerToDelete?.companyName }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
                <Button label="Có" icon="pi pi-check" @click="deleteCustomer" severity="danger" outlined />
            </template>
        </Dialog>
    </div>
</template>
