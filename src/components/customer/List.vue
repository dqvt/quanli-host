<script setup>
import { supabase } from '@/config/supabase';
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

// Computed property for filtered customers
const filteredCustomers = computed(() => {
    if (!companySearchTerm.value.trim() && !representativeSearchTerm.value.trim()) {
        return customers.value;
    }

    return customers.value.filter((customer) => {
        const companyMatch = customer.company_name ? customer.company_name.toLowerCase().includes(companySearchTerm.value.toLowerCase().trim()) : false;
        const representativeMatch = customer.representative_name ? customer.representative_name.toLowerCase().includes(representativeSearchTerm.value.toLowerCase().trim()) : false;

        if (companySearchTerm.value.trim() && representativeSearchTerm.value.trim()) {
            return companyMatch && representativeMatch;
        } else if (companySearchTerm.value.trim()) {
            return companyMatch;
        } else {
            return representativeMatch;
        }
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
        const { data, error } = await supabase.from('customers').select('*').order('company_name');

        if (error) throw error;

        customers.value = data;
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
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-4">
            <div class="font-semibold text-xl">Danh sách khách hàng</div>
            <Button label="Thêm khách hàng mới" severity="success" @click="router.push('/customer/add')" />
        </div>

        <!-- Search filters -->
        <div class="flex flex-col md:flex-row gap-3 mb-4">
            <span class="p-input-icon-left w-full md:w-1/2">
                <i class="pi pi-search" />
                <input v-model="companySearchTerm" class="p-inputtext p-component w-full" placeholder="Tìm theo tên công ty" />
            </span>
            <span class="p-input-icon-left w-full md:w-1/2">
                <i class="pi pi-search" />
                <input v-model="representativeSearchTerm" class="p-inputtext p-component w-full" placeholder="Tìm theo tên người đại diện" />
            </span>
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
            <Column field="company_name" header="Tên công ty" sortable style="width: 25%">
                <template #body="slotProps">
                    {{ slotProps.data.company_name || '(Không có tên công ty)' }}
                </template>
            </Column>
            <Column field="representative_name" header="Người đại diện" sortable style="width: 20%"></Column>
            <Column field="contact_number" header="Số điện thoại" style="width: 15%"></Column>
            <Column field="email" header="Email" style="width: 20%"></Column>
            <Column header="Thao tác" style="width: 20%">
                <template #body="slotProps">
                    <div class="flex gap-2">
                        <Button label="Sửa" severity="info" size="small" @click="router.push(`/customer/edit/${slotProps.data.id}`)" />
                        <Button label="Công nợ" severity="warning" size="small" @click="router.push(`/customer/debt/${slotProps.data.id}`)" />
                        <Button label="Chuyến xe" severity="success" size="small" @click="router.push(`/customer/trips/${slotProps.data.id}`)" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Empty state -->
        <div v-if="!loading && filteredCustomers.length === 0" class="text-center p-4">
            <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
            <p>Không tìm thấy khách hàng nào</p>
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
</style>
