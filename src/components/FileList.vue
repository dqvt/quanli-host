<template>
    <div class="file-list">
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>
        
        <div v-else-if="files.length === 0" class="text-center p-4 text-gray-500">
            Không có file nào được tải lên
        </div>
        
        <div v-else class="grid grid-cols-1 gap-4">
            <Card v-for="file in files" :key="file.id" class="shadow-sm">
                <template #title>
                    <div class="flex items-center gap-2">
                        <i :class="getFileIcon(file.fileType)" class="text-xl"></i>
                        <span class="text-lg font-bold">{{ file.fileName }}</span>
                    </div>
                </template>
                <template #subtitle>
                    <div class="text-sm text-gray-600">
                        Tải lên: {{ formatDate(file.uploadedAt) }} | Kích thước: {{ formatFileSize(file.fileSize) }}
                    </div>
                </template>
                <template #content>
                    <div class="flex flex-col gap-2">
                        <div v-if="file.notes" class="text-gray-700 mb-2">
                            {{ file.notes }}
                        </div>
                        <div class="flex justify-between">
                            <Button icon="pi pi-download" label="Tải xuống" @click="downloadFile(file)" class="p-button-sm" />
                            <Button icon="pi pi-trash" severity="danger" @click="confirmDeleteFile(file)" class="p-button-sm p-button-outlined" />
                        </div>
                    </div>
                </template>
            </Card>
        </div>
        
        <!-- Delete File Confirmation Dialog -->
        <Dialog v-model:visible="deleteDialog" header="Xác nhận xóa" :modal="true" :closable="true" :style="{ width: '450px' }">
            <div class="p-4">
                <p>Bạn có chắc chắn muốn xóa file này?</p>
                <p class="font-semibold mt-2">{{ fileToDelete?.fileName }}</p>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" text @click="deleteDialog = false" />
                <Button label="Có, xóa" icon="pi pi-trash" severity="danger" @click="deleteFile" />
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
import { getCustomerFiles, deleteDebtFile } from '@/services/fileUpload';

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
        files.value = await getCustomerFiles(props.customerId, props.year);
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

// Format file size
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format date
const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Get file icon based on file type
const getFileIcon = (fileType) => {
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
        return 'pi pi-file-excel text-green-600';
    } else if (fileType.includes('pdf')) {
        return 'pi pi-file-pdf text-red-600';
    } else if (fileType.includes('word') || fileType.includes('document')) {
        return 'pi pi-file-word text-blue-600';
    } else if (fileType.includes('image')) {
        return 'pi pi-image text-purple-600';
    } else {
        return 'pi pi-file text-gray-600';
    }
};

// Download file
const downloadFile = (file) => {
    if (file && file.downloadURL) {
        window.open(file.downloadURL, '_blank');
    }
};

// Confirm delete file
const confirmDeleteFile = (file) => {
    fileToDelete.value = file;
    deleteDialog.value = true;
};

// Delete file
const deleteFile = async () => {
    if (!fileToDelete.value) return;
    
    try {
        await deleteDebtFile(fileToDelete.value.filePath, fileToDelete.value.id);
        
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa file',
            life: 3000
        });
        
        // Remove the file from the list
        files.value = files.value.filter(f => f.id !== fileToDelete.value.id);
        
        // Emit an event to notify the parent component
        emit('file-deleted', fileToDelete.value);
        
        // Close the dialog
        deleteDialog.value = false;
        fileToDelete.value = null;
    } catch (error) {
        console.error('Error deleting file:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa file',
            life: 3000
        });
    }
};
</script>

<style scoped>
.file-list {
    margin-top: 1rem;
}
</style>
