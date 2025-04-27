<script setup>
import { db } from '@/config/firebase';
import * as balanceService from '@/services/balance';
import * as expenseService from '@/services/expense';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const expenses = ref([]);
const loading = ref(false);
const staffName = ref(route.params.staffName || '');
const staffInfo = ref(null);
const staffId = ref('');
const lastModifiedDate = ref(null);

// Dialog states
const showExpenseDialog = ref(false);
const showCreditDialog = ref(false);
const showEditBalanceDialog = ref(false);
const savingTransaction = ref(false);

// Form data
const newTransaction = ref({
    amount: null,
    reason: '',
    date: new Date(),
    description: ''
});

// Edit balance form data
const editBalanceData = ref({
    balance: null,
    reason: '',
    date: new Date()
});

// Form validation
const submitted = ref(false);
const validationErrors = ref({});

onMounted(() => {
    if (!staffName.value) {
        router.push('/expense/list');
        return;
    }
    fetchStaffInfo();
    fetchExpenses();
});

async function fetchStaffInfo() {
    try {
        const staffCollection = collection(db, 'staff');
        const q = query(staffCollection, where('shortName', '==', staffName.value));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            staffInfo.value = {
                id: querySnapshot.docs[0].id,
                ...querySnapshot.docs[0].data()
            };
            staffId.value = staffInfo.value.id;
        }
    } catch (error) {
        console.error('Error fetching staff info:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải thông tin nhân viên',
            life: 3000
        });
    }
}

async function fetchExpenses() {
    loading.value = true;
    try {
        // Wait for staff info to be fetched first if staffId is not available
        if (!staffId.value && staffName.value) {
            await fetchStaffInfo();
        }

        // Use the expense service to get staff expenses by staffId
        if (staffId.value) {
            console.log('Fetching expenses by staff ID:', staffId.value);
            const expensesList = await expenseService.getExpensesByStaffId(staffId.value);
            expenses.value = expensesList || [];
        } else {
            console.warn('Staff ID not available, falling back to staff name:', staffName.value);
            // Fallback to balance service if staffId is still not available
            const balanceData = await balanceService.getStaffBalance(staffName.value);
            expenses.value = balanceData.transactions || [];
        }

        // Always get the balance data for the balance display
        const balanceData = await balanceService.getStaffBalance(staffName.value);
        if (balanceData.balance !== undefined) {
            actualBalance.value = balanceData.balance;
            lastModifiedDate.value = balanceData.dateModified;
        }
    } catch (error) {
        console.error('Error fetching expenses:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải danh sách chi phí',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

// Store the actual balance from the balance collection
const actualBalance = ref(0);

// Calculate total balance
const totalBalance = computed(() => {
    // Use the actual balance from the balance collection if available
    return actualBalance.value;
});

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Open expense dialog
function openExpenseDialog() {
    resetForm();
    showExpenseDialog.value = true;
}

// Open credit dialog
function openCreditDialog() {
    resetForm();
    showCreditDialog.value = true;
}

// Open edit balance dialog
function openEditBalanceDialog() {
    // Reset edit balance form and set current balance
    editBalanceData.value = {
        balance: actualBalance.value,
        reason: 'Điều chỉnh số dư trực tiếp',
        date: new Date()
    };
    submitted.value = false;
    validationErrors.value = {};
    showEditBalanceDialog.value = true;
}

// Reset form
function resetForm() {
    newTransaction.value = {
        amount: null,
        reason: '',
        date: new Date(),
        description: ''
    };
    submitted.value = false;
    validationErrors.value = {};
}

// Validate form
function validateForm() {
    submitted.value = true;
    validationErrors.value = {};
    let isValid = true;

    if (!newTransaction.value.amount || newTransaction.value.amount <= 0) {
        validationErrors.value.amount = 'Vui lòng nhập số tiền hợp lệ';
        isValid = false;
    }

    if (!newTransaction.value.reason.trim()) {
        validationErrors.value.reason = 'Vui lòng nhập lý do';
        isValid = false;
    }

    if (!newTransaction.value.date) {
        validationErrors.value.date = 'Vui lòng chọn ngày';
        isValid = false;
    }

    return isValid;
}

// Save expense
async function saveExpense() {
    if (!validateForm()) {
        return;
    }

    savingTransaction.value = true;

    try {
        if (staffId.value && staffInfo.value) {
            // Use the expense service to create a new expense
            // This will automatically update the staff balance
            await expenseService.createExpense(
                newTransaction.value.amount,
                newTransaction.value.date,
                newTransaction.value.reason,
                staffInfo.value.fullName,
                staffId.value,
                null, // tripId
                newTransaction.value.description
            );
        } else {
            // Fallback to balance service if staffId is not available
            await balanceService.addExpense(staffName.value, newTransaction.value.amount, newTransaction.value.reason, newTransaction.value.date);
        }

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã lưu thông tin chi phí',
            life: 3000
        });

        showExpenseDialog.value = false;
        fetchExpenses(); // Refresh the expense list
    } catch (error) {
        console.error('Error saving expense:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể lưu thông tin chi phí',
            life: 3000
        });
    } finally {
        savingTransaction.value = false;
    }
}

