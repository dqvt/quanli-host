<script setup>
import { db } from '@/config/firebase';
import { calculateTotalSalary, formatCurrency, getStaffSalaryAdjustments, getStaffTrips, groupTripsByMonth, saveSalaryAdjustment } from '@/services/salary';
import { doc, getDoc } from 'firebase/firestore';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Divider from 'primevue/divider';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import TabPanel from 'primevue/tabpanel';
import TabView from 'primevue/tabview';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const staffId = route.params.id;
const staff = ref(null);
const trips = ref([]);
const adjustments = ref([]);
const loading = ref(false);
const activeMonthIndex = ref(0);

// Adjustment dialog
const adjustmentDialog = ref(false);
const selectedMonth = ref(null);
const adjustmentAmount = ref(0);
const adjustmentReason = ref('');
const savingAdjustment = ref(false);

// Computed properties
const monthlyTrips = computed(() => {
    return groupTripsByMonth(trips.value, adjustments.value);
});

const totalSalary = computed(() => {
    return calculateTotalSalary(trips.value, adjustments.value);
});

onMounted(async () => {
    await fetchData();
});

async function fetchData() {
    loading.value = true;
    try {
        // Fetch staff data
        await fetchStaff();

        // Fetch trips for this staff
        await fetchStaffTrips();

        // Fetch salary adjustments
        await fetchSalaryAdjustments();
    } catch (error) {
        console.error('Error fetching data:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải dữ liệu lương',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function fetchStaff() {
    try {
        const staffDoc = await getDoc(doc(db, 'staff', staffId));
        if (staffDoc.exists()) {
            staff.value = { id: staffDoc.id, ...staffDoc.data() };
        } else {
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không tìm thấy thông tin nhân viên',
                life: 3000
            });
            router.push('/staff/list');
        }
    } catch (error) {
        console.error('Error fetching staff:', error);
        throw error;
    }
}

async function fetchStaffTrips() {
    try {
        trips.value = await getStaffTrips(staffId);
    } catch (error) {
        console.error('Error fetching staff trips:', error);
        throw error;
    }
}

async function fetchSalaryAdjustments() {
    try {
        adjustments.value = await getStaffSalaryAdjustments(staffId);
    } catch (error) {
        console.error('Error fetching salary adjustments:', error);
        throw error;
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function getRoleSeverity(role) {
    return role === 'driver' ? 'success' : 'info';
}

function getRoleLabel(role) {
    return role === 'driver' ? 'Tài xế' : 'Phụ xe';
}

function getStatusSeverity(status) {
    switch (status) {
        case 'PENDING':
            return 'secondary';
        case 'WAITING_FOR_PRICE':
            return 'info';
        case 'PRICED':
            return 'success';
        default:
            return 'info';
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'PENDING':
            return 'Chờ duyệt';
        case 'WAITING_FOR_PRICE':
            return 'Chờ báo giá';
        case 'PRICED':
            return 'Đã báo giá';
        default:
            return status;
    }
}

function goBack() {
    router.push('/staff/list');
}

function openAdjustmentDialog(month) {
    selectedMonth.value = month;

    // Check if there's an existing adjustment for this month
    const existingAdjustment = adjustments.value.find((adj) => adj.year === month.year && adj.month === month.month);

    if (existingAdjustment) {
        adjustmentAmount.value = existingAdjustment.adjustmentAmount;
        adjustmentReason.value = existingAdjustment.reason || '';
    } else {
        adjustmentAmount.value = 0;
        adjustmentReason.value = '';
    }

    adjustmentDialog.value = true;
}

async function saveAdjustment() {
    if (!selectedMonth.value) return;

    savingAdjustment.value = true;

    try {
        await saveSalaryAdjustment(staffId, staff.value.fullName, selectedMonth.value.year, selectedMonth.value.month, adjustmentAmount.value, adjustmentReason.value);

        // Refresh adjustments
        await fetchSalaryAdjustments();

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã lưu điều chỉnh lương',
            life: 3000
        });

        adjustmentDialog.value = false;
    } catch (error) {
        console.error('Error saving adjustment:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể lưu điều chỉnh lương',
            life: 3000
        });
    } finally {
        savingAdjustment.value = false;
    }
}
</script>

