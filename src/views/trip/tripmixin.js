import { db } from '@/config/firebase';
import * as balanceService from '@/services/balance';
import * as expenseService from '@/services/expense';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useToast } from 'primevue/usetoast';
import { getCurrentInstance, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Shared utility functions
const fetchFirestoreData = async (collectionName, statusField, statusValue, transformFn) => {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((item) => item[statusField] === statusValue)
            .map(transformFn);
    } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        return [];
    }
};

const calculateTotalTripExpenses = (expenses) => Object.values(expenses).reduce((sum, value) => sum + (value || 0), 0);

// Utility functions for formatting and status
export const getStatusSeverity = (status) =>
    ({
        COMPLETED: 'success',
        IN_PROGRESS: 'info',
        CANCELLED: 'danger',
        PENDING: 'warning'
    })[status] || 'info';

export const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('vi-VN');
};

export const calculateTotalExpenses = (expenses) => {
    if (!expenses) return '0 ₫';
    const total = calculateTotalTripExpenses(expenses);
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total);
};

// Composables
export const useTripList = () => {
    const toast = useToast();
    const router = useRouter();
    const route = useRoute();

    const state = {
        driverFilterValue: ref(''),
        assistantFilterValue: ref(''),
        customerFilterValue: ref(''),
        startDateFilter: ref(null),
        endDateFilter: ref(null),
        statusFilter: ref(''),
        allTrips: ref([]),
        filteredTrips: ref([]),
        loading: ref(false),
        staffList: ref([]),
        customerList: ref([]),
        approvingTripId: ref(null)
    };

    const fetchStaffList = async () => {
        const transformStaff = (staff) => ({
            value: staff.fullName,
            label: staff.fullName,
            id: staff.id,
            shortName: staff.shortName
        });
        state.staffList.value = await fetchFirestoreData('staff', 'status', 'active', transformStaff);
    };

    const fetchCustomerList = async () => {
        const transformCustomer = (customer) => ({
            value: customer.id,
            label: `${customer.representativeName} - ${customer.companyName}`,
            id: customer.id,
            representativeName: customer.representativeName,
            companyName: customer.companyName
        });
        state.customerList.value = await fetchFirestoreData('customers', 'status', 'active', transformCustomer);
    };

    const fetchTrips = async () => {
        state.loading.value = true;
        try {
            const tripsCollection = collection(db, 'trips');
            const querySnapshot = await getDocs(tripsCollection);
            state.allTrips.value = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            applyFilters();
        } finally {
            state.loading.value = false;
        }
    };

    const applyFilters = () => {
        let result = [...state.allTrips.value];

        // Filter by driver name
        if (state.driverFilterValue.value) {
            result = result.filter((trip) => trip.driverName === state.driverFilterValue.value);
        }

        // Filter by assistant driver name
        if (state.assistantFilterValue.value) {
            result = result.filter((trip) => trip.assistantDriverName === state.assistantFilterValue.value);
        }

        // Filter by customer ID
        if (state.customerFilterValue.value) {
            result = result.filter((trip) => trip.customerName === state.customerFilterValue.value);
        }

        // Filter by trip date range
        if (state.startDateFilter.value || state.endDateFilter.value) {
            result = result.filter((trip) => {
                if (!trip.tripDate) return false;

                const tripDate = new Date(trip.tripDate);
                tripDate.setHours(0, 0, 0, 0);

                // Check if trip date is after start date (if provided)
                if (state.startDateFilter.value) {
                    const startDate = new Date(state.startDateFilter.value);
                    startDate.setHours(0, 0, 0, 0);
                    if (tripDate.getTime() < startDate.getTime()) return false;
                }

                // Check if trip date is before end date (if provided)
                if (state.endDateFilter.value) {
                    const endDate = new Date(state.endDateFilter.value);
                    endDate.setHours(0, 0, 0, 0);
                    if (tripDate.getTime() > endDate.getTime()) return false;
                }

                return true;
            });
        }

        // Filter by status
        if (state.statusFilter.value) {
            result = result.filter((trip) => trip.status === state.statusFilter.value);
        }

        state.filteredTrips.value = result;
    };

    const approveTrip = async (tripId) => {
        state.approvingTripId.value = tripId;
        try {
            // Update trip status to APPROVED
            const tripRef = doc(db, 'trips', tripId);
            await updateDoc(tripRef, {
                status: 'APPROVED',
                approvedAt: new Date().toISOString()
            });

            // Update balance for all expenses associated with this trip
            await balanceService.updateBalanceForTripExpenses(tripId);

            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã duyệt chuyến xe thành công',
                life: 3000
            });

            // Refresh the trip list
            await fetchTrips();
        } catch (error) {
            console.error('Lỗi khi duyệt chuyến xe:', error);
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không thể duyệt chuyến xe',
                life: 3000
            });
        } finally {
            state.approvingTripId.value = null;
        }
    };

    // Watch for changes in filter values
    watch([state.driverFilterValue, state.assistantFilterValue, state.customerFilterValue, state.startDateFilter, state.endDateFilter, state.statusFilter], () => {
        applyFilters();
    });

    const checkRedirectNotification = () => {
        if (route.query.redirected === 'true') {
            toast.add({
                severity: 'info',
                summary: 'Thông báo',
                detail: 'Trang thêm chuyến xe mới chỉ có thể truy cập từ danh sách chuyến xe',
                life: 5000
            });
            router.replace({ path: route.path });
        }
    };

    return {
        ...state,
        router,
        fetchStaffList,
        fetchCustomerList,
        fetchTrips,
        applyFilters,
        checkRedirectNotification,
        approveTrip,
        statusOptions: [
            { label: 'Tất cả', value: '' },
            { label: 'Chờ duyệt', value: 'PENDING' },
            { label: 'Đã duyệt', value: 'APPROVED' },
            { label: 'Đang thực hiện', value: 'IN_PROGRESS' },
            { label: 'Hoàn thành', value: 'COMPLETED' },
            { label: 'Đã hủy', value: 'CANCELLED' }
        ]
    };
};

