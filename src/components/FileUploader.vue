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
import { uploadDebtFile } from '@/services/fileUpload';

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
        uploadResult.value = null;
    }
};

// Reset the file input
const resetFile = () => {
    selectedFile.value = null;
    notes.value = '';
    fileInput.value.value = '';
    error.value = '';
    uploadResult.value = null;
};

// Upload the file
const uploadFile = async () => {
    if (!selectedFile.value) {
        error.value = 'Vui lòng chọn file trước khi tải lên';
        return;
    }
    
    loading.value = true;
    error.value = '';
    
    try {
        // Upload the file
        const result = await uploadDebtFile(
            selectedFile.value,
            props.customerId,
            props.year,
            notes.value
        );
        
        uploadResult.value = result;
        
        // Emit an event to notify the parent component
        emit('upload-complete', result);
        
        // Reset the file input but keep the result visible
        fileInput.value.value = '';
        selectedFile.value = null;
        notes.value = '';
    } catch (err) {
        console.error('Error uploading file:', err);
        error.value = `Lỗi khi tải lên file: ${err.message}`;
    } finally {
        loading.value = false;
    }
};

// Download the file
const downloadFile = () => {
    if (uploadResult.value && uploadResult.value.downloadURL) {
        window.open(uploadResult.value.downloadURL, '_blank');
    }
};
</script>

<style scoped>
.file-uploader {
    margin-bottom: 1rem;
}

.hidden {
    display: none;
}
</style>
