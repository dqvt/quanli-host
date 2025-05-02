<template>
    <div class="file-list">
        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 30px; height: 30px" />
            <span class="ml-2">Đang tải...</span>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="files.length === 0" class="text-center p-4 text-gray-500">
            <i class="pi pi-file mb-2" style="font-size: 2rem"></i>
            <p>Không có file nào cho năm {{ year }}</p>
        </div>
        
        <!-- File list -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card v-for="file in files" :key="file.id" class="shadow-sm">
                <template #title>
                    <div class="flex items-center">
                        <i class="pi pi-file mr-2"></i>
                        <span class="truncate">{{ file.file_name }}</span>
                    </div>
                </template>
                <template #content>
                    <div class="text-sm text-gray-600 mb-2">
                        <div>Ngày tải lên: {{ formatDate(file.created_at) }}</div>
                        <div v-if="file.notes" class="mt-1">Ghi chú: {{ file.notes }}</div>
                    </div>
                    <div class="flex gap-2 mt-4">
                        <Button icon="pi pi-download" label="Tải xuống" @click="downloadFile(file)" class="p-button-sm" />
                        <Button icon="pi pi-trash" label="Xóa" severity="danger" @click="confirmDelete(file)" class="p-button-sm" />
                    </div>
                </template>
            </Card>
        </div>
        
        <!-- Delete confirmation dialog -->
        <Dialog v-model:visible="deleteDialog" header="Xác nhận xóa" :style="{ width: '450px' }" :modal="true">
            <div class="confirmation-content">
                <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem; color: var(--red-500)" />
                <span>Bạn có chắc chắn muốn xóa file này không?</span>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
                <Button label="Có, xóa" icon="pi pi-check" @click="deleteSelectedFile" severity="danger" autofocus />
            </template>
        </Dialog>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { getCustomerFiles, deleteDebtFile } from '@/services/utils/fileUpload';

const props = defineProps({
    customerId: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    }
});

const emit = defineEmits(['file-deleted']);

const toast = useToast();
const files = ref([]);
const loading = ref(false);
const deleteDialog = ref(false);
const fileToDelete = ref(null);

onMounted(async () => {
    await fetchFiles();
});

// Fetch files for the customer and year
const fetchFiles = async () => {
    loading.value = true;
    try {
        const fileList = await getCustomerFiles(props.customerId, props.year);
        files.value = fileList;
    } catch (error) {
        console.error('Error fetching files:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải danh sách file',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

// Download a file
const downloadFile = (file) => {
    if (file.download_url) {
        window.open(file.download_url, '_blank');
    } else {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải xuống file này',
            life: 3000
        });
    }
};

// Confirm file deletion
const confirmDelete = (file) => {
    fileToDelete.value = file;
    deleteDialog.value = true;
};

// Delete the selected file
const deleteSelectedFile = async () => {
    if (!fileToDelete.value) return;
    
    loading.value = true;
    try {
        await deleteDebtFile(fileToDelete.value.id);
        
        // Remove the file from the list
        files.value = files.value.filter(f => f.id !== fileToDelete.value.id);
        
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa file',
            life: 3000
        });
        
        emit('file-deleted', fileToDelete.value);
    } catch (error) {
        console.error('Error deleting file:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa file',
            life: 3000
        });
    } finally {
        loading.value = false;
        deleteDialog.value = false;
        fileToDelete.value = null;
    }
};

// Format date
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
</script>

<style scoped>
.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}
</style>