export const useTripEdit = (tripId) => {
    const router = useRouter();
    const toast = useToast();
    const instance = getCurrentInstance();
    const proxy = instance ? instance.proxy : null;

    const state = {
        loading: ref(false),
        saving: ref(false),
        errorMessage: ref(''),
        deleteDialog: ref(false),
        submitted: ref(false),
        validationErrors: ref({}),
        vehicles: ref([]),
        staffList: ref([]),
        customerList: ref([]),
        tripData: ref({
            tripDate: '',
            startingPoint: '',
            endingPoint: '',
            distance: null,
            driverName: '',
            customerName: '',
            assistantDriverName: '',
            vehicleLicenseNumber: '',
            expenses: {
                policeFee: 0,
                tollFee: 0,
                foodFee: 0,
                gasMoney: 0,
                mechanicFee: 0
            },
            status: 'PENDING'
        })
    };

    const fetchData = {
        staff: async () => {
            const transformStaff = (staff) => ({
                value: staff.fullName,
                label: staff.fullName,
                id: staff.id,
                shortName: staff.shortName
            });
            state.staffList.value = await fetchFirestoreData('staff', 'status', 'active', transformStaff);
        },
        vehicles: async () => {
            const transformVehicle = (vehicle) => ({
                value: vehicle.licensePlate,
                label: vehicle.licensePlate,
                id: vehicle.id
            });
            state.vehicles.value = await fetchFirestoreData('vehicles', 'status', 'ACTIVE', transformVehicle);
        },
        customers: async () => {
            const transformCustomer = (customer) => ({
                value: customer.id,
                label: `${customer.representativeName} - ${customer.companyName}`,
                id: customer.id,
                representativeName: customer.representativeName,
                companyName: customer.companyName
            });
            state.customerList.value = await fetchFirestoreData('customers', 'status', 'active', transformCustomer);
        },
        tripData: async () => {
            state.loading.value = true;
            try {
                const tripDoc = await getDoc(doc(db, 'trips', tripId));
                if (!tripDoc.exists()) {
                    toast.add({
                        severity: 'error',
                        summary: 'Lỗi',
                        detail: 'Không tìm thấy thông tin chuyến đi',
                        life: 3000
                    });
                    router.push('/trip/list');
                    return;
                }
                const data = tripDoc.data();
                if (data.tripDate) data.tripDate = new Date(data.tripDate);
                state.tripData.value = { ...data, id: tripDoc.id };
            } finally {
                state.loading.value = false;
            }
        }
    };

    const updateTrip = async () => {
        state.saving.value = true;
        state.errorMessage.value = '';

        try {
            const { driverId, driverShortName, assistantDriverId, assistantDriverShortName, vehicleId, customerInfo } = getRelatedIds(state);
            const tripRef = doc(db, 'trips', tripId);

            await updateDoc(tripRef, prepareTripData(state, driverId, driverShortName, assistantDriverId, assistantDriverShortName, vehicleId, customerInfo));
            await handleExpenseUpdate(state, tripId, driverId, customerInfo, proxy);

            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã cập nhật thông tin chuyến đi',
                life: 3000
            });
            router.push('/trip/list');
        } catch (error) {
            console.error('Lỗi khi cập nhật chuyến xe:', error);
            state.errorMessage.value = 'Không thể cập nhật thông tin chuyến đi. Vui lòng thử lại.';
        } finally {
            state.saving.value = false;
        }
    };

    const deleteTrip = async () => {
        try {
            const expensesQuery = query(collection(db, 'expenses'), where('tripId', '==', tripId));
            const expenseSnapshot = await getDocs(expensesQuery);

            if (!expenseSnapshot.empty) {
                await deleteDoc(expenseSnapshot.docs[0].ref);
            }

            await deleteDoc(doc(db, 'trips', tripId));

            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã xóa chuyến đi',
                life: 3000
            });
            router.push('/trip/list');
        } catch (error) {
            console.error('Lỗi khi xóa chuyến xe:', error);
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không thể xóa chuyến đi. Vui lòng thử lại.',
                life: 3000
            });
        } finally {
            state.deleteDialog.value = false;
        }
    };

    return {
        ...state,
        statusOptions: [
            { label: 'Chờ duyệt', value: 'PENDING' },
            { label: 'Đang thực hiện', value: 'IN_PROGRESS' },
            { label: 'Hoàn thành', value: 'COMPLETED' },
            { label: 'Đã hủy', value: 'CANCELLED' }
        ],
        router,
        fetchTripData: fetchData.tripData,
        fetchVehicles: fetchData.vehicles,
        fetchStaffList: fetchData.staff,
        fetchCustomers: fetchData.customers,
        updateTrip,
        deleteTrip,
        handleSubmit: () => {
            state.submitted.value = true;
            updateTrip();
        }
    };
};

