<template>
    <div class="excel-uploader">
        <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
                <Button type="button" icon="pi pi-file-excel" label="Chọn file Excel" @click="triggerFileInput" :disabled="loading" />
                <span v-if="selectedFile" class="text-sm">{{ selectedFile.name }}</span>
                <input
                    type="file"
                    ref="fileInput"
                    class="hidden"
                    accept=".xlsx, .xls"
                    @change="handleFileChange"
                />
            </div>
            
            <div v-if="selectedFile" class="flex flex-col gap-2">
                <div class="flex items-center gap-2 mt-2">
                    <Button type="button" icon="pi pi-check" label="Nhập dữ liệu" @click="uploadFile" :loading="loading" :disabled="loading" />
                    <Button type="button" icon="pi pi-times" label="Hủy" @click="resetFile" :disabled="loading" class="p-button-secondary" />
                </div>
            </div>
            
            <div v-if="error" class="text-red-500 text-sm">
                {{ error }}
            </div>
            
            <div v-if="uploadResult" class="bg-green-50 p-4 rounded border border-green-200">
                <h3 class="text-green-700 font-bold mb-2">Nhập dữ liệu thành công</h3>
                <p>Đã nhập {{ uploadResult.count }} bản ghi từ file Excel</p>
                <div v-if="uploadResult.details" class="mt-2">
                    <div v-for="(detail, index) in uploadResult.details" :key="index" class="text-sm">
                        {{ detail }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';
import { parseExcelFile } from '@/services/utils/fileUpload';
import { importDebtFromExcel, formatCurrency } from '@/services/utils/debt';

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
        // Check if file is Excel
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            error.value = 'Vui lòng chọn file Excel (.xlsx hoặc .xls)';
            return;
        }
        
        selectedFile.value = file;
        error.value = '';
    }
};

// Reset file selection
const resetFile = () => {
    selectedFile.value = null;
    error.value = '';
    uploadResult.value = null;
    if (fileInput.value) {
        fileInput.value.value = '';
    }
};

// Upload and process the Excel file
const uploadFile = async () => {
    if (!selectedFile.value) {
        error.value = 'Vui lòng chọn file Excel để nhập dữ liệu';
        return;
    }

    loading.value = true;
    error.value = '';

    try {
        // Parse Excel file
        const excelData = await parseExcelFile(selectedFile.value);
        
        // Import data to database
        const result = await importDebtFromExcel(
            props.customerId, 
            props.customerName,
            props.representativeName,
            props.year, 
            excelData
        );
        
        uploadResult.value = result;
        emit('upload-complete', result);
        
        // Reset file selection but keep the result visible
        selectedFile.value = null;
        if (fileInput.value) {
            fileInput.value.value = '';
        }
    } catch (err) {
        console.error('Error processing Excel file:', err);
        error.value = err.message || 'Không thể xử lý file Excel. Vui lòng kiểm tra định dạng file và thử lại.';
    } finally {
        loading.value = false;
    }
};
</script>
