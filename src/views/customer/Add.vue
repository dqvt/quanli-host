<script setup>
import { db } from '@/config/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();

const customerData = ref({
    representativeName: '',
    companyName: '',
    contactNumber: '',
    email: '',
    createdAt: null
});

const loading = ref(false);
const errorMessage = ref('');

const saveCustomer = async () => {
    loading.value = true;
    errorMessage.value = '';

    try {
        // Validate required fields
        if (!customerData.value.representativeName || !customerData.value.companyName) {
            errorMessage.value = 'Vui lòng nhập tên người đại diện và tên công ty';
            loading.value = false;
            return;
        }

        const customersCollectionRef = collection(db, 'customers');
        const customerDataToSave = {
            ...customerData.value,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'active'
        };

        const docRef = await addDoc(customersCollectionRef, customerDataToSave);
        console.log('Lưu thông tin khách hàng thành công với ID:', docRef.id);
        resetForm();
        toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu thông tin khách hàng', life: 3000 });

        // Navigate to customer list after successful save
        setTimeout(() => {
            router.push('/customer-list');
        }, 1500);
    } catch (error) {
        console.error('Lỗi khi lưu thông tin khách hàng:', error);
        errorMessage.value = 'Không thể lưu thông tin khách hàng. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};

const resetForm = () => {
    customerData.value = {
        representativeName: '',
        companyName: '',
        contactNumber: '',
        email: '',
        createdAt: null
    };
};
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Thêm Thông Tin Khách Hàng</h2>

        <!-- Show error message if any -->
        <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
            {{ errorMessage }}
        </div>

        <form @submit.prevent="saveCustomer" class="flex flex-col gap-4">
            <Panel>
                <template #header>
                    <span class="font-bold">Thông tin khách hàng</span>
                </template>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="representativeName">Tên người đại diện <span class="text-red-500">*</span></label>
                        <InputText id="representativeName" v-model="customerData.representativeName" placeholder="Nhập tên người đại diện" :class="{ 'p-invalid': errorMessage && !customerData.representativeName }" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="companyName">Tên công ty <span class="text-red-500">*</span></label>
                        <InputText id="companyName" v-model="customerData.companyName" placeholder="Nhập tên công ty" :class="{ 'p-invalid': errorMessage && !customerData.companyName }" />
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div class="flex flex-col gap-2">
                        <label for="contactNumber">Số điện thoại liên hệ</label>
                        <InputText id="contactNumber" v-model="customerData.contactNumber" placeholder="Nhập số điện thoại" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="email">Email</label>
                        <InputText id="email" v-model="customerData.email" placeholder="Nhập địa chỉ email" type="email" />
                    </div>
                </div>
            </Panel>

            <div class="flex justify-end gap-2 mt-4">
                <Button type="button" label="Hủy" severity="secondary" outlined @click="router.push('/customer-list')" />
                <Button type="submit" label="Lưu" icon="pi pi-save" :loading="loading" />
            </div>
        </form>
    </div>
</template>