<template>
    <div class="card">
        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <div v-else>
            <!-- Staff info header -->
            <div class="flex justify-between items-center mb-4">
                <div>
                    <Button icon="pi pi-arrow-left" text @click="goBack" class="mr-2" />
                    <span class="font-semibold text-xl">Quản lý lương nhân viên</span>
                </div>
            </div>

            <!-- Staff details -->
            <Card class="mb-4">
                <template #title>
                    <div class="text-xl font-bold">{{ staff?.fullName }}</div>
                </template>
                <template #subtitle>
                    <div class="text-gray-600">Mã nhân viên: {{ staff?.shortName }}</div>
                </template>
                <template #content>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <div class="text-sm text-gray-600">Số điện thoại</div>
                            <div>{{ staff?.phoneNumber || 'Không có' }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">CCCD</div>
                            <div>{{ staff?.vietnamId || 'Không có' }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Tổng lương</div>
                            <div class="text-xl font-bold text-green-600">
                                {{ formatCurrency(totalSalary) }}
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Monthly salary tabs -->
            <TabView v-model:activeIndex="activeMonthIndex">
                <TabPanel v-for="(month, index) in monthlyTrips" :key="index" :header="month.displayName">
                    <div class="mb-4">
                        <Card class="shadow-sm">
                            <template #title>
                                <div class="flex justify-between items-center">
                                    <div class="text-lg font-bold">Tổng lương tháng {{ month.displayName }}</div>
                                    <Button icon="pi pi-pencil" outlined size="small" @click="openAdjustmentDialog(month)" tooltip="Điều chỉnh lương tháng" />
                                </div>
                            </template>
                            <template #content>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <div class="text-sm text-gray-600">Lương cơ bản</div>
                                        <div class="text-xl font-bold text-blue-600">{{ formatCurrency(month.totalSalary) }}</div>
                                    </div>

                                    <div>
                                        <div class="text-sm text-gray-600">Điều chỉnh</div>
                                        <div class="text-xl font-bold" :class="{ 'text-green-600': month.adjustment > 0, 'text-red-500': month.adjustment < 0, 'text-gray-500': month.adjustment === 0 }">
                                            {{ formatCurrency(month.adjustment || 0) }}
                                        </div>
                                        <div v-if="month.adjustmentReason" class="text-sm text-gray-500 mt-1">
                                            {{ month.adjustmentReason }}
                                        </div>
                                    </div>

                                    <div>
                                        <div class="text-sm text-gray-600">Tổng lương tháng</div>
                                        <div class="text-2xl font-bold text-green-600">{{ formatCurrency(month.finalSalary) }}</div>
                                    </div>
                                </div>
                            </template>
                        </Card>
                    </div>

                    <!-- Trips table for this month -->
                    <DataTable :value="month.trips" :paginator="true" :rows="10" :rowsPerPageOptions="[5, 10, 20]" responsiveLayout="scroll" class="p-datatable-sm">
                        <Column field="tripDate" header="Ngày đi" sortable>
                            <template #body="{ data }">
                                {{ formatDate(data.tripDate) }}
                            </template>
                        </Column>
                        <Column field="role" header="Vai trò" sortable>
                            <template #body="{ data }">
                                <Tag :severity="getRoleSeverity(data.role)" :value="getRoleLabel(data.role)" />
                            </template>
                        </Column>
                        <Column field="vehicleLicenseNumber" header="Biển số xe" sortable></Column>
                        <Column field="startingPoint" header="Điểm đi" sortable></Column>
                        <Column field="endingPoint" header="Điểm đến" sortable></Column>
                        <Column field="companyName" header="Khách hàng" sortable></Column>
                        <Column field="price" header="Giá chuyến" sortable>
                            <template #body="{ data }">
                                {{ formatCurrency(data.price || 0) }}
                            </template>
                        </Column>
                        <Column field="salary" header="Lương" sortable>
                            <template #body="{ data }">
                                <span class="font-bold text-green-600">{{ formatCurrency(data.salary || 0) }}</span>
                            </template>
                        </Column>
                        <Column field="status" header="Trạng thái" sortable>
                            <template #body="{ data }">
                                <Tag :severity="getStatusSeverity(data.status)" :value="getStatusLabel(data.status)" />
                            </template>
                        </Column>
                        <Column header="Thao tác" style="width: 8rem">
                            <template #body="slotProps">
                                <Button icon="pi pi-eye" outlined rounded @click="router.push(`/trip/edit/${slotProps.data.id}`)" tooltip="Xem chi tiết chuyến xe" />
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>

                <!-- Empty state for no monthly data -->
                <div v-if="monthlyTrips.length === 0" class="text-center p-4">
                    <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
                    <p>Không tìm thấy dữ liệu lương cho nhân viên này</p>
                </div>
            </TabView>

            <!-- All trips table -->
            <div class="mt-6">
                <h3 class="text-lg font-semibold mb-2">Tất cả chuyến xe</h3>
                <DataTable :value="trips" :paginator="true" :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]" responsiveLayout="scroll" class="p-datatable-sm" :sortField="'tripDate'" :sortOrder="-1">
                    <Column field="tripDate" header="Ngày đi" sortable>
                        <template #body="{ data }">
                            {{ formatDate(data.tripDate) }}
                        </template>
                    </Column>
                    <Column field="role" header="Vai trò" sortable>
                        <template #body="{ data }">
                            <Tag :severity="getRoleSeverity(data.role)" :value="getRoleLabel(data.role)" />
                        </template>
                    </Column>
                    <Column field="vehicleLicenseNumber" header="Biển số xe" sortable></Column>
                    <Column field="startingPoint" header="Điểm đi" sortable></Column>
                    <Column field="endingPoint" header="Điểm đến" sortable></Column>
                    <Column field="companyName" header="Khách hàng" sortable></Column>
                    <Column field="price" header="Giá chuyến" sortable>
                        <template #body="{ data }">
                            {{ formatCurrency(data.price || 0) }}
                        </template>
                    </Column>
                    <Column field="salary" header="Lương" sortable>
                        <template #body="{ data }">
                            <span class="font-bold text-green-600">{{ formatCurrency(data.salary || 0) }}</span>
                        </template>
                    </Column>
                    <Column field="status" header="Trạng thái" sortable>
                        <template #body="{ data }">
                            <Tag :severity="getStatusSeverity(data.status)" :value="getStatusLabel(data.status)" />
                        </template>
                    </Column>
                    <Column header="Thao tác" style="width: 8rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-eye" outlined rounded @click="router.push(`/trip/edit/${slotProps.data.id}`)" tooltip="Xem chi tiết chuyến xe" />
                        </template>
                    </Column>
                </DataTable>

                <!-- Empty state for no trips -->
                <div v-if="trips.length === 0" class="text-center p-4">
                    <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
                    <p>Không tìm thấy chuyến xe nào cho nhân viên này</p>
                </div>
            </div>
        </div>

        <!-- Salary Adjustment Dialog -->
        <Dialog v-model:visible="adjustmentDialog" :header="`Điều chỉnh lương tháng ${selectedMonth?.displayName || ''}`" :modal="true" :closable="true" :style="{ width: '450px' }">
            <div class="p-4">
                <div class="mb-4">
                    <label for="adjustmentAmount" class="block text-sm font-medium text-gray-700 mb-1">Số tiền điều chỉnh</label>
                    <InputNumber id="adjustmentAmount" v-model="adjustmentAmount" mode="currency" currency="VND" locale="vi-VN" class="w-full" placeholder="Nhập số tiền điều chỉnh" />
                    <small class="text-gray-500">Nhập số dương để tăng lương, số âm để giảm lương</small>
                </div>

                <div class="mb-4">
                    <label for="adjustmentReason" class="block text-sm font-medium text-gray-700 mb-1">Lý do điều chỉnh</label>
                    <InputText id="adjustmentReason" v-model="adjustmentReason" class="w-full" placeholder="Nhập lý do điều chỉnh lương" />
                </div>

                <Divider />

                <div class="mt-4">
                    <div class="font-semibold">Thông tin lương:</div>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div class="text-gray-600">Lương cơ bản:</div>
                        <div class="text-right">{{ formatCurrency(selectedMonth?.totalSalary || 0) }}</div>

                        <div class="text-gray-600">Điều chỉnh:</div>
                        <div class="text-right" :class="{ 'text-green-600': adjustmentAmount > 0, 'text-red-500': adjustmentAmount < 0 }">
                            {{ formatCurrency(adjustmentAmount || 0) }}
                        </div>

                        <div class="text-gray-600 font-semibold">Tổng lương:</div>
                        <div class="text-right font-semibold">
                            {{ formatCurrency((selectedMonth?.totalSalary || 0) + (adjustmentAmount || 0)) }}
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Hủy" icon="pi pi-times" text @click="adjustmentDialog = false" />
                <Button label="Lưu" icon="pi pi-check" severity="success" @click="saveAdjustment" :loading="savingAdjustment" />
            </template>
        </Dialog>
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
