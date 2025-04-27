<template>
    <div class="excel-uploader">
        <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
                <Button type="button" icon="pi pi-upload" label="Chọn file Excel" @click="triggerFileInput" :disabled="loading" />
                <span v-if="selectedFile" class="text-sm">{{ selectedFile.name }}</span>
                <input
                    type="file"
                    ref="fileInput"
                    accept=".xlsx, .xls"
                    class="hidden"
                    @change="handleFileChange"
                />
            </div>
            
            <div v-if="selectedFile" class="flex items-center gap-2">
                <Button type="button" icon="pi pi-check" label="Tải lên" @click="uploadFile" :loading="loading" :disabled="loading" />
                <Button type="button" icon="pi pi-times" label="Hủy" @click="resetFile" :disabled="loading" class="p-button-secondary" />
            </div>
            
            <div v-if="error" class="text-red-500 text-sm">
                {{ error }}
            </div>
            
            <div v-if="uploadResult" class="bg-green-50 p-4 rounded border border-green-200">
                <h3 class="text-green-700 font-bold mb-2">Tải lên thành công</h3>
                <p>Đã tải lên {{ uploadResult.recordsCount }} bản ghi với tổng số tiền {{ formatCurrency(uploadResult.totalAmount) }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';
import { parseExcelFile } from '@/services/fileUpload';
import { importDebtFromExcel, formatCurrency } from '@/services/debt';

const props = defineProps({
    customerId: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        default: ''
    },
    representativeName: {
        type: String,
        default: ''
    },
    year: {
        type: Number,
        required: true
    }
});

const emit = defineEmits(['upload-complete']);

const fileInput = ref(null);
const selectedFile = ref(null);
const loading = ref(false);
const error = ref('');
const uploadResult = ref(null);

// Trigger the file input click
const triggerFileInput = () => {
    fileInput.value.click();
};

// Handle file selection
const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
        // Check if the file is an Excel file
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            error.value = 'Vui lòng chọn file Excel (.xlsx hoặc .xls)';
            return;
        }
        
        selectedFile.value = file;
        error.value = '';
        uploadResult.value = null;
    }
};

// Reset the file input
const resetFile = () => {
    selectedFile.value = null;
    fileInput.value.value = '';
    error.value = '';
    uploadResult.value = null;
};

// Upload and process the Excel file
const uploadFile = async () => {
    if (!selectedFile.value) {
        error.value = 'Vui lòng chọn file Excel trước khi tải lên';
        return;
    }
    
    loading.value = true;
    error.value = '';
    
    try {
        // Parse the Excel file
        const debtRecords = await parseExcelFile(selectedFile.value);
        
        if (debtRecords.length === 0) {
            error.value = 'Không tìm thấy dữ liệu hợp lệ trong file Excel';
            loading.value = false;
            return;
        }
        
        // Import the debt records
        const result = await importDebtFromExcel(
            props.customerId,
            props.customerName,
            props.representativeName,
            props.year,
            debtRecords
        );
        
        uploadResult.value = result;
        
        // Emit an event to notify the parent component
        emit('upload-complete', result);
        
        // Reset the file input
        fileInput.value.value = '';
        selectedFile.value = null;
    } catch (err) {
        console.error('Error uploading Excel file:', err);
        error.value = `Lỗi khi tải lên file: ${err.message}`;
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.excel-uploader {
    margin-bottom: 1rem;
}

.hidden {
    display: none;
}
</style>
