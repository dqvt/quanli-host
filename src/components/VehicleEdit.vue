<script setup>
import { db } from '@/config/firebase';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import Button from 'primevue/button';
import DatePicker from 'primevue/calendar';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import ProgressSpinner from 'primevue/progressspinner';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Router and toast for navigation and notifications
const route = useRoute();
const router = useRouter();
const toast = useToast();

// Initial vehicle data structure
const vehicleData = ref({
    licensePlate: '',
    registrationDate: '',
    manufacturer: '',
    model: '',
    yearOfManufacture: null,
    vehicleType: '',
    chassisNumber: '',
    engineNumber: '',
    registrationExpiryDate: '',
    insuranceExpiryDate: '',
    capacity: null,
    status: 'ACTIVE',
    notes: ''
});

// UI state variables
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const submitted = ref(false);
const validationErrors = ref({});
const deleteDialog = ref(false);

// Vehicle type options
const vehicleTypes = [
    { label: 'Xe tải', value: 'TRUCK' },
    { label: 'Rơ móc', value: 'TRAILER' },
    { label: 'Xe đầu kéo', value: 'TRACTOR' }
];

// Status options
const statusOptions = [
    { label: 'Đang hoạt động', value: 'ACTIVE' },
    { label: 'Ngừng hoạt động', value: 'INACTIVE' }
];

/**
 * Validates the form fields
 * @returns {boolean} True if form is valid, false otherwise
 */
const validateForm = () => {
    submitted.value = true;
    validationErrors.value = {};
    let isValid = true;

    // License Plate validation
    if (!vehicleData.value.licensePlate) {
        validationErrors.value.licensePlate = 'Vui lòng nhập biển số xe';
        isValid = false;
    }

    return isValid;
};

// Load vehicle data on component mount
onMounted(async () => {
    const vehicleId = route.params.id;
    if (!vehicleId) {
        router.push('/vehicle/list');
        return;
    }

    loading.value = true;
    try {
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        const vehicleDoc = await getDoc(vehicleRef);

        if (!vehicleDoc.exists()) {
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không tìm thấy thông tin xe',
                life: 3000
            });
            router.push('/vehicle/list');
            return;
        }

        const data = vehicleDoc.data();
        // Convert Firestore Timestamps to Date objects
        ['registrationDate', 'registrationExpiryDate', 'insuranceExpiryDate'].forEach((field) => {
            if (data[field]) {
                // Check if the field is a Firestore Timestamp (has toDate method)
                if (data[field].toDate && typeof data[field].toDate === 'function') {
                    data[field] = data[field].toDate();
                } else if (typeof data[field] === 'string') {
                    // If it's a string (ISO format), convert to Date
                    data[field] = new Date(data[field]);
                }
                // If it's already a Date object or another format, leave as is
            }
        });

        vehicleData.value = { ...data };
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        errorMessage.value = 'Không thể tải thông tin xe';
    } finally {
        loading.value = false;
    }
});

/**
 * Updates vehicle data in Firestore
 */
const saveVehicle = async () => {
    errorMessage.value = '';

    if (!validateForm()) {
        errorMessage.value = 'Vui lòng điền đầy đủ thông tin bắt buộc';
        return;
    }

    saving.value = true;
    try {
        const vehicleId = route.params.id;
        const vehicleRef = doc(db, 'vehicles', vehicleId);

        // Helper function to safely convert date values
        const convertToISOString = (dateValue) => {
            if (!dateValue) return null;

            try {
                // If it's already a Date object
                if (dateValue instanceof Date) {
                    return dateValue.toISOString();
                }
                // If it's a string or timestamp, convert to Date first
                return new Date(dateValue).toISOString();
            } catch (e) {
                console.warn(`Failed to convert date: ${dateValue}`, e);
                return null;
            }
        };

        const vehicleDataToSave = {
            ...vehicleData.value,
            registrationDate: convertToISOString(vehicleData.value.registrationDate),
            registrationExpiryDate: convertToISOString(vehicleData.value.registrationExpiryDate),
            insuranceExpiryDate: convertToISOString(vehicleData.value.insuranceExpiryDate),
            updatedAt: new Date()
        };

        await updateDoc(vehicleRef, vehicleDataToSave);

        // Show success toast notification
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã cập nhật thông tin xe',
            life: 3000
        });

        // Navigate back to vehicle list page
        router.push('/vehicle/list');
    } catch (error) {
        console.error('Error updating vehicle:', error);
        errorMessage.value = 'Không thể cập nhật thông tin xe. Vui lòng thử lại.';
    } finally {
        saving.value = false;
    }
};

