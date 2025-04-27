import { db } from '@/config/firebase';
import * as balanceService from '@/services/balance';
import * as expenseService from '@/services/expense';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useToast } from 'primevue/usetoast';
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Constants
export const STATUS_TRANSLATIONS = {
    PENDING: { label: 'Chờ duyệt', severity: 'secondary' },
    WAITING_FOR_PRICE: { label: 'Chờ báo giá', severity: 'info' },
    PRICED: { label: 'Đã báo giá', severity: 'success' }
};

export const DEFAULT_TRIP_DATA = {
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
    price: 0,
    status: 'PENDING'
};

// Utility functions
export const getStatusSeverity = (status) => STATUS_TRANSLATIONS[status]?.severity || 'info';

export const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('vi-VN');
};

export const calculateTotalExpenses = (expenses) => {
    if (!expenses) return '0 ₫';
    const total = Object.values(expenses).reduce((sum, value) => sum + (value || 0), 0);
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total);
};

// Data fetching utilities
export const fetchFirestoreData = async (collectionName, statusField, statusValue, transformFn) => {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((item) => item[statusField] === statusValue)
            .map(transformFn);
    } catch (error) {
        // Error fetching data
        return [];
    }
};

// Data transformers
export const transformers = {
    staff: (staff) => ({
        value: staff.fullName,
        label: staff.fullName,
        id: staff.id,
        shortName: staff.shortName
    }),
    vehicle: (vehicle) => ({
        value: vehicle.licensePlate,
        label: vehicle.licensePlate,
        id: vehicle.id
    }),
    customer: (customer) => ({
        value: customer.id,
        label: `${customer.representativeName} - ${customer.companyName}`,
        id: customer.id,
        representativeName: customer.representativeName,
        companyName: customer.companyName
    })
};

