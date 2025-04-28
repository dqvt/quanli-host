<script setup>
import { supabase } from '@/config/supabase';
import Button from 'primevue/button';
import DatePicker from 'primevue/calendar';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
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
    createdAt: null
});

const loading = ref(false);
const errorMessage = ref('');
const submitted = ref(false);

const validateForm = () => {
    submitted.value = true;
    const errors = [];

    if (!staffData.value.fullName.trim()) {
        errors.push('Vui lòng nhập họ và tên');
    }
    if (!staffData.value.shortName.trim()) {
        errors.push('Vui lòng nhập tên ngắn');
    }
    if (!staffData.value.phoneNumber.trim()) {
        errors.push('Vui lòng nhập số điện thoại');
    }

    if (errors.length > 0) {
        errorMessage.value = errors.join(', ');
        return false;
    }

    return true;
};

const saveStaff = async () => {
    if (!validateForm()) {
        loading.value = false;
        return;
    }

    loading.value = true;
    errorMessage.value = '';

    try {
        // Convert camelCase to snake_case for database
        const staffDataToSave = {
            full_name: staffData.value.fullName,
            short_name: staffData.value.shortName,
            dob: staffData.value.dob,
            vietnam_id: staffData.value.vietnamId,
            license_number: staffData.value.licenseNumber,
            phone_number: staffData.value.phoneNumber,
            emergency_contact: {
                name: staffData.value.emergencyContact.name,
                phone_number: staffData.value.emergencyContact.phoneNumber,
                relationship: staffData.value.emergencyContact.relationship
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'active'
        };

        const { data, error } = await supabase.from('staff').insert(staffDataToSave).select().single();

        if (error) throw error;

        console.log('Lưu thông tin nhân viên thành công với ID:', data.id);

        // Show success notification
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã lưu thông tin nhân viên',
            life: 3000
        });

        // Navigate back to staff list page immediately
        router.push('/staff/list');
    } catch (error) {
        console.error('Lỗi khi lưu thông tin nhân viên:', error);
        errorMessage.value = 'Không thể lưu thông tin nhân viên. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};

const resetForm = () => {
    staffData.value = {
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
        createdAt: null
    };
    submitted.value = false;
    errorMessage.value = '';
};
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Thêm Thông Tin Nhân Viên</h2>

        <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
            {{ errorMessage }}
        </div>

        <form @submit.prevent="saveStaff" class="flex flex-col gap-4">
            <!-- Basic Information Panel -->
            <Panel>
                <template #header>
                    <span class="font-bold">Thông tin cơ bản</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="fullName">Họ và tên <span class="text-red-500">*</span></label>
                        <InputText id="fullName" v-model="staffData.fullName" placeholder="Nhập họ và tên" :class="{ 'p-invalid': submitted && !staffData.fullName }" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="shortName">Tên ngắn <span class="text-red-500">*</span></label>
                        <InputText id="shortName" v-model="staffData.shortName" placeholder="Nhập tên ngắn" :class="{ 'p-invalid': submitted && !staffData.shortName }" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="dob">Ngày sinh</label>
                        <DatePicker id="dob" v-model="staffData.dob" dateFormat="dd/mm/yy" :showIcon="true" placeholder="Chọn ngày sinh" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="phoneNumber">Số điện thoại <span class="text-red-500">*</span></label>
                        <InputText id="phoneNumber" v-model="staffData.phoneNumber" placeholder="Nhập số điện thoại" :class="{ 'p-invalid': submitted && !staffData.phoneNumber }" />
                    </div>
                </div>
            </Panel>

            <!-- Documents Panel -->
            <Panel>
                <template #header>
                    <span class="font-bold">Giấy tờ</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="vietnamId">Số CCCD/CMND</label>
                        <InputText id="vietnamId" v-model="staffData.vietnamId" placeholder="Nhập số CCCD/CMND" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="licenseNumber">Số bằng lái</label>
                        <InputText id="licenseNumber" v-model="staffData.licenseNumber" placeholder="Nhập số bằng lái" />
                    </div>
                </div>
            </Panel>

            <!-- Emergency Contact Panel -->
            <Panel>
                <template #header>
                    <span class="font-bold">Thông tin liên hệ khẩn cấp</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="emergencyName">Tên người liên hệ</label>
                        <InputText id="emergencyName" v-model="staffData.emergencyContact.name" placeholder="Nhập tên người liên hệ" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="emergencyPhone">Số điện thoại</label>
                        <InputText id="emergencyPhone" v-model="staffData.emergencyContact.phoneNumber" placeholder="Nhập số điện thoại" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="emergencyRelationship">Mối quan hệ</label>
                        <InputText id="emergencyRelationship" v-model="staffData.emergencyContact.relationship" placeholder="Nhập mối quan hệ" />
                    </div>
                </div>
            </Panel>

            <div class="flex justify-end gap-2 mt-4">
                <Button type="button" label="Hủy" severity="secondary" outlined @click="router.push('/staff/list')" />
                <Button type="submit" label="Lưu" icon="pi pi-save" :loading="loading" />
            </div>
        </form>
    </div>
</template>

<style scoped>
.p-invalid {
    @apply border-red-500;
}

.card {
    @apply bg-white rounded-lg shadow-md p-6;
}
</style>
