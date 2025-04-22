<script setup>
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/calendar';
import Panel from 'primevue/panel';
import { useToast } from 'primevue/usetoast';
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
const toast = useToast();
const staffData = ref({
    fullName: '',
    shortName: '',
    dob: null,
    vietnamId: '',
    licenseNumber: '',
    phoneNumber: '',
    emergencyContact: {
        name: '',
        phoneNumber: '',
        relationship: ''
    },
    status: 'active'
});
const loading = ref(false);
const errorMessage = ref('');
const staffId = route.params.id;
onMounted(async () => {
    await fetchStaffData();
});
const fetchStaffData = async () => {
    loading.value = true;
    try {
        const staffDoc = await getDoc(doc(db, 'staff', staffId));
        if (staffDoc.exists()) {
            const data = staffDoc.data(); // Convert Firestore Timestamp to Date for DatePicker
            staffData.value = { ...data, dob: data.dob ? data.dob.toDate() : null, id: staffDoc.id };
        } else {
            errorMessage.value = 'Không tìm thấy thông tin nhân viên';
            setTimeout(() => {
                router.push('/staff/list');
            }, 2000);
        }
    } catch (error) {
        console.error('Error fetching staff:', error);
        errorMessage.value = 'Lỗi khi tải thông tin nhân viên';
    } finally {
        loading.value = false;
    }
};
const updateStaff = async () => {
    loading.value = true;
    errorMessage.value = '';
    try {
        if (!staffData.value.fullName || !staffData.value.shortName) {
            errorMessage.value = 'Vui lòng nhập họ tên và tên ngắn';
            return;
        }
        const staffRef = doc(db, 'staff', staffId);
        const staffDataToUpdate = { ...staffData.value, updatedAt: serverTimestamp() };
        // Remove the id field before updating
        delete staffDataToUpdate.id;
        await updateDoc(staffRef, staffDataToUpdate);
        toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật thông tin nhân viên', life: 3000 });
        setTimeout(() => {
            router.push('/staff/list');
        }, 1500);
    } catch (error) {
        console.error('Error updating staff:', error);
        errorMessage.value = 'Không thể cập nhật thông tin nhân viên. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};
</script>
<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Cập Nhật Thông Tin Nhân Viên</h2>
        <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
            {{ errorMessage }}
        </div>
        <div v-if="loading" class="flex justify-center items-center p-4">
            <i class="pi pi-spinner pi-spin" style="font-size: 2rem"></i>
        </div>
        <form v-else @submit.prevent="updateStaff" class="flex flex-col gap-4">
            <Panel>
                <template #header> <span class="font-bold">Thông tin cơ bản</span> </template>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="fullName">Họ và tên <span class="text-red-500">*</span></label> <InputText id="fullName" v-model="staffData.fullName" placeholder="Nhập họ và tên" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="shortName">Tên ngắn <span class="text-red-500">*</span></label> <InputText id="shortName" v-model="staffData.shortName" placeholder="Nhập tên ngắn" />
                    </div>
                    <div class="flex flex-col gap-2"><label for="dob">Ngày sinh</label> <DatePicker id="dob" v-model="staffData.dob" dateFormat="dd/mm/yy" placeholder="Chọn ngày sinh" /></div>
                    <div class="flex flex-col gap-2"><label for="vietnamId">CCCD</label> <InputText id="vietnamId" v-model="staffData.vietnamId" placeholder="Nhập số CCCD" /></div>
                    <div class="flex flex-col gap-2"><label for="licenseNumber">Bằng lái</label> <InputText id="licenseNumber" v-model="staffData.licenseNumber" placeholder="Nhập số bằng lái" /></div>
                    <div class="flex flex-col gap-2">
                        <label for="phoneNumber">Số điện thoại <span class="text-red-500">*</span></label> <InputText id="phoneNumber" v-model="staffData.phoneNumber" placeholder="Nhập số điện thoại" />
                    </div>
                </div>
            </Panel>
            <Panel>
                <template #header> <span class="font-bold">Thông tin liên hệ khẩn cấp</span> </template>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2"><label for="emergencyName">Tên người liên hệ</label> <InputText id="emergencyName" v-model="staffData.emergencyContact.name" placeholder="Nhập tên người liên hệ" /></div>
                    <div class="flex flex-col gap-2"><label for="emergencyPhone">Số điện thoại</label> <InputText id="emergencyPhone" v-model="staffData.emergencyContact.phoneNumber" placeholder="Nhập số điện thoại" /></div>
                    <div class="flex flex-col gap-2"><label for="emergencyRelationship">Mối quan hệ</label> <InputText id="emergencyRelationship" v-model="staffData.emergencyContact.relationship" placeholder="Nhập mối quan hệ" /></div>
                </div>
            </Panel>
            <div class="flex justify-end gap-2 mt-4"><Button type="button" label="Hủy" severity="secondary" outlined @click="router.push('/staff/list')" /> <Button type="submit" label="Cập nhật" icon="pi pi-save" :loading="loading" /></div>
        </form>
    </div>
</template>
<style scoped>
.card {
    @apply bg-white rounded-lg shadow-md p-6;
}
</style>
