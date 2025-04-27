<script setup>
import { db } from '@/config/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

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
const errorMessage = ref('');
const submitted = ref(false);
const validationErrors = ref({});

// Router and toast for navigation and notifications
const router = useRouter();
const toast = useToast();

// Vehicle type options
const vehicleTypes = [
    { label: 'Xe tải', value: 'TRUCK' },
    { label: 'Rơ móc', value: 'TRAILER' },
    { label: 'Xe đầu kéo', value: 'TRACTOR' },
    { label: 'Xe ô tô', value: 'CAR' }
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

    // // Registration Date validation
    // if (!vehicleData.value.registrationDate) {
    //     validationErrors.value.registrationDate = 'Vui lòng chọn ngày đăng ký';
    //     isValid = false;
    // }

    // // Manufacturer validation
    // if (!vehicleData.value.manufacturer) {
    //     validationErrors.value.manufacturer = 'Vui lòng nhập hãng sản xuất';
    //     isValid = false;
    // }

    // // Vehicle Type validation
    // if (!vehicleData.value.vehicleType) {
    //     validationErrors.value.vehicleType = 'Vui lòng chọn loại xe';
    //     isValid = false;
    // }

    // // Capacity validation
    // if (!vehicleData.value.capacity || vehicleData.value.capacity <= 0) {
    //     validationErrors.value.capacity = 'Vui lòng nhập tải trọng hợp lệ';
    //     isValid = false;
    // }

    return isValid;
};

/**
 * Saves vehicle data to Firestore
 */
const saveVehicle = async () => {
    errorMessage.value = '';

    if (!validateForm()) {
        errorMessage.value = 'Vui lòng điền đầy đủ thông tin bắt buộc';
        return;
    }

    loading.value = true;

    try {
        const vehiclesCollectionRef = collection(db, 'vehicles');
        const vehicleDataToSave = {
            ...vehicleData.value,
            registrationDate: vehicleData.value.registrationDate ? new Date(vehicleData.value.registrationDate).toISOString() : null,
            registrationExpiryDate: vehicleData.value.registrationExpiryDate ? new Date(vehicleData.value.registrationExpiryDate).toISOString() : null,
            insuranceExpiryDate: vehicleData.value.insuranceExpiryDate ? new Date(vehicleData.value.insuranceExpiryDate).toISOString() : null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await addDoc(vehiclesCollectionRef, vehicleDataToSave);

        // Show success toast notification
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Lưu thông tin xe thành công!',
            life: 3000
        });

        // Navigate back to vehicle list page
        router.push('/vehicle/list');
    } catch (error) {
        console.error('Lỗi khi lưu thông tin xe:', error);
        errorMessage.value = 'Không thể lưu thông tin xe. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <Fluid>
        <div class="card">
            <h2 class="text-2xl font-bold mb-4">Thông Tin Xe</h2>

            <!-- Error message alert -->
            <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
                {{ errorMessage }}
            </div>

            <form @submit.prevent="saveVehicle" class="flex flex-col gap-4">
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

                    <!-- Capacity -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div class="flex flex-col gap-2">
                            <label for="capacity">Tải trọng (tấn) <span class="text-red-500">*</span></label>
                            <InputNumber id="capacity" v-model="vehicleData.capacity" placeholder="Nhập tải trọng" :min="0" :class="{ 'p-invalid': submitted && validationErrors.capacity }" />
                            <small v-if="submitted && validationErrors.capacity" class="p-error">
                                {{ validationErrors.capacity }}
                            </small>
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

                <!-- Submit Button -->
                <div class="flex justify-end mt-4">
                    <Button type="submit" :label="loading ? 'Đang lưu...' : 'Lưu thông tin'" icon="pi pi-save" :loading="loading" :disabled="loading" />
                </div>
            </form>
        </div>
    </Fluid>
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
