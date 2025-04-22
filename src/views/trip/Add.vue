<script setup>
import { db } from '@/config/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, watch } from 'vue';

// Initial trip data structure
const tripData = ref({
    tripDate: '',
    startingPoint: '',
    endingPoint: '',
    distance: null,
    driverName: '',
    customerName: '',
    assistantDriverName: '',
    expenses: {
        policeFee: 0,
        tollFee: 0,
        foodFee: 0,
        gasMoney: 0,
        mechanicFee: 0
    }
});

// UI state variables
const loading = ref(false);
const errorMessage = ref('');
const submitted = ref(false);
const validationErrors = ref({});

// Watch for changes in the distance field to update validation in real-time
watch(
    () => tripData.value.distance,
    (newValue) => {
        if (submitted.value) {
            // Re-validate distance when it changes after form submission
            const distanceValue = Number(newValue);
            if (newValue === null || newValue === undefined || newValue === '' || newValue === 0 || distanceValue === 0 || isNaN(distanceValue) || distanceValue <= 0) {
                // Set validation error
                validationErrors.value.distance = 'Vui lòng nhập quãng đường hợp lệ';
            } else {
                // Clear validation error
                delete validationErrors.value.distance;
            }
        }
    }
);

/**
 * Validates the form fields
 * @returns {boolean} True if form is valid, false otherwise
 */
const validateForm = () => {
    // Reset validation state
    submitted.value = true;
    validationErrors.value = {};
    let isValid = true;

    // Check each required field individually
    // Trip Date
    if (!tripData.value.tripDate) {
        validationErrors.value.tripDate = 'Vui lòng chọn ngày đi';
        isValid = false;
    }

    // Starting Point
    if (!tripData.value.startingPoint) {
        validationErrors.value.startingPoint = 'Vui lòng nhập điểm xuất phát';
        isValid = false;
    }

    // Ending Point
    if (!tripData.value.endingPoint) {
        validationErrors.value.endingPoint = 'Vui lòng nhập điểm đến';
        isValid = false;
    }

    // Distance - check if it's a valid positive number
    // Convert to number and check if it's a valid positive number
    const distanceValue = Number(tripData.value.distance);

    // Explicitly check for null, undefined, empty string, zero, NaN, or non-positive values
    if (tripData.value.distance === null || tripData.value.distance === undefined || tripData.value.distance === '' || tripData.value.distance === 0 || distanceValue === 0 || isNaN(distanceValue) || distanceValue <= 0) {
        validationErrors.value.distance = 'Vui lòng nhập quãng đường hợp lệ';
        isValid = false;
    }

    // Driver Name
    if (!tripData.value.driverName) {
        validationErrors.value.driverName = 'Vui lòng nhập tên tài xế';
        isValid = false;
    }

    // Customer Name
    if (!tripData.value.customerName) {
        validationErrors.value.customerName = 'Vui lòng nhập tên khách hàng';
        isValid = false;
    }

    return isValid;
};

/**
 * Saves trip data to Firestore
 */
