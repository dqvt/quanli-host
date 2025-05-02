<script setup>
import { supabase } from '@/config/supabase';
import Button from 'primevue/button';
import DatePicker from 'primevue/calendar';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
const deleteDialog = ref(false);
const staffId = route.params.id;
onMounted(async () => {
    await fetchStaffData();
});
const fetchStaffData = async () => {
    loading.value = true;
    try {
        const { data, error } = await supabase.from('staff').select('*').eq('id', staffId).single();

        if (error) throw error;

        if (data) {
            // Convert snake_case to camelCase for frontend
            staffData.value = {
                id: data.id,
                fullName: data.full_name,
                shortName: data.short_name,
                dob: data.dob ? new Date(data.dob) : null,
                vietnamId: data.vietnam_id,
                licenseNumber: data.license_number,
                phoneNumber: data.phone_number,
                emergencyContact: {
                    name: data.emergency_contact?.name || '',
                    phoneNumber: data.emergency_contact?.phone_number || '',
                    relationship: data.emergency_contact?.relationship || ''
                },
                status: data.status || 'active'
            };
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

        // Convert camelCase to snake_case for database
        const staffDataToUpdate = {
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
            updated_at: new Date().toISOString(),
            status: staffData.value.status
        };

        const { error } = await supabase.from('staff').update(staffDataToUpdate).eq('id', staffId);

        if (error) throw error;

        toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật thông tin nhân viên', life: 3000 });
        router.push('/staff/list');
    } catch (error) {
        console.error('Error updating staff:', error);
        errorMessage.value = 'Không thể cập nhật thông tin nhân viên. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};

// Confirm delete dialog
const confirmDelete = () => {
    deleteDialog.value = true;
};

// Delete staff from Supabase
const deleteStaff = async () => {
    try {
        const { error } = await supabase.from('staff').delete().eq('id', staffId);

        if (error) throw error;

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa nhân viên',
            life: 3000
        });

        router.push('/staff/list');
    } catch (error) {
        console.error('Error deleting staff:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa nhân viên. Vui lòng thử lại.',
            life: 3000
        });
    } finally {
        deleteDialog.value = false;
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
            <!-- Action Buttons Row -->
            <div class="flex justify-between items-center mt-4">
                <!-- Delete Button (Left) -->
                <Button type="button" label="Xóa" icon="pi pi-trash" severity="danger" @click="confirmDelete" outlined size="small" class="delete-btn" />

                <!-- Save/Cancel Buttons (Right) -->
                <div class="flex gap-2">
                    <Button type="button" label="Hủy" severity="secondary" outlined @click="router.push('/staff/list')" />
                    <Button type="submit" label="Cập nhật" icon="pi pi-save" :loading="loading" />
                </div>
            </div>
        </form>

        <!-- Delete Confirmation Dialog -->
        <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="Xác nhận xóa" :modal="true">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-yellow-500" style="font-size: 2rem" />
                <span>
                    Bạn có chắc chắn muốn xóa nhân viên
                    <b>{{ staffData.fullName }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
                <Button label="Có" icon="pi pi-check" @click="deleteStaff" severity="danger" outlined />
            </template>
        </Dialog>
    </div>
</template>
<style scoped>
.p-invalid {
    @apply border-red-500;
}

.required:after {
    content: " *";
    color: red;
}
</style>
