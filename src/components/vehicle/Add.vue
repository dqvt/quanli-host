<script setup>
import { supabase } from '@/config/supabase';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
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
    license_number: '',
    brand: '',
    model: '',
    year: null,
    vehicle_type: '',
    capacity: null,
    status: 'active',
    registration_expiry_date: null,
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
    if (!vehicleData.value.license_number) {
        validationErrors.value.license_number = 'Vui lòng nhập biển số xe';
        isValid = false;
    }

    return isValid;
};

/**
 * Saves vehicle data to Supabase
 */
const saveVehicle = async () => {
    errorMessage.value = '';

    if (!validateForm()) {
        errorMessage.value = 'Vui lòng điền đầy đủ thông tin bắt buộc';
        return;
    }

    loading.value = true;

    try {
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
            registration_expiry_date: convertToISOString(vehicleData.value.registration_expiry_date),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('vehicles').insert(vehicleDataToSave).select().single();

        if (error) throw error;

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
                        <label for="license_number">Biển số xe <span class="text-red-500">*</span></label>
                        <InputText id="license_number" v-model="vehicleData.license_number" placeholder="Nhập biển số xe" :class="{ 'p-invalid': submitted && validationErrors.license_number }" />
                        <small v-if="submitted && validationErrors.license_number" class="p-error">
                            {{ validationErrors.license_number }}
                        </small>
                    </div>

                    <!-- Vehicle Type -->
                    <div class="flex flex-col gap-2">
                        <label for="vehicle_type">Loại xe <span class="text-red-500">*</span></label>
                        <Dropdown id="vehicle_type" v-model="vehicleData.vehicle_type" :options="vehicleTypes" optionLabel="label" optionValue="value" placeholder="Chọn loại xe" :class="{ 'p-invalid': submitted && validationErrors.vehicle_type }" />
                        <small v-if="submitted && validationErrors.vehicle_type" class="p-error">
                            {{ validationErrors.vehicle_type }}
                        </small>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <!-- Manufacturer -->
                    <div class="flex flex-col gap-2">
                        <label for="brand">Hãng sản xuất <span class="text-red-500">*</span></label>
                        <InputText id="brand" v-model="vehicleData.brand" placeholder="Nhập hãng sản xuất" :class="{ 'p-invalid': submitted && validationErrors.brand }" />
                        <small v-if="submitted && validationErrors.brand" class="p-error">
                            {{ validationErrors.brand }}
                        </small>
                    </div>

                    <!-- Model -->
                    <div class="flex flex-col gap-2">
                        <label for="model">Model</label>
                        <InputText id="model" v-model="vehicleData.model" placeholder="Nhập model xe" />
                    </div>

                    <!-- Year of Manufacture -->
                    <div class="flex flex-col gap-2">
                        <label for="year">Năm sản xuất</label>
                        <InputNumber id="year" v-model="vehicleData.year" placeholder="Nhập năm sản xuất" :min="1900" :max="new Date().getFullYear()" />
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
                    <!-- Registration Expiry Date -->
                    <div class="flex flex-col gap-2">
                        <label for="registration_expiry_date">Ngày hết hạn đăng ký</label>
                        <Calendar id="registration_expiry_date" v-model="vehicleData.registration_expiry_date" dateFormat="dd/mm/yy" placeholder="Chọn ngày hết hạn" :showIcon="true" />
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