// Validation utilities
export const validateForm = (state) => {
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

export const validateDistance = (value, validationErrors) => {
    const distanceValue = Number(value);
    if (!distanceValue || distanceValue <= 0) {
        validationErrors.value.distance = 'Vui lòng nhập quãng đường hợp lệ';
        return false;
    }
    return true;
};

// Helper functions
export const getRelatedIds = (state) => {
    const selectedDriver = state.staffList.value.find((staff) => staff.value === state.tripData.value.driverName);
    const selectedAssistant = state.staffList.value.find((staff) => staff.value === state.tripData.value.assistantDriverName);
    const selectedVehicle = state.vehicles.value.find((vehicle) => vehicle.value === state.tripData.value.vehicleLicenseNumber);
    const selectedCustomer = state.customerList.value.find((customer) => customer.value === state.tripData.value.customerName);

    return {
        driverId: selectedDriver?.id || null,
        driverShortName: selectedDriver?.shortName || null,
        assistantDriverId: selectedAssistant?.id || null,
        assistantDriverShortName: selectedAssistant?.shortName || null,
        vehicleId: selectedVehicle?.id || null,
        customerInfo: selectedCustomer || null
    };
};

export const prepareTripData = (state, driverId, driverShortName, assistantDriverId, assistantDriverShortName, vehicleId, customerInfo) => {
    const tripData = {
        ...state.tripData.value,
        driverId,
        driverShortName,
        assistantDriverId,
        assistantDriverShortName,
        vehicleId,
        customerId: customerInfo?.id,
        companyName: customerInfo?.companyName,
        representativeName: customerInfo?.representativeName,
        updatedAt: serverTimestamp(),
        status: 'PENDING'
    };

    if (tripData.tripDate) {
        tripData.tripDate = new Date(tripData.tripDate).toISOString();
    }

    return tripData;
};

export const generateExpenseDescription = (state, customerInfo) => {
    const formatDate = (date) => {
        if (!date) return '';
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return `Chi phí chuyến đi ngày ${formatDate(state.tripData.value.tripDate)} - ${customerInfo?.companyName || ''} - ${state.tripData.value.startingPoint} - ${state.tripData.value.endingPoint}`;
};

// Expense handlers
export const expenseHandlers = {
    create: async (state, tripId, driverId, amount, customerInfo) => {
        const description = generateExpenseDescription(state, customerInfo);
        await expenseService.createExpenseWithoutBalanceUpdate(amount, state.tripData.value.tripDate ? new Date(state.tripData.value.tripDate) : new Date(), 'Chi phí chuyến đi', state.tripData.value.driverName, driverId, tripId, description);
    },

    update: async (state, tripId, driverId, customerInfo) => {
        const totalExpenseAmount = Object.values(state.tripData.value.expenses).reduce((sum, value) => sum + (value || 0), 0);

        const expenseQuery = query(collection(db, 'expenses'), where('tripId', '==', tripId));
        const expenseSnapshot = await getDocs(expenseQuery);

        if (expenseSnapshot.empty && totalExpenseAmount > 0) {
            await expenseHandlers.create(state, tripId, driverId, totalExpenseAmount, customerInfo);
        } else if (!expenseSnapshot.empty) {
            const expenseDoc = expenseSnapshot.docs[0];
            if (totalExpenseAmount > 0) {
                const description = generateExpenseDescription(state, customerInfo);
                await expenseService.updateExpenseAndBalance(
                    expenseDoc.id,
                    totalExpenseAmount,
                    state.tripData.value.tripDate ? new Date(state.tripData.value.tripDate) : new Date(),
                    'Chi phí chuyến đi',
                    state.tripData.value.driverName,
                    driverId,
                    tripId,
                    description
                );
            } else {
                await deleteDoc(expenseDoc.ref);
            }
        }
    }
};

// Composables
export const useTripList = (statusMode = null) => {
    const toast = useToast();
    const router = useRouter();
    const route = useRoute();

    const state = {
        driverFilterValue: ref(''),
        assistantFilterValue: ref(''),
        customerFilterValue: ref(''),
        vehicleLicenseNumberFilter: ref(''),
        startDateFilter: ref(null),
        endDateFilter: ref(null),
        allTrips: ref([]),
        filteredTrips: ref([]),
        loading: ref(false),
        staffList: ref([]),
        customerList: ref([]),
        vehicleList: ref([]),
        approvingTripId: ref(null),
        statusMode: statusMode // 'PENDING', 'NON_PENDING', or null for all
    };

    const fetchData = {
        trips: async () => {
            state.loading.value = true;
            try {
                const querySnapshot = await getDocs(collection(db, 'trips'));
                state.allTrips.value = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                applyFilters();
            } catch (error) {
                // Error fetching trips
                toast.add({
                    severity: 'error',
                    summary: 'Lỗi',
                    detail: 'Không thể tải danh sách chuyến đi',
                    life: 3000
                });
            } finally {
                state.loading.value = false;
            }
        },
        staff: async () => {
            state.staffList.value = await fetchFirestoreData('staff', 'status', 'active', transformers.staff);
        },
        customers: async () => {
            state.customerList.value = await fetchFirestoreData('customers', 'status', 'active', transformers.customer);
        },
        vehicles: async () => {
            state.vehicleList.value = await fetchFirestoreData('vehicles', 'status', 'ACTIVE', transformers.vehicle);
        }
    };

    const applyFilters = () => {
        let result = [...state.allTrips.value];

        // Apply status mode filter first
        if (state.statusMode === 'PENDING') {
            // Only show PENDING trips
            result = result.filter((trip) => trip.status === 'PENDING');
        } else if (state.statusMode === 'NON_PENDING') {
            // Only show WAITING_FOR_PRICE or PRICED trips
            result = result.filter((trip) => trip.status === 'WAITING_FOR_PRICE' || trip.status === 'PRICED');
        }

        if (state.driverFilterValue.value) {
            result = result.filter((trip) => trip.driverName === state.driverFilterValue.value);
        }

        if (state.assistantFilterValue.value) {
            result = result.filter((trip) => trip.assistantDriverName === state.assistantFilterValue.value);
        }

        if (state.customerFilterValue.value) {
            result = result.filter((trip) => trip.customerId === state.customerFilterValue.value);
        }

        if (state.vehicleLicenseNumberFilter.value) {
            result = result.filter((trip) => trip.vehicleLicenseNumber === state.vehicleLicenseNumberFilter.value);
        }

        if (state.startDateFilter.value || state.endDateFilter.value) {
            result = result.filter((trip) => {
                if (!trip.tripDate) return false;
                const tripDate = new Date(trip.tripDate);
                tripDate.setHours(0, 0, 0, 0);

                if (state.startDateFilter.value) {
                    const startDate = new Date(state.startDateFilter.value);
                    startDate.setHours(0, 0, 0, 0);
                    if (tripDate < startDate) return false;
                }

                if (state.endDateFilter.value) {
                    const endDate = new Date(state.endDateFilter.value);
                    endDate.setHours(0, 0, 0, 0);
                    if (tripDate > endDate) return false;
                }

                return true;
            });
        }

        state.filteredTrips.value = result;
    };

    watch([state.driverFilterValue, state.assistantFilterValue, state.customerFilterValue, state.vehicleLicenseNumberFilter, state.startDateFilter, state.endDateFilter], applyFilters);

    const approveTrip = async (tripId) => {
        state.approvingTripId.value = tripId;
        try {
            // First, get the trip data to check expenses
            const tripDoc = await getDoc(doc(db, 'trips', tripId));
            if (!tripDoc.exists()) {
                throw new Error('Trip not found');
            }

            const tripData = tripDoc.data();

            // Check if there are expenses
            const totalExpenseAmount = Object.values(tripData.expenses || {}).reduce((sum, value) => sum + (value || 0), 0);

            // Update trip status to WAITING_FOR_PRICE
            await updateDoc(doc(db, 'trips', tripId), {
                status: 'WAITING_FOR_PRICE',
                approvedAt: new Date().toISOString()
            });

            // Check if there's an existing expense for this trip
            const expenseQuery = query(collection(db, 'expenses'), where('tripId', '==', tripId));
            const expenseSnapshot = await getDocs(expenseQuery);

            // If no expense exists but there should be one, create it
            if (expenseSnapshot.empty && totalExpenseAmount > 0) {
                // Get driver information
                const driverId = tripData.driverId;
                const driverName = tripData.driverName;

                if (!driverId || !driverName) {
                    throw new Error('Missing driver information');
                }

                // Create expense
                const description = `Chi phí chuyến đi ngày ${new Date(tripData.tripDate).toLocaleDateString('vi-VN')} - ${tripData.companyName || ''} - ${tripData.startingPoint} - ${tripData.endingPoint}`;

                await expenseService.createExpenseWithoutBalanceUpdate(totalExpenseAmount, tripData.tripDate ? new Date(tripData.tripDate) : new Date(), 'Chi phí chuyến đi', driverName, driverId, tripId, description);
            }

            // Update balance for trip expenses
            await balanceService.updateBalanceForTripExpenses(tripId);

            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã duyệt chuyến xe thành công',
                life: 3000
            });
            await fetchData.trips();
        } catch (error) {
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

    const setPriced = async (tripId, price) => {
        try {
            if (!price || price <= 0) {
                throw new Error('Giá chuyến đi phải lớn hơn 0');
            }

            await updateDoc(doc(db, 'trips', tripId), {
                status: 'PRICED',
                price: price,
                pricedAt: new Date().toISOString()
            });

            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã báo giá chuyến xe thành công',
                life: 3000
            });
            await fetchData.trips();
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: error.message || 'Không thể báo giá chuyến xe',
                life: 3000
            });
        }
    };

    return {
        ...state,
        fetchData,
        approveTrip,
        setPriced
    };
};

