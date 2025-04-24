<script setup>
import Button from 'primevue/button';
import DatePicker from 'primevue/calendar';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { onMounted, ref } from 'vue';
import { calculateTotalExpenses, formatTimestamp, getStatusSeverity, useTripList } from './tripmixin';

// Function to translate status values to Vietnamese
const translateStatus = (status) => {
    const translations = {
        PENDING: 'Chờ duyệt',
        APPROVED: 'Đã duyệt',
        IN_PROGRESS: 'Đang thực hiện',
        COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy'
    };
    return translations[status] || status;
};

const { filteredTrips, loading, fetchData, approveTrip, approvingTripId, driverFilterValue, assistantFilterValue, customerFilterValue, startDateFilter, endDateFilter, statusFilter, statusOptions, staffList, customerList } = useTripList();

// Add confirmation dialog functionality
const confirmDialog = ref(false);
const tripToApprove = ref(null);

// Function to show confirmation dialog before approving
const confirmApprove = (tripId) => {
    tripToApprove.value = tripId;
    confirmDialog.value = true;
};

// Function to handle approval after confirmation
const handleApprove = () => {
    if (tripToApprove.value) {
        approveTrip(tripToApprove.value);
        tripToApprove.value = null;
    }
    confirmDialog.value = false;
};

onMounted(() => {
    fetchData.staff();
    fetchData.customers();
    fetchData.trips();
});
</script>

