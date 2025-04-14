<script setup>
import { db } from '@/config/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { computed, ref } from 'vue';

const tripData = ref({
    tripDate: '',
    startingPoint: '',
    endingPoint: '',
    startGPS: {
        latitude: '',
        longitude: ''
    },
    endGPS: {
        latitude: '',
        longitude: ''
    },
    distance: '',
    driverName: '',
    assistantDriverName: '',
    expenses: {
        policeFee: 0,
        tollFee: 0,
        foodFee: 0,
        gasMoney: 0,
        mechanicFee: 0
    }
});

const loading = ref(false);
const errorMessage = ref('');
const gettingStartLocation = ref(false);
const gettingEndLocation = ref(false);

// Computed properties to check if locations are valid
const isValidStartLocation = computed(() => {
    return tripData.value.startGPS.latitude && tripData.value.startGPS.longitude;
});

const isValidEndLocation = computed(() => {
    return tripData.value.endGPS.latitude && tripData.value.endGPS.longitude;
});

const saveTrip = async () => {
    loading.value = true;
    errorMessage.value = '';

    try {
        const tripsCollectionRef = collection(db, 'trips');
        const tripDataToSave = {
            ...tripData.value,
            tripDate: tripData.value.tripDate ? new Date(tripData.value.tripDate).toISOString() : null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'active'
        };

        const docRef = await addDoc(tripsCollectionRef, tripDataToSave);
        console.log('Lưu chuyến đi thành công với ID:', docRef.id);
        resetForm();
        alert('Lưu chuyến đi thành công!');
    } catch (error) {
        console.error('Lỗi khi lưu chuyến đi:', error);
        errorMessage.value = 'Không thể lưu chuyến đi. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};

const resetForm = () => {
    tripData.value = {
        tripDate: '',
        startingPoint: '',
        endingPoint: '',
        startGPS: {
            latitude: '',
            longitude: ''
        },
        endGPS: {
            latitude: '',
            longitude: ''
        },
        distance: '',
        driverName: '',
        assistantDriverName: '',
        expenses: {
            policeFee: 0,
            tollFee: 0,
            foodFee: 0,
            gasMoney: 0,
            mechanicFee: 0
        }
    };
};
</script>

<template>
    <Fluid>
        <div class="card">
            <h2 class="text-2xl font-bold mb-4">Chi Tiết Chuyến Đi</h2>
            <!-- Show error message if any -->
            <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
                {{ errorMessage }}
            </div>

            <form @submit.prevent="saveTrip" class="flex flex-col gap-4">
                <Panel>
                    <template #header>
                        <span class="font-bold">Thông tin chuyến đi</span>
                    </template>
                    <!-- Basic Trip Information -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-2">
                            <label for="tripDate">Ngày đi</label>
                            <Calendar id="tripDate" v-model="tripData.tripDate" dateFormat="dd/mm/yy" :showIcon="true" :showButtonBar="true" placeholder="Chọn ngày" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="distance">Quãng đường (km)</label>
                            <InputNumber id="distance" v-model="tripData.distance" placeholder="Nhập quãng đường" />
                        </div>
                    </div>

                    <!-- Location Information -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div class="flex flex-col gap-2">
                            <label for="startingPoint">Điểm xuất phát</label>
                            <InputText id="startingPoint" v-model="tripData.startingPoint" placeholder="Nhập điểm xuất phát" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="endingPoint">Điểm đến</label>
                            <InputText id="endingPoint" v-model="tripData.endingPoint" placeholder="Nhập điểm đến" />
                        </div>
                    </div>

                    <!-- Personnel Information -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div class="flex flex-col gap-2">
                            <label for="driverName">Tên tài xế</label>
                            <InputText id="driverName" v-model="tripData.driverName" placeholder="Nhập tên tài xế" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="assistantDriverName">Tên phụ xe</label>
                            <InputText id="assistantDriverName" v-model="tripData.assistantDriverName" placeholder="Nhập tên phụ xe" />
                        </div>
                    </div>

                    <!-- Personnel Information -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div class="flex flex-col gap-2">
                            <label for="driverName">Tên khách hàng </label>
                            <InputText id="driverName" v-model="tripData.driverName" placeholder="Nhập tên khách hàng" />
                        </div>
                    </div>
                </Panel>

                <Panel header="Chi phí" class="mt-4">
                    <template #header>
                        <span class="font-bold">Chi phí</span>
                    </template>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="flex flex-col gap-2">
                            <label for="policeFee">Chi phí CSGT</label>
                            <InputNumber id="policeFee" v-model="tripData.expenses.policeFee" mode="currency" currency="VND" placeholder="Nhập chi phí CSGT" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="tollFee">Phí cầu đường</label>
                            <InputNumber id="tollFee" v-model="tripData.expenses.tollFee" mode="currency" currency="VND" placeholder="Nhập phí cầu đường" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="foodFee">Chi phí ăn uống</label>
                            <InputNumber id="foodFee" v-model="tripData.expenses.foodFee" mode="currency" currency="VND" placeholder="Nhập chi phí ăn uống" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="gasMoney">Chi phí xăng dầu</label>
                            <InputNumber id="gasMoney" v-model="tripData.expenses.gasMoney" mode="currency" currency="VND" placeholder="Nhập chi phí xăng dầu" />
                        </div>
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
