<script setup>
import * as balanceService from '@/services/balance';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const staffList = ref([]);
const loading = ref(false);

onMounted(() => {
    fetchStaffWithBalances();
});

async function fetchStaffWithBalances() {
    loading.value = true;
    try {
        // Get staff balances from the balance service
        const staffBalances = await balanceService.getAllStaffBalances();

        // Filter out any non-staff entries (like transaction rows)
        staffList.value = staffBalances.filter((staff) => staff.fullName);
    } catch (error) {
        console.error('Error fetching staff with balances:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải danh sách nhân viên',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function navigateToStaffBalance(staff) {
    router.push({
        name: 'StaffBalance',
        params: { staffName: staff.shortName }
    });
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}

// Format date
function formatDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>

<template>
    <div class="card">
        <div class="font-semibold text-xl mb-4">Danh sách nhân viên</div>

        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <!-- Results table -->
        <DataTable
            v-else
            :value="staffList"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            responsiveLayout="scroll"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} staff members"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            sortField="fullName"
            :sortOrder="1"
        >
            <Column field="fullName" header="Họ và tên" sortable>
                <template #body="slotProps">
                    <span class="text-lg">{{ slotProps.data.fullName }}</span>
                </template>
            </Column>

            <Column field="balance" header="Số dư" sortable>
                <template #body="slotProps">
                    <span :class="slotProps.data.balance > 0 ? 'text-red-500 font-medium' : 'text-green-500 font-medium'">
                        {{ formatCurrency(slotProps.data.balance) }}
                        <span v-if="slotProps.data.balance > 0" class="text-sm">(đang giữ)</span>
                    </span>
                </template>
            </Column>

            <Column field="lastModified" header="Ngày cập nhật" sortable>
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.lastModified) }}
                </template>
            </Column>

            <Column header="Thao tác" style="width: 120px">
                <template #body="slotProps">
                    <Button icon="pi pi-arrow-right" @click="navigateToStaffBalance(slotProps.data)" class="p-button-rounded p-button-info p-button-sm" tooltip="Xem chi tiết" tooltipOptions="{ position: 'top' }" />
                </template>
            </Column>
        </DataTable>

        <!-- Empty state -->
        <div v-if="!loading && staffList.length === 0" class="text-center p-4">
            <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
            <p>Không tìm thấy nhân viên nào</p>
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
    padding: 1rem;
}
</style>
