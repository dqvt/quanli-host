<script setup>
import { db } from '@/config/firebase';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();

// Data structure for expense
const expenseData = ref({
    staffShortName: '',
    amount: null,
    reason: '',
    date: null
});

// UI state
const loading = ref(false);
const submitted = ref(false);
const validationErrors = ref({});
const staffList = ref([]);

// Fetch staff list on component mount
onMounted(async () => {
    await fetchStaffList();
});

// Fetch staff list from Firestore
async function fetchStaffList() {
    try {
        const staffCollection = collection(db, 'staff');
        const querySnapshot = await getDocs(staffCollection);

        staffList.value = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            shortName: doc.data().shortName
        }));
    } catch (error) {
        console.error('Error fetching staff list:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải danh sách nhân viên',
            life: 3000
        });
    }
}

// Form validation
const validateForm = () => {
    submitted.value = true;
    validationErrors.value = {};
    let isValid = true;

    if (!expenseData.value.staffShortName) {
        validationErrors.value.staffShortName = 'Vui lòng chọn nhân viên';
        isValid = false;
    }

    if (!expenseData.value.amount || expenseData.value.amount <= 0) {
        validationErrors.value.amount = 'Vui lòng nhập số tiền hợp lệ';
        isValid = false;
    }

    if (!expenseData.value.reason.trim()) {
        validationErrors.value.reason = 'Vui lòng nhập lý do chi';
        isValid = false;
    }

    if (!expenseData.value.date) {
        validationErrors.value.date = 'Vui lòng chọn ngày';
        isValid = false;
    }

    return isValid;
};

// Save expense to Firestore
const saveExpense = async () => {
    if (!validateForm()) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Vui lòng điền đầy đủ thông tin bắt buộc',
            life: 3000
        });
        return;
    }

    loading.value = true;

    try {
        const expensesCollectionRef = collection(db, 'expenses');
        const expenseDataToSave = {
            ...expenseData.value,
            date: expenseData.value.date ? new Date(expenseData.value.date).toISOString() : null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await addDoc(expensesCollectionRef, expenseDataToSave);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã lưu thông tin chi phí',
            life: 3000
        });

        router.push('/expense/list');
    } catch (error) {
        console.error('Error saving expense:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể lưu thông tin chi phí',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Thêm Chi Phí</h2>

        <form @submit.prevent="saveExpense" class="flex flex-col gap-4">
            <Panel>
                <template #header>
                    <span class="font-bold">Thông tin chi phí</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Staff Selection -->
                    <div class="flex flex-col gap-2">
                        <label for="staffShortName">Tên nhân viên <span class="text-red-500">*</span></label>
                        <Dropdown
                            id="staffShortName"
                            v-model="expenseData.staffShortName"
                            :options="staffList"
                            optionLabel="shortName"
                            optionValue="shortName"
                            placeholder="Chọn nhân viên"
                            :class="{ 'p-invalid': submitted && validationErrors.staffShortName }"
                        />
                        <small v-if="submitted && validationErrors.staffShortName" class="p-error">
                            {{ validationErrors.staffShortName }}
                        </small>
                    </div>

                    <!-- Date -->
                    <div class="flex flex-col gap-2">
                        <label for="date">Ngày <span class="text-red-500">*</span></label>
                        <DatePicker id="date" v-model="expenseData.date" :showIcon="true" dateFormat="dd/mm/yy" placeholder="Chọn ngày" :class="{ 'p-invalid': submitted && validationErrors.date }" />
                        <small v-if="submitted && validationErrors.date" class="p-error">
                            {{ validationErrors.date }}
                        </small>
                    </div>

                    <!-- Amount -->
                    <div class="flex flex-col gap-2">
                        <label for="amount">Số tiền <span class="text-red-500">*</span></label>
                        <InputNumber id="amount" v-model="expenseData.amount" mode="currency" currency="VND" locale="vi-VN" :min="0" placeholder="Nhập số tiền" :class="{ 'p-invalid': submitted && validationErrors.amount }" />
                        <small v-if="submitted && validationErrors.amount" class="p-error">
                            {{ validationErrors.amount }}
                        </small>
                    </div>

                    <!-- Reason -->
                    <div class="flex flex-col gap-2">
                        <label for="reason">Lý do chi <span class="text-red-500">*</span></label>
                        <InputText id="reason" v-model="expenseData.reason" placeholder="Nhập lý do chi" :class="{ 'p-invalid': submitted && validationErrors.reason }" />
                        <small v-if="submitted && validationErrors.reason" class="p-error">
                            {{ validationErrors.reason }}
                        </small>
                    </div>
                </div>
            </Panel>

            <!-- Submit Button -->
            <div class="flex justify-end mt-4">
                <Button type="submit" :label="loading ? 'Đang lưu...' : 'Lưu thông tin'" icon="pi pi-save" :loading="loading" :disabled="loading" />
            </div>
        </form>
    </div>
</template>

<style scoped>
.p-invalid {
    border-color: #dc3545;
}

.p-error {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
}
</style>