// Save credit (direct balance update)
async function saveCredit() {
    if (!validateForm()) {
        return;
    }

    savingTransaction.value = true;

    try {
        // Use the balance service to directly update the staff balance
        await balanceService.updateStaffBalanceDirectly(staffName.value, newTransaction.value.amount, newTransaction.value.reason, newTransaction.value.date);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã cập nhật tiền tạm ứng',
            life: 3000
        });

        showCreditDialog.value = false;
        fetchExpenses(); // Refresh the expense list
    } catch (error) {
        console.error('Error updating balance:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể cập nhật tiền tạm ứng',
            life: 3000
        });
    } finally {
        savingTransaction.value = false;
    }
}

// Validate edit balance form
function validateEditBalanceForm() {
    submitted.value = true;
    validationErrors.value = {};
    let isValid = true;

    if (editBalanceData.value.balance === null || editBalanceData.value.balance === undefined) {
        validationErrors.value.editBalance = 'Vui lòng nhập số dư';
        isValid = false;
    }

    if (!editBalanceData.value.reason.trim()) {
        validationErrors.value.editReason = 'Vui lòng nhập lý do';
        isValid = false;
    }

    if (!editBalanceData.value.date) {
        validationErrors.value.editDate = 'Vui lòng chọn ngày';
        isValid = false;
    }

    return isValid;
}

