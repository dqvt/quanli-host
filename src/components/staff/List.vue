<script setup>
import { supabase } from '@/config/supabase';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const staffList = ref([]);
const loading = ref(false);

onMounted(() => {
    fetchStaff();

    // Check if redirected from direct access to add page
    if (route.query.redirected === 'true') {
        toast.add({
            severity: 'info',
            summary: 'Thông báo',
            detail: 'Trang thêm nhân viên mới chỉ có thể truy cập từ danh sách nhân viên',
            life: 5000
        });

        // Clean up the URL by removing the query parameter
        router.replace({ path: route.path });
    }
});

async function fetchStaff() {
    loading.value = true;
    try {
        const { data, error } = await supabase.from('staff').select('*').order('full_name');

        if (error) throw error;
        staffList.value = data;
    } catch (error) {
        console.error('Error fetching staff:', error);
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

function navigateToAddStaff() {
    router.push('/staff/add');
}
</script>

<template>
    <div class="card">
        <div class="font-semibold text-xl mb-4">Danh sách nhân viên</div>
        <div class="flex justify-between items-center mb-4">
            <Button label="Thêm nhân viên mới" icon="pi pi-plus" @click="navigateToAddStaff" />
        </div>

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
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} staff"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        >
            <Column field="id" header="ID"></Column>
            <Column field="full_name" header="Họ và tên" sortable></Column>
            <Column field="short_name" header="Tên ngắn" sortable></Column>
            <Column field="phone_number" header="Số điện thoại" sortable></Column>
            <Column field="vietnam_id" header="CCCD" sortable></Column>
            <Column field="license_number" header="Bằng lái" sortable></Column>
            <Column field="status" header="Trạng thái" sortable>
                <template #body="slotProps">
                    <span
                        :class="{
                            'text-green-500': slotProps.data.status === 'active',
                            'text-red-500': slotProps.data.status === 'inactive'
                        }"
                    >
                        {{ slotProps.data.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ việc' }}
                    </span>
                </template>
            </Column>
            <Column header="Thao tác" style="width: 8rem">
                <template #body="slotProps">
                    <div class="flex gap-2">
                        <Button icon="pi pi-pencil" outlined rounded @click="router.push(`/staff/edit/${slotProps.data.id}`)" tooltip="Chỉnh sửa thông tin" />
                        <Button icon="pi pi-money-bill" outlined rounded severity="success" @click="router.push(`/staff/salary/${slotProps.data.id}`)" tooltip="Quản lý lương" />
                    </div>
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
.card {
    @apply bg-white rounded-lg shadow-md p-6;
}

.p-invalid {
    @apply border-red-500;
}
</style>
