<script setup>
import { db } from '@/config/firebase';
import { formatCurrency, getDebtSummary } from '@/services/debt';
import { collection, getDocs } from 'firebase/firestore';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const debtSummary = ref([]);
const loading = ref(false);
const customers = ref([]);
const companySearchTerm = ref('');
const representativeSearchTerm = ref('');

// Computed property to get customers with debt information
const customersWithDebt = computed(() => {
    // First map the data
    const mappedData = debtSummary.value.map((summary) => {
        return {
            ...summary
        };
    });

    // Filter by company name and representative name
    const companyTerm = companySearchTerm.value.toLowerCase().trim();
    const representativeTerm = representativeSearchTerm.value.toLowerCase().trim();

    // If no search terms, return all data
    if (!companyTerm && !representativeTerm) {
        return mappedData;
    }

    return mappedData.filter((customer) => {
        const companyName = (customer.companyName || '').toLowerCase();
        const representativeName = (customer.representativeName || '').toLowerCase();

        // Check if both filters match
        const companyMatch = !companyTerm || companyName.includes(companyTerm);
        const representativeMatch = !representativeTerm || representativeName.includes(representativeTerm);

        // Both filters must match
        return companyMatch && representativeMatch;
    });
});

onMounted(async () => {
    await fetchData();
});

async function fetchData() {
    loading.value = true;
    try {
        // Fetch customers first to ensure we have the latest data
        await fetchCustomers();

        // Then fetch debt summary
        debtSummary.value = await getDebtSummary();
    } catch (error) {
        console.error('Error fetching debt data:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải dữ liệu công nợ',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function fetchCustomers() {
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
        throw error;
    }
}

function viewCustomerDebt(customerId) {
    router.push(`/customer/debt/${customerId}`);
}
</script>

<template>
    <div class="card">
        <div class="font-semibold text-xl mb-2">Danh sách công nợ khách hàng</div>
        <p class="text-gray-600 mb-4">Tổng hợp công nợ của tất cả khách hàng. Nhấn vào "Chi tiết công nợ" để xem thông tin chi tiết theo từng năm.</p>

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

        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <!-- Results table -->
        <DataTable
            v-else
            :value="customersWithDebt"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            responsiveLayout="scroll"
            currentPageReportTemplate="Hiển thị {first} đến {last} của {totalRecords} khách hàng"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            class="p-datatable-sm"
        >
            <Column field="companyName" header="Tên công ty" sortable>
                <template #body="{ data }">
                    {{ data.companyName || '(Không có)' }}
                </template>
            </Column>
            <Column field="representativeName" header="Người đại diện" sortable></Column>

            <Column field="totalDebt" header="Tổng giá trị công nợ" sortable>
                <template #body="{ data }">
                    {{ formatCurrency(data.totalDebt) }}
                </template>
            </Column>

            <Column field="totalPayments" header="Đã thanh toán" sortable>
                <template #body="{ data }">
                    {{ formatCurrency(data.totalPayments) }}
                </template>
            </Column>

            <Column field="remainingDebt" header="Số tiền còn nợ" sortable>
                <template #body="{ data }">
                    <span :class="{ 'text-red-500 font-bold': data.remainingDebt > 0 }">
                        {{ formatCurrency(data.remainingDebt) }}
                    </span>
                </template>
            </Column>

            <Column header="Thao tác">
                <template #body="slotProps">
                    <div class="flex gap-2">
                        <Button label="Chi tiết công nợ" @click="viewCustomerDebt(slotProps.data.id)" class="p-button-sm" />
                        <Button label="Danh sách chuyến xe" severity="info" @click="router.push(`/customer/trips/${slotProps.data.id}`)" class="p-button-sm" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Empty state -->
        <div v-if="!loading && customersWithDebt.length === 0" class="text-center p-4">
            <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
            <p v-if="companySearchTerm || representativeSearchTerm">
                Không tìm thấy khách hàng nào phù hợp với điều kiện tìm kiếm
                <span v-if="companySearchTerm"><br />Tên công ty: "{{ companySearchTerm }}"</span>
                <span v-if="representativeSearchTerm"><br />Người đại diện: "{{ representativeSearchTerm }}"</span>
            </p>
            <p v-else>Không tìm thấy dữ liệu công nợ</p>
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
