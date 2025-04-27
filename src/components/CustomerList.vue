<script setup>
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const customers = ref([]);
const loading = ref(false);
const companySearchTerm = ref('');
const representativeSearchTerm = ref('');

// Computed property to filter customers based on search terms
const filteredCustomers = computed(() => {
    // If no search terms, return all customers
    const companyTerm = companySearchTerm.value.toLowerCase().trim();
    const representativeTerm = representativeSearchTerm.value.toLowerCase().trim();

    if (!companyTerm && !representativeTerm) {
        return customers.value;
    }

    // Filter customers based on search terms
    return customers.value.filter((customer) => {
        const companyName = (customer.companyName || '').toLowerCase();
        const representativeName = (customer.representativeName || '').toLowerCase();

        // Check if both filters match
        const companyMatch = !companyTerm || companyName.includes(companyTerm);
        const representativeMatch = !representativeTerm || representativeName.includes(representativeTerm);

        // Both filters must match
        return companyMatch && representativeMatch;
    });
});

onMounted(() => {
    fetchCustomers();

    // Check if redirected from direct access to add page
    if (route.query.redirected === 'true') {
        toast.add({
            severity: 'info',
            summary: 'Thông báo',
            detail: 'Trang thêm khách hàng mới chỉ có thể truy cập từ danh sách khách hàng',
            life: 5000
        });

        // Clean up the URL by removing the query parameter
        router.replace({ path: route.path });
    }
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
    router.push('/customer/add');
}
</script>

<template>
    <div class="card">
        <div class="font-semibold text-xl mb-2">Danh sách khách hàng</div>
        <p class="text-gray-600 mb-4">Quản lý thông tin khách hàng và người đại diện.</p>

        <!-- Search boxes -->
        <div class="mb-4 flex flex-col md:flex-row gap-3">
            <span class="p-input-icon-left w-full md:w-1/3">
                <i class="pi pi-search" />
                <InputText v-model="companySearchTerm" placeholder="Tìm kiếm theo tên công ty" class="w-full" />
            </span>
            <span class="p-input-icon-left w-full md:w-1/3">
                <i class="pi pi-search" />
                <InputText v-model="representativeSearchTerm" placeholder="Tìm kiếm theo người đại diện" class="w-full" />
            </span>
        </div>

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
            :value="filteredCustomers"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            responsiveLayout="scroll"
            currentPageReportTemplate="Hiển thị {first} đến {last} của {totalRecords} khách hàng"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        >
            <Column field="companyName" header="Tên công ty" sortable>
                <template #body="{ data }">
                    {{ data.companyName || '(Không có)' }}
                </template>
            </Column>
            <Column field="representativeName" header="Tên người đại diện" sortable></Column>
            <Column field="contactNumber" header="Số điện thoại" sortable></Column>
            <Column field="email" header="Email" sortable></Column>
            <Column header="Thao tác" style="width: 8rem">
                <template #body="slotProps">
                    <div class="flex gap-2">
                        <Button label="Chỉnh sửa" @click="router.push(`/customer/edit/${slotProps.data.id}`)" class="p-button-sm" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Empty state -->
        <div v-if="!loading && filteredCustomers.length === 0" class="text-center p-4">
            <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
            <p v-if="companySearchTerm || representativeSearchTerm">
                Không tìm thấy khách hàng nào phù hợp với điều kiện tìm kiếm
                <span v-if="companySearchTerm"><br />Tên công ty: "{{ companySearchTerm }}"</span>
                <span v-if="representativeSearchTerm"><br />Người đại diện: "{{ representativeSearchTerm }}"</span>
            </p>
            <p v-else>Không tìm thấy khách hàng nào</p>
        </div>
    </div>
</template>

<style scoped>
.card {
    background-color: white;
    border-radius: 0.5rem;
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 1.5rem;
}
</style>