export const useTripAdd = () => {
    const router = useRouter();
    const toast = useToast();
    const instance = getCurrentInstance();
    const proxy = instance ? instance.proxy : null;

    const state = {
        loading: ref(false),
        errorMessage: ref(''),
        submitted: ref(false),
        validationErrors: ref({}),
        vehicles: ref([]),
        staffList: ref([]),
        customerList: ref([]),
        tripData: ref({
            tripDate: '',
            startingPoint: '',
            endingPoint: '',
            distance: null,
            driverName: '',
            customerName: '',
            assistantDriverName: '',
            vehicleLicenseNumber: '',
            expenses: {
                policeFee: 0,
                tollFee: 0,
                foodFee: 0,
                gasMoney: 0,
                mechanicFee: 0
            }
        })
    };

    // Reuse the same fetch functions from useTripEdit
    const fetchData = {
        staff: async () => {
            const transformStaff = (staff) => ({
                value: staff.fullName,
                label: staff.fullName,
                id: staff.id,
                shortName: staff.shortName
            });
            state.staffList.value = await fetchFirestoreData('staff', 'status', 'active', transformStaff);
        },
        vehicles: async () => {
            const transformVehicle = (vehicle) => ({
                value: vehicle.licensePlate,
                label: vehicle.licensePlate,
                id: vehicle.id
            });
            state.vehicles.value = await fetchFirestoreData('vehicles', 'status', 'ACTIVE', transformVehicle);
        },
        customers: async () => {
            const transformCustomer = (customer) => ({
                value: customer.id,
                label: `${customer.representativeName} - ${customer.companyName}`,
                id: customer.id,
                representativeName: customer.representativeName,
                companyName: customer.companyName
            });
            state.customerList.value = await fetchFirestoreData('customers', 'status', 'active', transformCustomer);
        }
    };

    watch(
        () => state.tripData.value.distance,
        (newValue) => {
            if (state.submitted.value) {
                validateDistance(newValue, state.validationErrors);
            }
        }
    );

    const saveTrip = async (isPublic = false, onSuccess = null) => {
        if (!validateForm(state)) return;

        state.loading.value = true;
        try {
            const { driverId, driverShortName, assistantDriverId, assistantDriverShortName, vehicleId, customerInfo } = getRelatedIds(state);

            const tripRef = await addDoc(collection(db, 'trips'), prepareTripData(state, driverId, driverShortName, assistantDriverId, assistantDriverShortName, vehicleId, customerInfo, true, isPublic));

            // Create expense record if there are expenses
            const totalExpenseAmount = calculateTotalTripExpenses(state.tripData.value.expenses);
            if (totalExpenseAmount > 0) {
                await createExpenseRecord(state, tripRef.id, driverId, totalExpenseAmount, customerInfo, proxy);
            }

            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Lưu chuyến đi thành công!',
                life: 3000
            });

            // If a custom success handler is provided, call it
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess(tripRef);
            } else {
                // Otherwise, navigate to the trip list (default behavior for authenticated users)
                router.push('/trip/list');
            }
        } catch (error) {
            console.error('Lỗi khi lưu chuyến đi:', error);
            state.errorMessage.value = 'Không thể lưu chuyến đi. Vui lòng thử lại.';
        } finally {
            state.loading.value = false;
        }
    };

    return {
        ...state,
        fetchStaffList: fetchData.staff,
        fetchVehicles: fetchData.vehicles,
        fetchCustomers: fetchData.customers,
        handleSubmit: (isPublic = false, onSuccess = null) => {
            state.submitted.value = true;
            saveTrip(isPublic, onSuccess);
        }
    };
};

