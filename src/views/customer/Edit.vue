<script setup>
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { useToast } from 'primevue/usetoast';
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
const toast = useToast();
const customerData = ref({
    representativeName: '',
    companyName: '',
    contactNumber: '',
    email: '',
    updatedAt: null
});
const loading = ref(false);
const errorMessage = ref('');
const customerId = route.params.id;
onMounted(async () => {
    await fetchCustomerData();
});
const fetchCustomerData = async () => {
    loading.value = true;
    try {
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (customerDoc.exists()) {
            customerData.value = { ...customerDoc.data(), id: customerDoc.id };
        } else {
            errorMessage.value = 'Không tìm thấy thông tin khách hàng';
            setTimeout(() => {
                router.push('/customer-list');
            }, 2000);
        }
    } catch (error) {
        console.error('Error fetching customer:', error);
        errorMessage.value = 'Lỗi khi tải thông tin khách hàng';
    } finally {
        loading.value = false;
    }
};
const updateCustomer = async () => {
    loading.value = true;
    errorMessage.value = '';
    try {
        // Validate required fields
        if (!customerData.value.representativeName || !customerData.value.companyName) {
            errorMessage.value = 'Vui lòng nhập tên người đại diện và tên công ty';
            loading.value = false;
            return;
        }
        const customerRef = doc(db, 'customers', customerId);
        const customerDataToUpdate = {
            representativeName: customerData.value.representativeName,
            companyName: customerData.value.companyName,
            contactNumber: customerData.value.contactNumber,
            email: customerData.value.email,
            updatedAt: serverTimestamp()
        };
        await updateDoc(customerRef, customerDataToUpdate);
        console.log('Cập nhật thông tin khách hàng thành công');
        toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật thông tin khách hàng', life: 3000 });
        // Navigate to customer list after successful update
        setTimeout(() => {
            router.push('/customer-list');
        }, 1500);
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin khách hàng:', error);
        errorMessage.value = 'Không thể cập nhật thông tin khách hàng. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};
</script>
<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-4">Cập Nhật Thông Tin Khách Hàng</h2>
        <!-- Show error message if any -->
        <div v-if="errorMessage" class="p-4 mb-4 bg-red-100 text-red-700 rounded">
            {{ errorMessage }}
        </div>
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center items-center p-4"><i class="pi pi-spinner pi-spin" style="font-size: 2rem"></i></div>
        <form v-else @submit.prevent="updateCustomer" class="flex flex-col gap-4">
            <Panel>
                <template #header> <span class="font-bold">Thông tin khách hàng</span> </template>
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
                    <div class="flex flex-col gap-2"><label for="contactNumber">Số điện thoại liên hệ</label> <InputText id="contactNumber" v-model="customerData.contactNumber" placeholder="Nhập số điện thoại" /></div>
                    <div class="flex flex-col gap-2">
                        <label for="email">Email</label>
                        <InputText id="email" v-model="customerData.email" placeholder="Nhập địa chỉ email" type="email" />
                    </div>
                </div>
            </Panel>
            <div class="flex justify-end gap-2 mt-4">
                <Button type="button" label="Hủy" severity="secondary" outlined @click="router.push('/customer-list')" />
                <Button type="submit" label="Cập nhật" icon="pi pi-save" :loading="loading" />
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
