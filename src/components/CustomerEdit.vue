<script setup>
import { db } from '@/config/firebase';
import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const router = useRouter();
const route = useRoute();
const toast = useToast();
const customerData = ref({
    representativeName: '',
    companyName: '',
    contactNumber: '',
    email: '',
    address: '',
    taxNumber: '',
    googleDriveLink: '',
    updatedAt: null
});
const loading = ref(false);
const errorMessage = ref('');
const deleteDialog = ref(false);
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
        if (!customerData.value.representativeName) {
            errorMessage.value = 'Vui lòng nhập tên người đại diện';
            loading.value = false;
            return;
        }
        const customerRef = doc(db, 'customers', customerId);
        const customerDataToUpdate = {
            representativeName: customerData.value.representativeName,
            companyName: customerData.value.companyName,
            contactNumber: customerData.value.contactNumber,
            email: customerData.value.email,
            address: customerData.value.address,
            taxNumber: customerData.value.taxNumber,
            googleDriveLink: customerData.value.googleDriveLink,
            updatedAt: serverTimestamp()
        };
        await updateDoc(customerRef, customerDataToUpdate);
        toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật thông tin khách hàng', life: 3000 });
        router.push('/customer/list');
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin khách hàng:', error);
        errorMessage.value = 'Không thể cập nhật thông tin khách hàng. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};

// Confirm delete dialog
const confirmDelete = () => {
    deleteDialog.value = true;
};

// Delete customer from Firestore
const deleteCustomer = async () => {
    try {
        const customerRef = doc(db, 'customers', customerId);
        await deleteDoc(customerRef);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa khách hàng',
            life: 3000
        });

        router.push('/customer/list');
    } catch (error) {
        console.error('Error deleting customer:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa khách hàng. Vui lòng thử lại.',
            life: 3000
        });
    } finally {
        deleteDialog.value = false;
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
                        <label for="companyName">Tên công ty</label>
                        <InputText id="companyName" v-model="customerData.companyName" placeholder="Nhập tên công ty" />
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

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div class="flex flex-col gap-2">
                        <label for="address">Địa chỉ</label>
                        <InputText id="address" v-model="customerData.address" placeholder="Nhập địa chỉ" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="taxNumber">Mã số thuế</label>
                        <InputText id="taxNumber" v-model="customerData.taxNumber" placeholder="Nhập mã số thuế" />
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4 mt-4">
                    <div class="flex flex-col gap-2">
                        <label for="googleDriveLink">Link Excel Google Drive</label>
                        <InputText id="googleDriveLink" v-model="customerData.googleDriveLink" placeholder="Nhập link file Excel từ Google Drive" />
                    </div>
                </div>
            </Panel>
            <!-- Action Buttons Row -->
            <div class="flex justify-between items-center mt-4">
                <!-- Delete Button (Left) -->
                <Button type="button" label="Xóa" icon="pi pi-trash" severity="danger" @click="confirmDelete" outlined size="small" class="delete-btn" />

                <!-- Save/Cancel Buttons (Right) -->
                <div class="flex gap-2">
                    <Button type="button" label="Hủy" severity="secondary" outlined @click="router.push('/customer/list')" />
                    <Button type="submit" label="Cập nhật" icon="pi pi-save" :loading="loading" />
                </div>
            </div>
        </form>

        <!-- Delete Confirmation Dialog -->
        <Dialog v-model:visible="deleteDialog" :style="{ width: '450px' }" header="Xác nhận xóa" :modal="true">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-yellow-500" style="font-size: 2rem" />
                <span>
                    Bạn có chắc chắn muốn xóa khách hàng
                    <b>{{ customerData.companyName || customerData.representativeName }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
                <Button label="Có" icon="pi pi-check" @click="deleteCustomer" severity="danger" outlined />
            </template>
        </Dialog>
    </div>
</template>
<style scoped>
.p-invalid {
    border-color: #ef4444;
}
.card {
    background-color: white;
    border-radius: 0.5rem;
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 1.5rem;
}
</style>