// Helper functions
const validateDistance = (value, validationErrors) => {
    const distanceValue = Number(value);
    if (value === null || value === undefined || value === '' || value === 0 || distanceValue === 0 || isNaN(distanceValue) || distanceValue <= 0) {
        validationErrors.value.distance = 'Vui lòng nhập quãng đường hợp lệ';
        return false;
    }
    delete validationErrors.value.distance;
    return true;
};

const validateForm = (state) => {
    state.submitted.value = true;
    state.validationErrors.value = {};
    state.errorMessage.value = '';

    const requiredFields = {
        tripDate: 'Vui lòng chọn ngày đi',
        startingPoint: 'Vui lòng nhập điểm xuất phát',
        endingPoint: 'Vui lòng nhập điểm đến',
        driverName: 'Vui lòng nhập tên tài xế',
        customerName: 'Vui lòng chọn khách hàng',
        vehicleLicenseNumber: 'Vui lòng nhập biển số xe'
    };

    let isValid = true;

    Object.entries(requiredFields).forEach(([field, message]) => {
        if (!state.tripData.value[field]) {
            state.validationErrors.value[field] = message;
            isValid = false;
        }
    });

    if (!validateDistance(state.tripData.value.distance, state.validationErrors)) {
        isValid = false;
    }

    if (!isValid) {
        state.errorMessage.value = 'Vui lòng điền đầy đủ thông tin bắt buộc';
    }

    return isValid;
};

