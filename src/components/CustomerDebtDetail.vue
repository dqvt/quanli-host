<script setup>
import { supabase } from '@/config/supabase';
import { addOrUpdateDebt, addPayment, deletePayment, formatCurrency, getCustomerDebt, getCustomerPayments } from '@/services/debt';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Divider from 'primevue/divider';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import TabPanel from 'primevue/tabpanel';
import TabView from 'primevue/tabview';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const customerId = route.params.id;
const customer = ref(null);
const debts = ref([]);
const payments = ref([]);
const loading = ref(false);
const currentYear = new Date().getFullYear();
const years = ref([]);

// Generate a list of years (current year and 4 previous years)
for (let i = 0; i < 5; i++) {
    years.value.push(currentYear - i);
}

// New debt dialog
const newDebtDialog = ref(false);
const newDebt = ref({
    year: currentYear,
    amount: 0
});

// New payment dialog
const newPaymentDialog = ref(false);
const newPayment = ref({
    year: currentYear,
    amount: 0,
    paymentDate: new Date(),
    notes: ''
});

// Delete payment dialog
const deletePaymentDialog = ref(false);
const paymentToDelete = ref(null);

// Computed properties
const yearlyDebtSummary = computed(() => {
    return years.value.map((year) => {
        const yearDebts = debts.value.filter((debt) => debt.year === year);
        const yearPayments = payments.value.filter((payment) => payment.year === year);

        const totalDebt = yearDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
        const totalPayments = yearPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

        return {
            year,
            totalDebt,
            totalPayments,
            remaining: totalDebt - totalPayments
        };
    });
});

const totalDebt = computed(() => {
    return debts.value.reduce((sum, debt) => sum + (debt.amount || 0), 0);
});

const totalPayments = computed(() => {
    return payments.value.reduce((sum, payment) => sum + (payment.amount || 0), 0);
});

const remainingDebt = computed(() => {
    return totalDebt.value - totalPayments.value;
});

// Add these refs
const customerData = ref({
    representativeName: '',
    companyName: '',
    googleDriveLink: '' // Changed from oneDriveLink
});

// Add this function to fetch customer data
const fetchCustomerData = async () => {
    try {
        const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).single();

        if (error) throw error;
        if (data) {
            customerData.value = data;
        }
    } catch (error) {
        console.error('Error fetching customer data:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải thông tin khách hàng',
            life: 3000
        });
    }
};

// Add this function to open Google Drive file
const openGoogleDriveFile = () => {
    if (customerData.value.googleDriveLink) {
        window.open(customerData.value.googleDriveLink, '_blank');
    }
};

onMounted(async () => {
    await Promise.all([fetchCustomerData(), fetchData()]);
});

async function fetchData() {
    loading.value = true;
    try {
        // Fetch customer data
        await fetchCustomer();

        // Fetch debt and payment data
        const debtData = await getCustomerDebt(customerId);
        debts.value = debtData.debts || [];

        const paymentData = await getCustomerPayments(customerId);
        payments.value = paymentData || [];

        // Sort payments by date (newest first)
        payments.value.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải dữ liệu công nợ',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function fetchCustomer() {
    try {
        const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).single();

        if (error) throw error;
        if (data) {
            customer.value = data;
        } else {
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không tìm thấy thông tin khách hàng',
                life: 3000
            });
            router.push('/customer/list');
        }
    } catch (error) {
        console.error('Error fetching customer:', error);
        throw error;
    }
}

async function saveNewDebt() {
    try {
        if (!newDebt.value.amount || newDebt.value.amount <= 0) {
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Vui lòng nhập số tiền công nợ hợp lệ',
                life: 3000
            });
            return;
        }

        await addOrUpdateDebt(customerId, customer.value.company_name, customer.value.representative_name, newDebt.value.year, newDebt.value.amount);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã cập nhật công nợ',
            life: 3000
        });

        newDebtDialog.value = false;
        resetNewDebt();
        await fetchData();
    } catch (error) {
        console.error('Error saving debt:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể cập nhật công nợ',
            life: 3000
        });
    }
}

async function saveNewPayment() {
    try {
        if (!newPayment.value.amount || newPayment.value.amount <= 0) {
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Vui lòng nhập số tiền thanh toán hợp lệ',
                life: 3000
            });
            return;
        }

        if (!newPayment.value.paymentDate) {
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Vui lòng chọn ngày thanh toán',
                life: 3000
            });
            return;
        }

        await addPayment(customerId, customer.value.company_name, customer.value.representative_name, newPayment.value.amount, newPayment.value.paymentDate, newPayment.value.notes);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã thêm thanh toán mới',
            life: 3000
        });

        newPaymentDialog.value = false;
        resetNewPayment();
        await fetchData();
    } catch (error) {
        console.error('Error saving payment:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể thêm thanh toán',
            life: 3000
        });
    }
}

