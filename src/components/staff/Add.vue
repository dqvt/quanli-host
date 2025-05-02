<script setup>
import { supabase } from '@/config/supabase';
import { useVuelidate } from '@vuelidate/core';
import { maxValue, minValue, numeric, required } from '@vuelidate/validators';
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
    createdAt: null,
    driverWagePercentage: '',
    assistantWagePercentage: ''
});

const loading = ref(false);
const errorMessage = ref('');
const submitted = ref(false);

const rules = {
    staffData: {
        driverWagePercentage: { 
            required,
            numeric,
            minValue: minValue(0),
            maxValue: maxValue(100)
        },
        assistantWagePercentage: { 
            required,
            numeric,
            minValue: minValue(0),
            maxValue: maxValue(100)
        }
    }
};

const v$ = useVuelidate(rules, { staffData });

const validateForm = () => {
    submitted.value = true;
    return !v$.value.$invalid;
};

const saveStaff = async () => {
    if (!validateForm()) {
        return;
    }

    try {
        loading.value = true;
        const { data, error } = await supabase
            .from('staff')
            .insert([
                {
                    full_name: staffData.value.fullName,
                    short_name: staffData.value.shortName,
                    dob: staffData.value.dob,
                    vietnam_id: staffData.value.vietnamId,
                    license_number: staffData.value.licenseNumber,
                    phone_number: staffData.value.phoneNumber,
                    emergency_contact: staffData.value.emergencyContact,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    status: 'active',
                    driver_wage_percentage: parseFloat(staffData.value.driverWagePercentage),
                    assistant_wage_percentage: parseFloat(staffData.value.assistantWagePercentage)
                }
            ])
            .select();

        if (error) throw error;

        toast.add({ severity: 'success', summary: 'Thành công', detail: 'Nhân viên đã được thêm', life: 3000 });
        router.push('/staff/list');
    } catch (error) {
        console.error('Error adding staff:', error);
        errorMessage.value = error.message;
        toast.add({ severity: 'error', summary: 'Lỗi', detail: error.message, life: 3000 });
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
        createdAt: null,
        driverWagePercentage: '',
        assistantWagePercentage: ''
    };
    submitted.value = false;
    errorMessage.value = '';
};
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Thêm nhân viên mới</h2>

        <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
            {{ errorMessage }}
        </div>

        <form @submit.prevent="saveStaff" class="flex flex-col gap-4">
            <!-- Basic Information Panel -->
            <Panel header="Thông tin cá nhân" class="mb-4">
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
            <Panel header="Giấy tờ">
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
            <Panel header="Thông tin liên hệ khẩn cấp">
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
            <Panel header="Thông tin lương">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="driverWagePercentage" class="required">Phần trăm lương tài xế</label>
                        <InputText 
                            id="driverWagePercentage" 
                            v-model="staffData.driverWagePercentage" 
                            placeholder="Nhập phần trăm lương tài xế"
                            :class="{ 'p-invalid': v$.staffData.driverWagePercentage.$invalid && v$.staffData.driverWagePercentage.$dirty }"
                            required
                        />
                        <small class="p-error" v-if="v$.staffData.driverWagePercentage.$invalid && v$.staffData.driverWagePercentage.$dirty">
                            Phần trăm lương tài xế là bắt buộc
                        </small>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="assistantWagePercentage" class="required">Phần trăm lương phụ xe</label>
                        <InputText 
                            id="assistantWagePercentage" 
                            v-model="staffData.assistantWagePercentage" 
                            placeholder="Nhập phần trăm lương phụ xe"
                            :class="{ 'p-invalid': v$.staffData.assistantWagePercentage.$invalid && v$.staffData.assistantWagePercentage.$dirty }"
                            required
                        />
                        <small class="p-error" v-if="v$.staffData.assistantWagePercentage.$invalid && v$.staffData.assistantWagePercentage.$dirty">
                            Phần trăm lương phụ xe là bắt buộc
                        </small>
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

.required:after {
    content: " *";
    color: red;
}
</style>