<template>
    <Fluid class="flex flex-col gap-8">
        <!-- Confirmation Dialog -->
        <Dialog v-model:visible="confirmDialog" header="Xác nhận duyệt chuyến" :style="{ width: '450px' }" :modal="true">
            <div class="confirmation-content">
                <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem; color: var(--yellow-500)" />
                <span>Bạn có chắc chắn muốn duyệt chuyến xe này không?</span>
            </div>
            <template #footer>
                <Button label="Không" icon="pi pi-times" outlined @click="confirmDialog = false" />
                <Button label="Có, duyệt chuyến" icon="pi pi-check" severity="success" @click="handleApprove" autofocus />
            </template>
        </Dialog>
        <!-- Results Section -->
        <div class="card">
            <div class="font-semibold text-xl mb-4">Danh sách chuyến xe</div>

            <!-- Filter Section -->
            <div class="filter-container mb-4">
                <div class="filter-row">
                    <div class="filter-item">
                        <span class="filter-label">Tài xế:</span>
                        <Dropdown v-model="driverFilterValue" :options="staffList" optionLabel="label" optionValue="value" placeholder="Chọn tài xế" class="filter-input" :showClear="true" />
                    </div>
                    <div class="filter-item">
                        <span class="filter-label">Phụ xe:</span>
                        <Dropdown v-model="assistantFilterValue" :options="staffList" optionLabel="label" optionValue="value" placeholder="Chọn phụ xe" class="filter-input" :showClear="true" />
                    </div>
                    <div class="filter-item">
                        <span class="filter-label">Khách hàng:</span>
                        <Dropdown v-model="customerFilterValue" :options="customerList" optionLabel="label" optionValue="value" placeholder="Chọn khách hàng" class="filter-input" :showClear="true" />
                    </div>
                    <div class="filter-item date-range-container">
                        <div class="date-range-item">
                            <span class="filter-label">Từ ngày:</span>
                            <DatePicker v-model="startDateFilter" dateFormat="dd/mm/yy" placeholder="Từ ngày" showIcon class="filter-input date-picker-large" />
                        </div>
                        <div class="date-range-item">
                            <span class="filter-label">Đến ngày:</span>
                            <DatePicker v-model="endDateFilter" dateFormat="dd/mm/yy" placeholder="Đến ngày" showIcon class="filter-input date-picker-large" />
                        </div>
                    </div>
                    <div class="filter-item">
                        <span class="filter-label">Trạng thái:</span>
                        <Dropdown v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Chọn trạng thái" class="filter-input" />
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-center mb-4">
                <Button label="Thêm chuyến xe mới" icon="pi pi-plus" @click="$router.push('/trip/add')" />
            </div>
            <!-- Loading indicator -->
            <div v-if="loading" class="flex justify-center items-center p-4">
                <ProgressSpinner style="width: 50px; height: 50px" />
            </div>

            <!-- Results table -->
            <DataTable
                v-else
                :value="filteredTrips"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                responsiveLayout="scroll"
                currentPageReportTemplate="Hiển thị {first} đến {last} của {totalRecords} chuyến xe"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                class="p-datatable-sm"
            >
                <!-- Add Vehicle License column -->
                <Column field="vehicleLicenseNumber" header="Biển số xe" sortable></Column>

                <!-- Basic Information -->
                <Column field="tripDate" header="Thời gian đi" sortable>
                    <template #body="slotProps">
                        {{ $formatDate(slotProps.data.tripDate) }}
                    </template>
                </Column>
                <Column field="startingPoint" header="Điểm đi" sortable></Column>
                <Column field="endingPoint" header="Điểm đến" sortable></Column>
                <Column field="distance" header="Khoảng cách" sortable>
                    <template #body="slotProps"> {{ slotProps.data.distance }} km </template>
                </Column>

                <!-- Personnel Information -->
                <Column field="driverName" header="Tài xế" sortable></Column>
                <Column field="assistantDriverName" header="Phụ xe" sortable></Column>
                <Column field="customerDisplayName" header="Khách hàng" sortable></Column>

                <!-- Expenses -->
                <Column header="Chi phí CSGT" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.policeFee || 0) }}
                    </template>
                </Column>
                <Column header="Phí cầu đường" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.tollFee || 0) }}
                    </template>
                </Column>
                <Column header="Chi phí ăn uống" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.foodFee || 0) }}
                    </template>
                </Column>
                <Column header="Chi phí xăng" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.gasMoney || 0) }}
                    </template>
                </Column>
                <Column header="Chi phí sửa chữa" sortable>
                    <template #body="slotProps">
                        {{ new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slotProps.data.expenses?.mechanicFee || 0) }}
                    </template>
                </Column>

                <!-- Total Expenses -->
                <Column header="Tổng chi phí" sortable>
                    <template #body="slotProps">
                        {{ calculateTotalExpenses(slotProps.data.expenses) }}
                    </template>
                </Column>

                <!-- Status and Timestamps -->
                <Column field="status" header="Trạng thái" sortable>
                    <template #body="slotProps">
                        <Tag :severity="getStatusSeverity(slotProps.data.status)" :value="translateStatus(slotProps.data.status)" />
                    </template>
                </Column>
                <Column field="createdAt" header="Ngày tạo" sortable>
                    <template #body="slotProps">
                        {{ formatTimestamp(slotProps.data.createdAt) }}
                    </template>
                </Column>
                <Column field="updatedAt" header="Cập nhật lúc" sortable>
                    <template #body="slotProps">
                        {{ formatTimestamp(slotProps.data.updatedAt) }}
                    </template>
                </Column>

                <!-- Add Actions Column -->
                <Column header="Thao tác" :exportable="false" style="min-width: 12rem">
                    <template #body="slotProps">
                        <div class="action-buttons">
                            <Button icon="pi pi-pencil" label="Sửa" outlined size="small" class="edit-button p-button-sm" @click="$router.push(`/trip/edit/${slotProps.data.id}`)" tooltip="Chỉnh sửa chuyến xe" />
                            <Button
                                v-if="slotProps.data.status === 'PENDING'"
                                icon="pi pi-check"
                                label="Duyệt"
                                severity="success"
                                size="small"
                                class="approve-button p-button-sm"
                                :loading="approvingTripId === slotProps.data.id"
                                @click="confirmApprove(slotProps.data.id)"
                                tooltip="Duyệt chuyến xe"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>

            <!-- Empty state -->
            <div v-if="!loading && filteredTrips.length === 0" class="text-center p-4">
                <i class="pi pi-search mb-4" style="font-size: 2rem"></i>
                <p>Không tìm thấy chuyến xe nào</p>
            </div>
        </div>
    </Fluid>
