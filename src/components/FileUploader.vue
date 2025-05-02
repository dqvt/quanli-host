<template>
    <div class="file-uploader">
        <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
                <Button type="button" icon="pi pi-upload" label="Chọn file" @click="triggerFileInput" :disabled="loading" />
                <span v-if="selectedFile" class="text-sm">{{ selectedFile.name }}</span>
                <input
                    type="file"
                    ref="fileInput"
                    class="hidden"
                    @change="handleFileChange"
                />
            </div>
            
            <div v-if="selectedFile" class="flex flex-col gap-2">
                <div class="flex flex-col gap-1">
                    <label for="fileNotes">Ghi chú</label>
                    <Textarea id="fileNotes" v-model="notes" rows="2" placeholder="Nhập ghi chú về file này" />
                </div>
                
                <div class="flex items-center gap-2 mt-2">
                    <Button type="button" icon="pi pi-check" label="Tải lên" @click="uploadFile" :loading="loading" :disabled="loading" />
                    <Button type="button" icon="pi pi-times" label="Hủy" @click="resetFile" :disabled="loading" class="p-button-secondary" />
                </div>
            </div>
            
            <div v-if="error" class="text-red-500 text-sm">
                {{ error }}
            </div>
            
            <div v-if="uploadResult" class="bg-green-50 p-4 rounded border border-green-200">
                <h3 class="text-green-700 font-bold mb-2">Tải lên thành công</h3>
                <p>Đã tải lên file: {{ uploadResult.fileName }}</p>
                <div class="flex mt-2">
                    <Button type="button" icon="pi pi-download" label="Tải xuống" @click="downloadFile" class="p-button-sm" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import { uploadDebtFile } from '@/services/utils/fileUpload';

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

const emit = defineEmits(['upload-complete']);

const fileInput = ref(null);
const selectedFile = ref(null);
const notes = ref('');
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
        selectedFile.value = file;
        error.value = '';
    }
};

// Reset file selection
const resetFile = () => {
    selectedFile.value = null;
    notes.value = '';
    error.value = '';
    uploadResult.value = null;
    if (fileInput.value) {
        fileInput.value.value = '';
    }
};

// Upload the file
const uploadFile = async () => {
    if (!selectedFile.value) {
        error.value = 'Vui lòng chọn file để tải lên';
        return;
    }

    loading.value = true;
    error.value = '';

    try {
        const result = await uploadDebtFile(props.customerId, props.year, selectedFile.value, notes.value);
        uploadResult.value = result;
        emit('upload-complete', result);
        // Reset file selection but keep the result visible
        selectedFile.value = null;
        notes.value = '';
        if (fileInput.value) {
            fileInput.value.value = '';
        }
    } catch (err) {
        console.error('Error uploading file:', err);
        error.value = err.message || 'Không thể tải lên file. Vui lòng thử lại.';
    } finally {
        loading.value = false;
    }
};

// Download the file
const downloadFile = () => {
    if (uploadResult.value && uploadResult.value.downloadUrl) {
        window.open(uploadResult.value.downloadUrl, '_blank');
    }
};
</script>
