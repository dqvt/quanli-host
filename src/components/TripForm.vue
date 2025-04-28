<script setup>
import DatePicker from 'primevue/calendar';
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
    emit('submit');
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
                    <DatePicker id="tripDate" v-model="tripData.tripDate" dateFormat="dd/mm/yy" :showIcon="true" :showButtonBar="true" placeholder="Chọn ngày" :class="{ 'p-invalid': submitted && validationErrors.tripDate }" />
                    <small v-if="submitted && validationErrors.tripDate" class="p-error">
                        {{ validationErrors.tripDate }}
                    </small>
                </div>
                <div class="field"></div>
                <div class="field">
                    <label for="startingPoint">Điểm xuất phát <span class="text-red-500">*</span></label>
                    <InputText id="startingPoint" v-model="tripData.startingPoint" placeholder="Nhập điểm xuất phát" :class="{ 'p-invalid': submitted && validationErrors.startingPoint }" />
                    <small v-if="submitted && validationErrors.startingPoint" class="p-error">
                        {{ validationErrors.startingPoint }}
                    </small>
                </div>

                <div class="field">
                    <label for="endingPoint">Điểm đến <span class="text-red-500">*</span></label>
                    <InputText id="endingPoint" v-model="tripData.endingPoint" placeholder="Nhập điểm đến" :class="{ 'p-invalid': submitted && validationErrors.endingPoint }" />
                    <small v-if="submitted && validationErrors.endingPoint" class="p-error">
                        {{ validationErrors.endingPoint }}
                    </small>
                </div>

                <div class="field">
                    <label for="distance">Quãng đường (km) <span class="text-red-500">*</span></label>
                    <InputNumber id="distance" v-model="tripData.distance" placeholder="Nhập quãng đường" :min="1" :class="{ 'p-invalid': submitted && validationErrors.distance }" />
                    <small v-if="submitted && validationErrors.distance" class="p-error">
                        {{ validationErrors.distance }}
                    </small>
                </div>

                <div class="field">
                    <label for="driverName">Tài xế <span class="text-red-500">*</span></label>
                    <Select id="driverName" v-model="tripData.driverName" :options="staffList" optionLabel="label" optionValue="value" placeholder="Chọn tài xế" class="w-full" :class="{ 'p-invalid': submitted && validationErrors.driverName }" />
                    <small class="p-error" v-if="submitted && validationErrors.driverName">
                        {{ validationErrors.driverName }}
                    </small>
                </div>

                <div class="field">
                    <label for="assistantDriverName">Phụ xe</label>
                    <Select id="assistantDriverName" v-model="tripData.assistantDriverName" :options="staffList" optionLabel="label" optionValue="value" placeholder="Chọn phụ xe" class="w-full" />
                </div>

                <div class="field">
                    <label for="customerName">Khách hàng <span class="text-red-500">*</span></label>
                    <Select
                        id="customerName"
                        v-model="tripData.customerName"
                        :options="$props.customerList"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Chọn khách hàng"
                        class="w-full"
                        :class="{ 'p-invalid': submitted && validationErrors.customerName }"
                    />
                    <small class="p-error" v-if="submitted && validationErrors.customerName">
                        {{ validationErrors.customerName }}
                    </small>
                </div>

                <div class="field">
                    <label for="vehicleLicenseNumber">Biển số xe <span class="text-red-500">*</span></label>
                    <Select
                        id="vehicleLicenseNumber"
                        v-model="tripData.vehicleLicenseNumber"
                        :options="vehicles"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Chọn xe"
                        :class="{ 'p-invalid': submitted && validationErrors.vehicleLicenseNumber }"
                    />
                    <small v-if="submitted && validationErrors.vehicleLicenseNumber" class="p-error">
                        {{ validationErrors.vehicleLicenseNumber }}
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
</style>