export const useTripEdit = (tripId) => {
    const router = useRouter();
    const toast = useToast();

    const state = {
        loading: ref(false),
        saving: ref(false),
        errorMessage: ref(''),
        submitted: ref(false),
        validationErrors: ref({}),
        vehicles: ref([]),
        staffList: ref([]),
        customerList: ref([]),
        tripData: ref({ ...DEFAULT_TRIP_DATA }),
        deleteDialog: ref(false)
    };

    const fetchData = {
        staff: async () => {
            state.staffList.value = await fetchFirestoreData('staff', 'status', 'active', transformers.staff);
        },
        vehicles: async () => {
            state.vehicles.value = await fetchFirestoreData('vehicles', 'status', 'ACTIVE', transformers.vehicle);
        },
        customers: async () => {
            state.customerList.value = await fetchFirestoreData('customers', 'status', 'active', transformers.customer);
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
        if (!validateForm(state)) return;

        state.saving.value = true;
        state.errorMessage.value = '';

        try {
            const relatedIds = getRelatedIds(state);
            const tripRef = doc(db, 'trips', tripId);
            const tripData = prepareTripData(state, ...Object.values(relatedIds));

            await updateDoc(tripRef, tripData);
            await expenseHandlers.update(state, tripId, relatedIds.driverId, relatedIds.customerInfo);

            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã cập nhật thông tin chuyến đi',
                life: 3000
            });
            router.push('/trip/list');
        } catch (error) {
            // Error updating trip
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
            // Error deleting trip
            toast.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không thể xóa chuyến đi',
                life: 3000
            });
        }
    };

    return {
        ...state,
        fetchData,
        updateTrip,
        deleteTrip,
        router,
        statusOptions: Object.entries(STATUS_TRANSLATIONS).map(([value, { label }]) => ({ label, value }))
    };
};

export const useTripAdd = () => {
    const router = useRouter();
    const toast = useToast();

    const state = {
        loading: ref(false),
        saving: ref(false),
        errorMessage: ref(''),
        submitted: ref(false),
        validationErrors: ref({}),
        vehicles: ref([]),
        staffList: ref([]),
        customerList: ref([]),
        tripData: ref({ ...DEFAULT_TRIP_DATA })
    };

    const fetchData = {
        staff: async () => {
            state.staffList.value = await fetchFirestoreData('staff', 'status', 'active', transformers.staff);
        },
        vehicles: async () => {
            state.vehicles.value = await fetchFirestoreData('vehicles', 'status', 'ACTIVE', transformers.vehicle);
        },
        customers: async () => {
            state.customerList.value = await fetchFirestoreData('customers', 'status', 'active', transformers.customer);
        }
    };

    const createTrip = async () => {
        if (!validateForm(state)) return;

        state.saving.value = true;
        state.errorMessage.value = '';

        try {
            const relatedIds = getRelatedIds(state);
            const tripData = prepareTripData(state, ...Object.values(relatedIds));
            tripData.createdAt = serverTimestamp();

            const tripRef = await addDoc(collection(db, 'trips'), tripData);
            await expenseHandlers.update(state, tripRef.id, relatedIds.driverId, relatedIds.customerInfo);

            toast.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã tạo chuyến đi mới. Vui lòng chờ phê duyệt.',
                life: 3000
            });
            router.push('/trip/list');
        } catch (error) {
            // Error creating trip
            state.errorMessage.value = 'Không thể tạo chuyến đi mới. Vui lòng thử lại.';
        } finally {
            state.saving.value = false;
        }
    };

    return {
        ...state,
        fetchData,
        createTrip,
        statusOptions: Object.entries(STATUS_TRANSLATIONS).map(([value, { label }]) => ({ label, value }))
    };
};
