<script setup>
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const toast = useToast();

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

const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');

const vehicleTypes = [
    { label: 'Xe tải', value: 'TRUCK' },
    { label: 'Xe container', value: 'CONTAINER' },
    { label: 'Xe đầu kéo', value: 'TRACTOR' }
];

const statusOptions = [
    { label: 'Đang hoạt động', value: 'ACTIVE' },
    { label: 'Ngừng hoạt động', value: 'INACTIVE' }
];

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
                data[field] = data[field].toDate();
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

async function saveVehicle() {
    saving.value = true;
    try {
        const vehicleId = route.params.id;
        const vehicleRef = doc(db, 'vehicles', vehicleId);

        await updateDoc(vehicleRef, {
            ...vehicleData.value,
            updatedAt: new Date()
        });

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã cập nhật thông tin xe',
            life: 3000
        });

        router.push('/vehicle/list');
    } catch (error) {
        console.error('Error updating vehicle:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể cập nhật thông tin xe',
            life: 3000
        });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Cập nhật thông tin xe</h2>

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
                    <div class="flex flex-col gap-2">
                        <label for="licensePlate">Biển số xe *</label>
                        <InputText id="licensePlate" v-model="vehicleData.licensePlate" required />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="manufacturer">Hãng sản xuất *</label>
                        <InputText id="manufacturer" v-model="vehicleData.manufacturer" required />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="model">Model *</label>
                        <InputText id="model" v-model="vehicleData.model" required />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="vehicleType">Loại xe *</label>
                        <Dropdown id="vehicleType" v-model="vehicleData.vehicleType" :options="vehicleTypes" optionLabel="label" optionValue="value" required />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="yearOfManufacture">Năm sản xuất *</label>
                        <InputNumber id="yearOfManufacture" v-model="vehicleData.yearOfManufacture" required />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="status">Trạng thái *</label>
                        <Dropdown id="status" v-model="vehicleData.status" :options="statusOptions" optionLabel="label" optionValue="value" required />
                    </div>
                </div>
            </Panel>

            <!-- Registration Information -->
            <Panel>
                <template #header>
                    <span class="font-bold">Thông tin đăng ký</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="registrationDate">Ngày đăng ký</label>
                        <DatePicker id="registrationDate" v-model="vehicleData.registrationDate" dateFormat="dd/mm/yy" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="registrationExpiryDate">Ngày hết hạn đăng ký</label>
                        <DatePicker id="registrationExpiryDate" v-model="vehicleData.registrationExpiryDate" dateFormat="dd/mm/yy" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="insuranceExpiryDate">Ngày hết hạn bảo hiểm</label>
                        <DatePicker id="insuranceExpiryDate" v-model="vehicleData.insuranceExpiryDate" dateFormat="dd/mm/yy" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="capacity">Trọng tải (tấn)</label>
                        <InputNumber id="capacity" v-model="vehicleData.capacity" />
                    </div>
                </div>
            </Panel>

            <!-- Vehicle Details -->
            <Panel>
                <template #header>
                    <span class="font-bold">Chi tiết xe</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="chassisNumber">Số khung</label>
                        <InputText id="chassisNumber" v-model="vehicleData.chassisNumber" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="engineNumber">Số máy</label>
                        <InputText id="engineNumber" v-model="vehicleData.engineNumber" />
                    </div>
                </div>
            </Panel>

            <!-- Notes -->
            <Panel>
                <template #header>
                    <span class="font-bold">Ghi chú</span>
                </template>

                <div class="flex flex-col gap-2">
                    <Textarea v-model="vehicleData.notes" rows="3" />
                </div>
            </Panel>

            <!-- Submit Buttons -->
            <div class="flex justify-end gap-2 mt-4">
                <Button type="button" label="Hủy" @click="router.push('/vehicle/list')" class="p-button-secondary" :disabled="saving" />
                <Button type="submit" label="Lưu thay đổi" icon="pi pi-save" :loading="saving" />
            </div>
        </form>
    </div>
</template>