// Save edited balance
async function saveEditedBalance() {
    if (!validateEditBalanceForm()) {
        return;
    }

    savingTransaction.value = true;

    try {
        // Use the balance service to set the staff balance to a specific value
        await balanceService.setStaffBalance(staffName.value, editBalanceData.value.balance, editBalanceData.value.reason, editBalanceData.value.date);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã cập nhật số dư trực tiếp',
            life: 3000
        });

        showEditBalanceDialog.value = false;
        fetchExpenses(); // Refresh the expense list and balance
    } catch (error) {
        console.error('Error setting balance:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể cập nhật số dư trực tiếp',
            life: 3000
        });
    } finally {
        savingTransaction.value = false;
    }
}
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-4">
            <div class="font-semibold text-xl">Thông tin chi phí của nhân viên: {{ staffInfo?.fullName || staffName }}</div>
            <Button label="Quay lại" icon="pi pi-arrow-left" @click="router.push('/expense/list')" />
        </div>

        <!-- Staff Balance Summary Card -->
        <Card class="mb-4">
            <template #title>
                <div class="flex justify-between items-center">
                    <span>Số Dư</span>
                    <span class="text-xl font-bold" :class="totalBalance > 0 ? 'text-red-500' : 'text-green-500'"> {{ formatCurrency(totalBalance) }} <span v-if="totalBalance > 0" class="text-sm ml-1">(đang giữ)</span> </span>
                </div>
            </template>
            <template #content>
                <div class="text-sm text-gray-600 mb-4">
                    <p v-if="staffInfo">
                        <strong>Họ và tên:</strong> {{ staffInfo.fullName }}<br />
                        <strong>Số điện thoại:</strong> {{ staffInfo.phoneNumber || 'N/A' }}<br />
                        <strong>Ngày cập nhật:</strong> {{ lastModifiedDate ? formatDate(lastModifiedDate) : 'Chưa có cập nhật' }}<br />
                    </p>
                    <p v-else>Đang tải thông tin nhân viên...</p>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-2">
                    <Button label="Thêm chi phí" icon="pi pi-plus" severity="danger" @click="openExpenseDialog" />
                    <Button label="Thêm tiền tạm ứng" icon="pi pi-wallet" severity="success" @click="openCreditDialog" />
                    <Button label="Chỉnh sửa số dư" icon="pi pi-pencil" severity="info" @click="openEditBalanceDialog" />
                </div>
            </template>
        </Card>

        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <!-- Results table -->
        <DataTable
            v-else
            :value="expenses"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            responsiveLayout="scroll"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} expenses"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        >
            <Column field="date" header="Ngày" sortable>
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.date || slotProps.data.createdDate) }}
                </template>
            </Column>
            <Column field="reason" header="Lý do chi" sortable></Column>
            <Column field="amount" header="Số tiền" sortable>
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.amount) }}
                </template>
            </Column>
            <Column field="description" header="Mô tả" v-if="expenses.some((e) => e.description)" sortable></Column>
        </DataTable>

        <!-- Empty state -->
        <div v-if="!loading && expenses.length === 0" class="text-center p-4">
            <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
            <p>Không tìm thấy chi phí nào cho nhân viên này</p>
        </div>
    </div>

    <!-- Add Expense Dialog -->
    <Dialog v-model:visible="showExpenseDialog" :style="{ width: '450px' }" header="Thêm chi phí" :modal="true" :closable="!savingTransaction">
        <div class="flex flex-col gap-4">
            <!-- Amount -->
            <div class="flex flex-col gap-2">
                <label for="amount">Số tiền <span class="text-red-500">*</span></label>
                <InputNumber id="amount" v-model="newTransaction.amount" mode="currency" currency="VND" locale="vi-VN" :min="0" placeholder="Nhập số tiền" :class="{ 'p-invalid': submitted && validationErrors.amount }" />
                <small v-if="submitted && validationErrors.amount" class="p-error">
                    {{ validationErrors.amount }}
                </small>
            </div>

            <!-- Date -->
            <div class="flex flex-col gap-2">
                <label for="date">Ngày <span class="text-red-500">*</span></label>
                <DatePicker id="date" v-model="newTransaction.date" :showIcon="true" dateFormat="dd/mm/yy" placeholder="Chọn ngày" :class="{ 'p-invalid': submitted && validationErrors.date }" />
                <small v-if="submitted && validationErrors.date" class="p-error">
                    {{ validationErrors.date }}
                </small>
            </div>

            <!-- Reason -->
            <div class="flex flex-col gap-2">
                <label for="reason">Lý do chi <span class="text-red-500">*</span></label>
                <InputText id="reason" v-model="newTransaction.reason" placeholder="Nhập lý do chi" :class="{ 'p-invalid': submitted && validationErrors.reason }" />
                <small v-if="submitted && validationErrors.reason" class="p-error">
                    {{ validationErrors.reason }}
                </small>
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-2">
                <label for="description">Mô tả</label>
                <InputText id="description" v-model="newTransaction.description" placeholder="Nhập mô tả chi tiết (không bắt buộc)" />
            </div>
        </div>
        <template #footer>
            <Button label="Hủy" icon="pi pi-times" @click="showExpenseDialog = false" class="p-button-text" :disabled="savingTransaction" />
            <Button label="Lưu" icon="pi pi-check" @click="saveExpense" :loading="savingTransaction" />
        </template>
    </Dialog>

    <!-- Add Credit Dialog -->
    <Dialog v-model:visible="showCreditDialog" :style="{ width: '450px' }" header="Cập nhật tiền tạm ứng" :modal="true" :closable="!savingTransaction">
        <div class="flex flex-col gap-4">
            <!-- Amount -->
            <div class="flex flex-col gap-2">
                <label for="creditAmount">Số tiền <span class="text-red-500">*</span></label>
                <InputNumber id="creditAmount" v-model="newTransaction.amount" mode="currency" currency="VND" locale="vi-VN" :min="0" placeholder="Nhập số tiền" :class="{ 'p-invalid': submitted && validationErrors.amount }" />
                <small v-if="submitted && validationErrors.amount" class="p-error">
                    {{ validationErrors.amount }}
                </small>
            </div>

            <!-- Date -->
            <div class="flex flex-col gap-2">
                <label for="creditDate">Ngày <span class="text-red-500">*</span></label>
                <DatePicker id="creditDate" v-model="newTransaction.date" :showIcon="true" dateFormat="dd/mm/yy" placeholder="Chọn ngày" :class="{ 'p-invalid': submitted && validationErrors.date }" />
                <small v-if="submitted && validationErrors.date" class="p-error">
                    {{ validationErrors.date }}
                </small>
            </div>

            <!-- Reason -->
            <div class="flex flex-col gap-2">
                <label for="creditReason">Lý do cập nhật <span class="text-red-500">*</span></label>
                <InputText id="creditReason" v-model="newTransaction.reason" placeholder="Nhập lý do cập nhật tiền tạm ứng" :class="{ 'p-invalid': submitted && validationErrors.reason }" />
                <small v-if="submitted && validationErrors.reason" class="p-error">
                    {{ validationErrors.reason }}
                </small>
            </div>
        </div>
        <template #footer>
            <Button label="Hủy" icon="pi pi-times" @click="showCreditDialog = false" class="p-button-text" :disabled="savingTransaction" />
            <Button label="Cập nhật" icon="pi pi-check" severity="success" @click="saveCredit" :loading="savingTransaction" />
        </template>
    </Dialog>

    <!-- Edit Balance Dialog -->
    <Dialog v-model:visible="showEditBalanceDialog" :style="{ width: '450px' }" header="Chỉnh sửa số dư trực tiếp" :modal="true" :closable="!savingTransaction">
        <div class="flex flex-col gap-4">
            <!-- Balance -->
            <div class="flex flex-col gap-2">
                <label for="editBalance">Số dư mới <span class="text-red-500">*</span></label>
                <InputNumber id="editBalance" v-model="editBalanceData.balance" mode="currency" currency="VND" locale="vi-VN" :min="0" placeholder="Nhập số dư mới" :class="{ 'p-invalid': submitted && validationErrors.editBalance }" />
                <small v-if="submitted && validationErrors.editBalance" class="p-error">
                    {{ validationErrors.editBalance }}
                </small>
            </div>

            <!-- Date -->
            <div class="flex flex-col gap-2">
                <label for="editDate">Ngày <span class="text-red-500">*</span></label>
                <DatePicker id="editDate" v-model="editBalanceData.date" :showIcon="true" dateFormat="dd/mm/yy" placeholder="Chọn ngày" :class="{ 'p-invalid': submitted && validationErrors.editDate }" />
                <small v-if="submitted && validationErrors.editDate" class="p-error">
                    {{ validationErrors.editDate }}
                </small>
            </div>

            <!-- Reason -->
            <div class="flex flex-col gap-2">
                <label for="editReason">Lý do chỉnh sửa <span class="text-red-500">*</span></label>
                <InputText id="editReason" v-model="editBalanceData.reason" placeholder="Nhập lý do chỉnh sửa số dư" :class="{ 'p-invalid': submitted && validationErrors.editReason }" />
                <small v-if="submitted && validationErrors.editReason" class="p-error">
                    {{ validationErrors.editReason }}
                </small>
            </div>
        </div>
        <template #footer>
            <Button label="Hủy" icon="pi pi-times" @click="showEditBalanceDialog = false" class="p-button-text" :disabled="savingTransaction" />
            <Button label="Lưu thay đổi" icon="pi pi-check" severity="info" @click="saveEditedBalance" :loading="savingTransaction" />
        </template>
    </Dialog>
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

.p-invalid {
    border-color: #dc3545;
}

.p-error {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
}
</style>