// Confirm delete dialog
function confirmDelete() {
    deleteDialog.value = true;
}

// Delete vehicle from Firestore
async function deleteVehicle() {
    try {
        const vehicleId = route.params.id;
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        await deleteDoc(vehicleRef);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa xe',
            life: 3000
        });

        router.push('/vehicle/list');
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa xe. Vui lòng thử lại.',
            life: 3000
        });
    } finally {
        deleteDialog.value = false;
    }
}
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Thông Tin Xe</h2>

        <!-- Error message alert -->
        <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
            {{ errorMessage }}
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <form v-else @submit.prevent="saveVehicle" class="flex flex-col gap-4">
            <!-- Basic Vehicle Information -->
            <Panel>
                <template #header>
                    <span class="font-bold">Thông tin cơ bản</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- License Plate -->
                    <div class="flex flex-col gap-2">
                        <label for="licensePlate">Biển số xe <span class="text-red-500">*</span></label>
                        <InputText id="licensePlate" v-model="vehicleData.licensePlate" placeholder="Nhập biển số xe" :class="{ 'p-invalid': submitted && validationErrors.licensePlate }" />
                        <small v-if="submitted && validationErrors.licensePlate" class="p-error">
                            {{ validationErrors.licensePlate }}
                        </small>
                    </div>

                    <!-- Vehicle Type -->
                    <div class="flex flex-col gap-2">
                        <label for="vehicleType">Loại xe <span class="text-red-500">*</span></label>
                        <Dropdown id="vehicleType" v-model="vehicleData.vehicleType" :options="vehicleTypes" optionLabel="label" optionValue="value" placeholder="Chọn loại xe" :class="{ 'p-invalid': submitted && validationErrors.vehicleType }" />
                        <small v-if="submitted && validationErrors.vehicleType" class="p-error">
                            {{ validationErrors.vehicleType }}
                        </small>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <!-- Manufacturer -->
                    <div class="flex flex-col gap-2">
                        <label for="manufacturer">Hãng sản xuất <span class="text-red-500">*</span></label>
                        <InputText id="manufacturer" v-model="vehicleData.manufacturer" placeholder="Nhập hãng sản xuất" :class="{ 'p-invalid': submitted && validationErrors.manufacturer }" />
                        <small v-if="submitted && validationErrors.manufacturer" class="p-error">
                            {{ validationErrors.manufacturer }}
                        </small>
                    </div>

                    <!-- Model -->
                    <div class="flex flex-col gap-2">
                        <label for="model">Model</label>
                        <InputText id="model" v-model="vehicleData.model" placeholder="Nhập model xe" />
                    </div>

                    <!-- Year of Manufacture -->
                    <div class="flex flex-col gap-2">
                        <label for="yearOfManufacture">Năm sản xuất</label>
                        <InputNumber id="yearOfManufacture" v-model="vehicleData.yearOfManufacture" placeholder="Nhập năm sản xuất" :min="1900" :max="new Date().getFullYear()" />
                    </div>
                </div>

                <!-- Status and Capacity -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div class="flex flex-col gap-2">
                        <label for="capacity">Tải trọng (tấn) <span class="text-red-500">*</span></label>
                        <InputNumber id="capacity" v-model="vehicleData.capacity" placeholder="Nhập tải trọng" :min="0" :class="{ 'p-invalid': submitted && validationErrors.capacity }" />
                        <small v-if="submitted && validationErrors.capacity" class="p-error">
                            {{ validationErrors.capacity }}
                        </small>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="status">Trạng thái <span class="text-red-500">*</span></label>
                        <Dropdown id="status" v-model="vehicleData.status" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Chọn trạng thái" />
                    </div>
                </div>
            </Panel>

            <!-- Registration Information -->
            <Panel>
                <template #header>
                    <span class="font-bold">Thông tin đăng ký</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Registration Date -->
                    <div class="flex flex-col gap-2">
                        <label for="registrationDate">Ngày đăng ký <span class="text-red-500">*</span></label>
                        <DatePicker id="registrationDate" v-model="vehicleData.registrationDate" dateFormat="dd/mm/yy" placeholder="Chọn ngày đăng ký" :showIcon="true" :class="{ 'p-invalid': submitted && validationErrors.registrationDate }" />
                        <small v-if="submitted && validationErrors.registrationDate" class="p-error">
                            {{ validationErrors.registrationDate }}
                        </small>
                    </div>

                    <!-- Registration Expiry Date -->
                    <div class="flex flex-col gap-2">
                        <label for="registrationExpiryDate">Ngày hết hạn đăng ký</label>
                        <DatePicker id="registrationExpiryDate" v-model="vehicleData.registrationExpiryDate" dateFormat="dd/mm/yy" placeholder="Chọn ngày hết hạn" :showIcon="true" />
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <!-- Chassis Number -->
                    <div class="flex flex-col gap-2">
                        <label for="chassisNumber">Số khung</label>
                        <InputText id="chassisNumber" v-model="vehicleData.chassisNumber" placeholder="Nhập số khung" />
                    </div>

                    <!-- Engine Number -->
                    <div class="flex flex-col gap-2">
                        <label for="engineNumber">Số máy</label>
                        <InputText id="engineNumber" v-model="vehicleData.engineNumber" placeholder="Nhập số máy" />
                    </div>
                </div>
            </Panel>

            <!-- Insurance Information -->
            <Panel>
                <template #header>
                    <span class="font-bold">Thông tin bảo hiểm</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Insurance Expiry Date -->
                    <div class="flex flex-col gap-2">
                        <label for="insuranceExpiryDate">Ngày hết hạn bảo hiểm</label>
                        <DatePicker id="insuranceExpiryDate" v-model="vehicleData.insuranceExpiryDate" dateFormat="dd/mm/yy" placeholder="Chọn ngày hết hạn" :showIcon="true" />
                    </div>
                </div>
            </Panel>

            <!-- Additional Information -->
            <Panel>
                <template #header>
                    <span class="font-bold">Thông tin bổ sung</span>
                </template>

                <div class="flex flex-col gap-2">
                    <label for="notes">Ghi chú</label>
                    <Textarea id="notes" v-model="vehicleData.notes" rows="3" placeholder="Nhập ghi chú" />
                </div>
            </Panel>

            <!-- Action Buttons Row -->
            <div class="flex justify-between items-center mt-4">
                <!-- Delete Button (Left) -->
                <Button type="button" label="Xóa" severity="danger" @click="confirmDelete" outlined size="small" class="delete-btn" />

                <!-- Save/Cancel Buttons (Right) -->
                <div class="flex gap-2">
                    <Button type="button" label="Hủy" @click="router.push('/vehicle/list')" class="p-button-secondary" :disabled="saving" />
                    <Button type="submit" :label="saving ? 'Đang lưu...' : 'Lưu thông tin'" icon="pi pi-save" :loading="saving" :disabled="saving" />
                </div>
            </div>
        </form>

        <!-- Delete Confirmation Dialog -->
        <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="Xác nhận xóa" :modal="true">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-yellow-500" style="font-size: 2rem" />
                <span>
                    Bạn có chắc chắn muốn xóa xe biển số
                    <b>{{ vehicleData.licensePlate }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
                <Button label="Có" icon="pi pi-check" @click="deleteVehicle" severity="danger" outlined />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.p-invalid .p-inputtext,
.p-invalid .p-dropdown,
.p-invalid .p-datepicker input {
    border-color: #dc3545;
}

.p-error {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
}
</style>