const saveTrip = async () => {
    // Clear previous error message and start loading
    errorMessage.value = '';

    // Validate form
    if (!validateForm()) {
        errorMessage.value = 'Vui lòng điền đầy đủ thông tin bắt buộc';
        return;
    }

    loading.value = true;

    try {
        const tripsCollectionRef = collection(db, 'trips');
        const tripDataToSave = {
            ...tripData.value,
            tripDate: tripData.value.tripDate ? new Date(tripData.value.tripDate).toISOString() : null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'PENDING'
        };

        await addDoc(tripsCollectionRef, tripDataToSave);
        resetForm();
        alert('Lưu chuyến đi thành công!');
    } catch (error) {
        console.error('Lỗi khi lưu chuyến đi:', error);
        errorMessage.value = 'Không thể lưu chuyến đi. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};

/**
 * Resets the form to its initial state
 */
const resetForm = () => {
    tripData.value = {
        tripDate: '',
        startingPoint: '',
        endingPoint: '',
        distance: null,
        driverName: '',
        customerName: '',
        assistantDriverName: '',
        expenses: {
            policeFee: 0,
            tollFee: 0,
            foodFee: 0,
            gasMoney: 0,
            mechanicFee: 0
        }
    };

    // Reset validation state
    submitted.value = false;
    validationErrors.value = {};
    errorMessage.value = '';
};
</script>

<template>
    <Fluid>
        <div class="card">
            <h2 class="text-2xl font-bold mb-4">Chi Tiết Chuyến Đi</h2>

            <!-- Error message alert -->
            <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
                {{ errorMessage }}
            </div>

            <form @submit.prevent="saveTrip" class="flex flex-col gap-4">
                <!-- Trip Information Panel -->
                <Panel>
                    <template #header>
                        <span class="font-bold">Thông tin chuyến đi</span>
                    </template>

                    <!-- Basic Trip Information -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Trip Date -->
                        <div class="flex flex-col gap-2">
                            <label for="tripDate">Ngày đi <span class="text-red-500">*</span></label>
                            <DatePicker id="tripDate" v-model="tripData.tripDate" dateFormat="dd/MM/yyyy" :showIcon="true" :showButtonBar="true" placeholder="Chọn ngày" :class="{ 'p-invalid': submitted && validationErrors.tripDate }" />
                            <small v-if="submitted && validationErrors.tripDate" class="p-error">{{ validationErrors.tripDate }}</small>
                        </div>

                        <!-- Distance -->
                        <div class="flex flex-col gap-2">
                            <label for="distance">Quãng đường (km) <span class="text-red-500">*</span></label>
                            <InputText type="number" id="distance" v-model="tripData.distance" placeholder="Nhập quãng đường" :class="{ 'p-invalid': submitted && validationErrors.distance }" :min="1" :showButtons="true" style="width: 100%" />
                            <small v-if="submitted && validationErrors.distance" class="p-error">{{ validationErrors.distance }}</small>
                        </div>
                    </div>

                    <!-- Location Information -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <!-- Starting Point -->
                        <div class="flex flex-col gap-2">
                            <label for="startingPoint">Điểm xuất phát <span class="text-red-500">*</span></label>
                            <InputText id="startingPoint" v-model="tripData.startingPoint" placeholder="Nhập điểm xuất phát" :class="{ 'p-invalid': submitted && validationErrors.startingPoint }" />
                            <small v-if="submitted && validationErrors.startingPoint" class="p-error">{{ validationErrors.startingPoint }}</small>
                        </div>

                        <!-- Ending Point -->
                        <div class="flex flex-col gap-2">
                            <label for="endingPoint">Điểm đến <span class="text-red-500">*</span></label>
                            <InputText id="endingPoint" v-model="tripData.endingPoint" placeholder="Nhập điểm đến" :class="{ 'p-invalid': submitted && validationErrors.endingPoint }" />
                            <small v-if="submitted && validationErrors.endingPoint" class="p-error">{{ validationErrors.endingPoint }}</small>
                        </div>
                    </div>

                    <!-- Personnel Information -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <!-- Driver Name -->
                        <div class="flex flex-col gap-2">
                            <label for="driverName">Tên tài xế <span class="text-red-500">*</span></label>
                            <InputText id="driverName" v-model="tripData.driverName" placeholder="Nhập tên tài xế" :class="{ 'p-invalid': submitted && validationErrors.driverName }" />
                            <small v-if="submitted && validationErrors.driverName" class="p-error">{{ validationErrors.driverName }}</small>
                        </div>

                        <!-- Assistant Driver Name -->
                        <div class="flex flex-col gap-2">
                            <label for="assistantDriverName">Tên phụ xe</label>
                            <InputText id="assistantDriverName" v-model="tripData.assistantDriverName" placeholder="Nhập tên phụ xe" />
                        </div>
                    </div>

                    <!-- Customer Information -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div class="flex flex-col gap-2">
                            <label for="customerName">Tên khách hàng <span class="text-red-500">*</span></label>
                            <InputText id="customerName" v-model="tripData.customerName" placeholder="Nhập tên khách hàng" :class="{ 'p-invalid': submitted && validationErrors.customerName }" />
                            <small v-if="submitted && validationErrors.customerName" class="p-error">{{ validationErrors.customerName }}</small>
                        </div>
                    </div>
                </Panel>

                <!-- Expenses Panel -->
                <Panel class="mt-4">
                    <template #header>
                        <span class="font-bold">Chi phí</span>
                    </template>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Police Fee -->
                        <div class="flex flex-col gap-2">
                            <label for="policeFee">Chi phí CSGT</label>
                            <InputNumber id="policeFee" v-model="tripData.expenses.policeFee" mode="currency" currency="VND" placeholder="Nhập chi phí CSGT" />
                        </div>

                        <!-- Toll Fee -->
                        <div class="flex flex-col gap-2">
                            <label for="tollFee">Phí cầu đường</label>
                            <InputNumber id="tollFee" v-model="tripData.expenses.tollFee" mode="currency" currency="VND" placeholder="Nhập phí cầu đường" />
                        </div>

                        <!-- Food Fee -->
                        <div class="flex flex-col gap-2">
                            <label for="foodFee">Chi phí ăn uống</label>
                            <InputNumber id="foodFee" v-model="tripData.expenses.foodFee" mode="currency" currency="VND" placeholder="Nhập chi phí ăn uống" />
                        </div>

                        <!-- Gas Money -->
                        <div class="flex flex-col gap-2">
                            <label for="gasMoney">Chi phí xăng dầu</label>
                            <InputNumber id="gasMoney" v-model="tripData.expenses.gasMoney" mode="currency" currency="VND" placeholder="Nhập chi phí xăng dầu" />
                        </div>

                        <!-- Mechanic Fee -->
                        <div class="flex flex-col gap-2">
                            <label for="mechanicFee">Chi phí sửa chữa</label>
                            <InputNumber id="mechanicFee" v-model="tripData.expenses.mechanicFee" mode="currency" currency="VND" placeholder="Nhập chi phí sửa chữa" />
                        </div>
                    </div>
                </Panel>

                <!-- Submit Button -->
                <div class="flex justify-end mt-4">
                    <Button type="submit" :label="loading ? 'Đang lưu...' : 'Lưu chuyến đi'" icon="pi pi-save" :loading="loading" :disabled="loading" />
                </div>
            </form>
        </div>
    </Fluid>
</template>

<style scoped>
.p-invalid .p-inputnumber-input {
    border-color: #f44336 !important;
}

.p-invalid .p-inputtext {
    border-color: #f44336 !important;
}

.p-invalid .p-calendar .p-inputtext {
    border-color: #f44336 !important;
}
</style>