</template>

<style scoped>
.p-datatable-sm .p-datatable-thead > tr > th,
.p-datatable-sm .p-datatable-tbody > tr > td {
    padding: 0.5rem;
    font-size: 0.875rem;
}

/* Add horizontal scroll for better mobile experience */
.p-datatable-wrapper {
    overflow-x: auto;
}

.p-dialog-content {
    padding: 1rem;
}

/* Filter section styling */
.filter-container {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
}

.filter-item {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 200px;
}

.filter-label {
    font-weight: 600;
    margin-right: 0.5rem;
    white-space: nowrap;
    color: #495057;
}

.filter-input {
    flex: 1;
}

/* Make sure the datepicker and dropdown have proper width */
:deep(.p-calendar),
:deep(.p-dropdown) {
    width: 100%;
}

/* Date range styling */
.date-range-container {
    display: flex;
    gap: 1rem;
    flex: 2; /* Give more space to the date range container */
}

.date-range-item {
    display: flex;
    align-items: center;
    flex: 1;
}

/* Larger date picker styling */
:deep(.date-picker-large) {
    .p-calendar {
        width: 100%;
    }

    .p-inputtext {
        font-size: 1.1rem;
        padding: 0.85rem;
        height: auto;
        border-width: 2px;
    }

    .p-datepicker-trigger {
        width: 3.5rem;
        height: 100%;

        .p-button-icon {
            font-size: 1.4rem;
        }
    }
}

/* Make the calendar panel larger when opened */
:deep(.p-datepicker) {
    font-size: 1.1rem;
    padding: 0.75rem;

    .p-datepicker-header {
        padding: 0.75rem;

        .p-datepicker-title {
            margin: 0 2.5rem;

            .p-datepicker-year,
            .p-datepicker-month {
                font-size: 1.2rem;
                font-weight: 600;
            }
        }

        .p-datepicker-prev,
        .p-datepicker-next {
            width: 2.5rem;
            height: 2.5rem;

            span {
                font-size: 1.2rem;
            }
        }
    }

    table {
        font-size: 1.1rem;
        margin: 0.5rem 0;

        th {
            padding: 0.75rem;
        }

        td {
            padding: 0.5rem;

            > span {
                width: 2.8rem;
                height: 2.8rem;
                line-height: 2.8rem;
            }
        }
    }
}

/* Action buttons styling */
.action-buttons {
    display: flex;
    gap: 0.25rem;
    align-items: center;
}

.edit-button,
.approve-button {
    min-width: 80px;
    padding: 0.25rem 0.5rem;
}

.approve-button {
    font-weight: 600;
}

/* Confirmation dialog styling */
.confirmation-content {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1rem 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .filter-row {
        flex-direction: column;
        align-items: stretch;
    }

    .filter-item {
        margin-bottom: 0.5rem;
    }

    .date-range-container {
        flex-direction: column;
        flex: 1;
    }

    .date-range-item {
        margin-bottom: 1rem;
        width: 100%;
    }

    .date-range-item:last-child {
        margin-bottom: 0;
    }

    /* Ensure date pickers are still large on mobile */
    :deep(.date-picker-large) {
        width: 100%;

        .p-calendar {
            width: 100%;
        }

        .p-inputtext {
            width: 100%;
            font-size: 1rem;
            padding: 0.75rem;
        }
    }

    .action-buttons {
        flex-direction: column;
        align-items: flex-start;
    }

    .edit-button,
    .approve-button {
        margin-bottom: 0.5rem;
        width: 100%;
    }
}
</style>