const getRelatedIds = (state) => {
    const driverInfo = state.staffList.value.find((staff) => staff.value === state.tripData.value.driverName);
    const assistantInfo = state.tripData.value.assistantDriverName ? state.staffList.value.find((staff) => staff.value === state.tripData.value.assistantDriverName) : null;
    const vehicleInfo = state.vehicles.value.find((vehicle) => vehicle.value === state.tripData.value.vehicleLicenseNumber);
    const customerInfo = state.customerList.value.find((customer) => customer.value === state.tripData.value.customerName);

    return {
        driverId: driverInfo?.id || '',
        driverShortName: driverInfo?.shortName || '',
        assistantDriverId: assistantInfo?.id || '',
        assistantDriverShortName: assistantInfo?.shortName || '',
        vehicleId: vehicleInfo?.id || '',
        customerInfo
    };
};

const prepareTripData = (state, driverId, driverShortName, assistantDriverId, assistantDriverShortName, vehicleId, customerInfo, isNew = false, isPublic = false) => {
    const baseData = {
        ...state.tripData.value,
        tripDate: state.tripData.value.tripDate ? new Date(state.tripData.value.tripDate).toISOString() : null,
        driverId,
        driverShortName,
        assistantDriverId,
        assistantDriverShortName,
        vehicleId,
        customerRepresentativeName: customerInfo?.representativeName || '',
        customerCompanyName: customerInfo?.companyName || '',
        customerDisplayName: customerInfo ? `${customerInfo.representativeName} - ${customerInfo.companyName}` : '',
        updatedAt: serverTimestamp()
    };

    if (isNew) {
        baseData.createdAt = serverTimestamp();
        // Set status based on whether it's a public submission or authenticated submission
        baseData.status = isPublic ? 'PENDING' : 'APPROVED';

        // If it's a public submission, mark it as such
        if (isPublic) {
            baseData.source = 'public';
        }
    }

    return baseData;
};

const handleExpenseUpdate = async (state, tripId, driverId, customerInfo, proxy) => {
    const totalExpenseAmount = calculateTotalTripExpenses(state.tripData.value.expenses);
    const expenseQuery = query(collection(db, 'expenses'), where('tripId', '==', tripId));
    const expenseSnapshot = await getDocs(expenseQuery);

    if (expenseSnapshot.empty && totalExpenseAmount > 0) {
        await createExpenseRecord(state, tripId, driverId, totalExpenseAmount, customerInfo, proxy);
    } else if (!expenseSnapshot.empty) {
        const expenseDoc = expenseSnapshot.docs[0];
        if (totalExpenseAmount > 0) {
            await updateExpenseRecord(state, expenseDoc.ref, tripId, driverId, totalExpenseAmount, customerInfo, proxy);
        } else {
            await deleteDoc(expenseDoc.ref);
        }
    }
};

const createExpenseRecord = async (state, tripId, driverId, amount, customerInfo, proxy) => {
    const description = generateExpenseDescription(state, customerInfo, proxy);

    // Use createExpenseWithoutBalanceUpdate for trip expenses
    // Balance will be updated when the trip is approved
    await expenseService.createExpenseWithoutBalanceUpdate(amount, state.tripData.value.tripDate ? new Date(state.tripData.value.tripDate) : new Date(), 'Chi phí chuyến đi', state.tripData.value.driverName, driverId, tripId, description);
};

const updateExpenseRecord = async (state, expenseRef, tripId, driverId, amount, customerInfo, proxy) => {
    const description = generateExpenseDescription(state, customerInfo, proxy);
    const expenseId = expenseRef.id;

    // Use the new updateExpenseAndBalance function to update the expense and balance
    await expenseService.updateExpenseAndBalance(expenseId, amount, state.tripData.value.tripDate ? new Date(state.tripData.value.tripDate) : new Date(), 'Chi phí chuyến đi', state.tripData.value.driverName, driverId, tripId, description);
};

const generateExpenseDescription = (state, customerInfo, proxy) => {
    const tripData = state.tripData.value;
    const customerDisplay = customerInfo ? `${customerInfo.representativeName} - ${customerInfo.companyName}` : 'Không xác định';

    // Format date using the formatTimestamp function if proxy is not available
    const formattedDate = proxy && proxy.$formatDate ? proxy.$formatDate(tripData.tripDate) : formatTimestamp(tripData.tripDate);

    return `${tripData.startingPoint} → ${tripData.endingPoint} | ${formattedDate} | KH: ${customerDisplay}`;
};
