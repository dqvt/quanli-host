<script setup>
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const customers = ref([]);
const loading = ref(false);

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
    } finally {
        loading.value = false;
    }
}

function navigateToAddCustomer() {
    router.push('/CustomerAdd');
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
                    <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="router.push(`/CustomerEdit/${slotProps.data.id}`)" />
                </template>
            </Column>
        </DataTable>

        <!-- Empty state -->
        <div v-if="!loading && customers.length === 0" class="text-center p-4">
            <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
            <p>Không tìm thấy khách hàng nào</p>
        </div>
    </div>
</template>
