<script setup>
import DatePicker from 'primevue/calendar';
import Select from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    initialData: {
        type: Object,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    },
    submitted: {
        type: Boolean,
        default: false
    },
    validationErrors: {
        type: Object,
        default: () => ({})
    },
    vehicles: {
        type: Array,
        default: () => []
    },
    staffList: {
        type: Array,
        default: () => []
    },
    customerList: {
        type: Array,
        default: () => []
    }
});

// Compute whether expenses should be disabled
const isExpensesDisabled = computed(() => {
    // Add null check to prevent errors when initialData or status is undefined
    return props.initialData && (props.initialData.status === 'WAITING_FOR_PRICE' || props.initialData.status === 'PRICED');
});

const emit = defineEmits(['submit', 'update:initialData']);

// Create a local copy of the trip data with default values if initialData is undefined
const tripData = ref({
    customerId: null,
    vehicleId: null,
    driverId: null,
    assistantId: null,
    startingPoint: '',
    endingPoint: '',
    distance: 0,
    tripDate: new Date(),
    status: 'PENDING',
    price: 0,
    expenses: {
        policeFee: 0,
        tollFee: 0,
        foodFee: 0,
        gasMoney: 0,
        mechanicFee: 0
    },
    ...props.initialData
});

// Validation state
const errors = ref({
    startingPoint: '',
    endingPoint: '',
    distance: '',
    driverId: '',
    customerId: '',
    vehicleId: ''
});

// Validate the form fields
const validateForm = () => {
    // Reset errors
    errors.value = {
        startingPoint: '',
        endingPoint: '',
        distance: '',
        driverId: '',
        customerId: '',
        vehicleId: ''
    };
    
    let isValid = true;
    
    if (!tripData.value.startingPoint) {
        errors.value.startingPoint = 'Điểm xuất phát là bắt buộc';
        isValid = false;
    }
    
    if (!tripData.value.endingPoint) {
        errors.value.endingPoint = 'Điểm đến là bắt buộc';
        isValid = false;
    }
    
    if (!tripData.value.distance || tripData.value.distance <= 0) {
        errors.value.distance = 'Quãng đường phải lớn hơn 0';
        isValid = false;
    }
    
    if (!tripData.value.driverId) {
        errors.value.driverId = 'Tài xế là bắt buộc';
        isValid = false;
    }
    
    if (!tripData.value.customerId) {
        errors.value.customerId = 'Khách hàng là bắt buộc';
        isValid = false;
    }
    
    if (!tripData.value.vehicleId) {
        errors.value.vehicleId = 'Biển số xe là bắt buộc';
        isValid = false;
    }
    
    return isValid;
};

// Watch for changes in tripData and emit them to parent
watch(
    tripData,
    (newValue) => {
        emit('update:initialData', newValue);
    },
    { deep: true }
);

// Emit submit event to parent
const handleSubmit = () => {
    const isValid = validateForm();
    if (isValid) {
        emit('submit');
    }
};
</script>