async function confirmDeletePayment() {
    try {
        if (!paymentToDelete.value) return;

        await deletePayment(paymentToDelete.value.id);

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa thanh toán',
            life: 3000
        });

        deletePaymentDialog.value = false;
        paymentToDelete.value = null;
        await fetchData();
    } catch (error) {
        console.error('Error deleting payment:', error);
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể xóa thanh toán',
            life: 3000
        });
    }
}

function showDeletePaymentDialog(payment) {
    paymentToDelete.value = payment;
    deletePaymentDialog.value = true;
}

function resetNewDebt() {
    newDebt.value = {
        year: currentYear,
        amount: 0
    };
}

function resetNewPayment() {
    newPayment.value = {
        year: currentYear,
        amount: 0,
        paymentDate: new Date(),
        notes: ''
    };
}

function formatDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('vi-VN');
}

function goBack() {
    router.push('/customer/debt');
}
</script>

<template>
    <div class="card">
        <!-- Loading indicator -->
        <div v-if="loading" class="flex justify-center items-center p-4">
            <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <div v-else>
            <!-- Add this after the customer info header -->
            <div v-if="customerData.googleDriveLink" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-file-excel text-green-600 text-xl"></i>
                        <span class="font-semibold">File Excel Google Drive</span>
                    </div>
                    <Button icon="pi pi-external-link" label="Mở Excel" severity="success" @click="openGoogleDriveFile" class="p-button-sm" />
                </div>
            </div>

            <!-- Customer info header -->
            <div class="flex justify-between items-center mb-4">
                <div>
                    <Button icon="pi pi-arrow-left" text @click="goBack" class="mr-2" />
                    <span class="font-semibold text-xl">Chi tiết công nợ khách hàng</span>
                </div>
                <div class="flex gap-2">
                    <Button label="Thêm công nợ" icon="pi pi-plus" @click="newDebtDialog = true" />
                    <Button label="Thêm thanh toán" icon="pi pi-money-bill" severity="success" @click="newPaymentDialog = true" />
                    <Button label="Xem chuyến xe" icon="pi pi-car" severity="info" @click="router.push(`/customer/trips/${customerId}`)" />
                </div>
            </div>

            <!-- Customer details -->
            <Card class="mb-4">
                <template #title>
                    <div class="text-xl font-bold">{{ customer?.company_name || '(Không có tên công ty)' }}</div>
                </template>
                <template #subtitle>
                    <div class="text-gray-600">Người đại diện: {{ customer?.representative_name }}</div>
                </template>
                <template #content>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <div class="text-sm text-gray-600">Số điện thoại</div>
                            <div>{{ customer?.contact_number || 'Không có' }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Email</div>
                            <div>{{ customer?.email || 'Không có' }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Tổng công nợ còn lại</div>
                            <div class="text-xl font-bold" :class="{ 'text-red-500': remainingDebt > 0 }">
                                {{ formatCurrency(remainingDebt) }}
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Debt summary by year -->
            <div class="mb-4">
                <h3 class="text-lg font-semibold mb-2">Tổng quan công nợ theo năm</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card v-for="summary in yearlyDebtSummary" :key="summary.year" class="shadow-sm">
                        <template #title>
                            <div class="text-lg font-bold">Năm {{ summary.year }}</div>
                        </template>
                        <template #content>
                            <div class="flex flex-col gap-2">
                                <div class="flex justify-between">
                                    <span>Tổng công nợ:</span>
                                    <span class="font-semibold">{{ formatCurrency(summary.totalDebt) }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Đã thanh toán:</span>
                                    <span class="font-semibold">{{ formatCurrency(summary.totalPayments) }}</span>
                                </div>
                                <Divider />
                                <div class="flex justify-between">
                                    <span>Còn lại:</span>
                                    <span class="font-bold" :class="{ 'text-red-500': summary.remaining > 0 }">
                                        {{ formatCurrency(summary.remaining) }}
                                    </span>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>

            <!-- Detailed tabs -->
            <TabView>
                <!-- Debt tab -->
                <TabPanel header="Công nợ">
                    <DataTable :value="debts" :paginator="true" :rows="5" :rowsPerPageOptions="[5, 10, 20]" responsiveLayout="scroll" class="p-datatable-sm">
                        <Column field="year" header="Năm" sortable></Column>
                        <Column field="amount" header="Số tiền" sortable>
                            <template #body="{ data }">
                                {{ formatCurrency(data.amount) }}
                            </template>
                        </Column>
                        <Column field="created_at" header="Ngày tạo" sortable>
                            <template #body="{ data }">
                                {{ formatDate(data.created_at) }}
                            </template>
                        </Column>
                        <Column field="updated_at" header="Ngày cập nhật" sortable>
                            <template #body="{ data }">
                                {{ formatDate(data.updated_at) }}
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>

                <!-- Payments tab -->
                <TabPanel header="Lịch sử thanh toán">
                    <DataTable :value="payments" :paginator="true" :rows="5" :rowsPerPageOptions="[5, 10, 20]" responsiveLayout="scroll" class="p-datatable-sm">
                        <Column field="date" header="Ngày thanh toán" sortable>
                            <template #body="{ data }">
                                {{ formatDate(data.date) }}
                            </template>
                        </Column>
                        <Column field="amount" header="Số tiền" sortable>
                            <template #body="{ data }">
                                {{ formatCurrency(data.amount) }}
                            </template>
                        </Column>
                        <Column field="note" header="Ghi chú"></Column>
                        <Column field="created_at" header="Ngày tạo" sortable>
                            <template #body="{ data }">
                                {{ formatDate(data.created_at) }}
                            </template>
                        </Column>
                        <Column header="Thao tác" style="width: 6rem">
                            <template #body="slotProps">
                                <Button icon="pi pi-trash" severity="danger" text rounded @click="showDeletePaymentDialog(slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
            </TabView>
        </div>

        <!-- Add Debt Dialog -->
        <Dialog v-model:visible="newDebtDialog" header="Thêm công nợ mới" :modal="true" :closable="true" :style="{ width: '450px' }">
            <div class="flex flex-col gap-4 p-4">
                <div class="flex flex-col gap-2">
                    <label for="debtYear">Năm</label>
                    <InputText id="debtYear" v-model.number="newDebt.year" type="number" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="debtAmount">Số tiền</label>
                    <InputNumber id="debtAmount" v-model="newDebt.amount" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" />
                </div>
            </div>
            <template #footer>
                <Button label="Hủy" icon="pi pi-times" text @click="newDebtDialog = false" />
                <Button label="Lưu" icon="pi pi-check" @click="saveNewDebt" />
            </template>
        </Dialog>

        <!-- Add Payment Dialog -->
        <Dialog v-model:visible="newPaymentDialog" header="Thêm thanh toán mới" :modal="true" :closable="true" :style="{ width: '450px' }">
            <div class="flex flex-col gap-4 p-4">
                <div class="flex flex-col gap-2">
                    <label for="paymentAmount">Số tiền</label>
                    <InputNumber id="paymentAmount" v-model="newPayment.amount" mode="currency" currency="VND" locale="vi-VN" :minFractionDigits="0" :maxFractionDigits="0" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="paymentDate">Ngày thanh toán</label>
                    <Calendar id="paymentDate" v-model="newPayment.paymentDate" dateFormat="dd/mm/yy" showIcon />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="paymentNotes">Ghi chú</label>
                    <Textarea id="paymentNotes" v-model="newPayment.notes" rows="3" />
                </div>
            </div>
            <template #footer>
                <Button label="Hủy" icon="pi pi-times" text @click="newPaymentDialog = false" />
                <Button label="Lưu" icon="pi pi-check" severity="success" @click="saveNewPayment" />
            </template>
        </Dialog>

        <!-- Delete Payment Confirmation Dialog -->
        <Dialog v-model:visible="deletePaymentDialog" header="Xác nhận xóa thanh toán" :modal="true" :closable="true" :style="{ width: '450px' }">
            <div class="flex flex-col gap-4 p-4">
                <div class="flex items-center gap-2">
                    <i class="pi pi-exclamation-triangle text-yellow-500 text-2xl"></i>
                    <span>Bạn có chắc chắn muốn xóa thanh toán này không?</span>
                </div>
                <div v-if="paymentToDelete" class="bg-gray-100 p-3 rounded">
                    <div><strong>Số tiền:</strong> {{ formatCurrency(paymentToDelete.amount) }}</div>
                    <div><strong>Ngày thanh toán:</strong> {{ formatDate(paymentToDelete.date) }}</div>
                </div>
            </div>
            <template #footer>
                <Button label="Hủy" icon="pi pi-times" text @click="deletePaymentDialog = false" />
                <Button label="Xóa" icon="pi pi-trash" severity="danger" @click="confirmDeletePayment" />
            </template>
        </Dialog>
    </div>
</template>