<template>
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Debug info (remove in production) -->
        <div class="text-sm text-gray-500">Available Staff: {{ staffList.length }}</div>

        <!-- Trip Information -->
        <Panel>
            <template #header>
                <span class="font-bold">Thông tin chuyến đi</span>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                    <label for="tripDate">Ngày đi <span class="text-red-500">*</span></label>
                    <DatePicker id="tripDate" v-model="tripData.tripDate" dateFormat="dd/mm/yy" :showIcon="true" :showButtonBar="true" placeholder="Chọn ngày" />
                </div>
                <div class="field"></div>
                <div class="field">
                    <label for="startingPoint">Điểm xuất phát <span class="text-red-500">*</span></label>
                    <InputText id="startingPoint" v-model="tripData.startingPoint" placeholder="Nhập điểm xuất phát" :class="{ 'p-invalid': errors.startingPoint }" />
                    <small v-if="errors.startingPoint" class="p-error">
                        {{ errors.startingPoint }}
                    </small>
                </div>

                <div class="field">
                    <label for="endingPoint">Điểm đến <span class="text-red-500">*</span></label>
                    <InputText id="endingPoint" v-model="tripData.endingPoint" placeholder="Nhập điểm đến" :class="{ 'p-invalid': errors.endingPoint }" />
                    <small v-if="errors.endingPoint" class="p-error">
                        {{ errors.endingPoint }}
                    </small>
                </div>

                <div class="field">
                    <label for="distance">Quãng đường (km) <span class="text-red-500">*</span></label>
                    <InputNumber id="distance" v-model="tripData.distance" placeholder="Nhập quãng đường" :min="1" :class="{ 'p-invalid': errors.distance }" />
                    <small v-if="errors.distance" class="p-error">
                        {{ errors.distance }}
                    </small>
                </div>

                <div class="field">
                    <label for="driverName">Tài xế <span class="text-red-500">*</span></label>
                    <Select id="driverName" v-model="tripData.driverId" :options="staffList" optionLabel="label" optionValue="value" placeholder="Chọn tài xế" class="w-full" :class="{ 'p-invalid': errors.driverId }" />
                    <small class="p-error" v-if="errors.driverId">
                        {{ errors.driverId }}
                    </small>
                </div>

                <div class="field">
                    <label for="assistantDriverName">Phụ xe</label>
                    <Select id="assistantDriverName" v-model="tripData.assistantId" :options="staffList" optionLabel="label" optionValue="value" placeholder="Chọn phụ xe" class="w-full" />
                </div>

                <div class="field">
                    <label for="customerName">Khách hàng <span class="text-red-500">*</span></label>
                    <Select
                        id="customerName"
                        v-model="tripData.customerId"
                        :options="$props.customerList"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Chọn khách hàng"
                        class="w-full"
                        :class="{ 'p-invalid': errors.customerId }"
                    />
                    <small class="p-error" v-if="errors.customerId">
                        {{ errors.customerId }}
                    </small>
                </div>

                <div class="field">
                    <label for="vehicleLicenseNumber">Biển số xe <span class="text-red-500">*</span></label>
                    <Select
                        id="vehicleLicenseNumber"
                        v-model="tripData.vehicleId"
                        :options="vehicles"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Chọn xe"
                        :class="{ 'p-invalid': errors.vehicleId }"
                    />
                    <small v-if="errors.vehicleId" class="p-error">
                        {{ errors.vehicleId }}
                    </small>
                </div>

                <div class="field" v-if="tripData && (tripData.status === 'WAITING_FOR_PRICE' || tripData.status === 'PRICED')">
                    <label for="price">Giá chuyến đi</label>
                    <InputNumber id="price" v-model="tripData.price" mode="currency" currency="VND" placeholder="Nhập giá chuyến đi" />
                </div>
            </div>
        </Panel>

        <!-- Expenses Panel -->
        <Panel>
            <template #header>
                <div class="flex justify-between items-center">
                    <span class="font-bold">Chi phí</span>
                    <small v-if="isExpensesDisabled" class="text-orange-500"> Chi phí không thể chỉnh sửa khi chuyến đã được duyệt </small>
                </div>
            </template>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="field">
                    <label for="policeFee">Chi phí CSGT</label>
                    <InputNumber id="policeFee" v-model="tripData.expenses.policeFee" mode="currency" currency="VND" placeholder="Nhập chi phí CSGT" :disabled="isExpensesDisabled" />
                </div>
                <div class="field">
                    <label for="tollFee">Chi phí cầu đường</label>
                    <InputNumber id="tollFee" v-model="tripData.expenses.tollFee" mode="currency" currency="VND" placeholder="Nhập chi phí cầu đường" :disabled="isExpensesDisabled" />
                </div>
                <div class="field">
                    <label for="foodFee">Chi phí ăn uống</label>
                    <InputNumber id="foodFee" v-model="tripData.expenses.foodFee" mode="currency" currency="VND" placeholder="Nhập chi phí ăn uống" :disabled="isExpensesDisabled" />
                </div>
                <div class="field">
                    <label for="gasMoney">Chi phí xăng dầu</label>
                    <InputNumber id="gasMoney" v-model="tripData.expenses.gasMoney" mode="currency" currency="VND" placeholder="Nhập chi phí xăng dầu" :disabled="isExpensesDisabled" />
                </div>
                <div class="field">
                    <label for="mechanicFee">Chi phí sửa chữa</label>
                    <InputNumber id="mechanicFee" v-model="tripData.expenses.mechanicFee" mode="currency" currency="VND" placeholder="Nhập chi phí sửa chữa" :disabled="isExpensesDisabled" />
                </div>
            </div>
        </Panel>

        <slot name="actions"></slot>
    </form>
</template>

<style scoped>
.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.field label {
    font-weight: 500;
}

.p-invalid {
    border-color: #f44336 !important;
}

:deep(.p-dropdown.p-invalid) {
    border-color: #f44336 !important;
}

.p-error {
    color: #f44336;
    font-size: 0.75rem;
    margin-top: 0.25rem;
}
</style>
