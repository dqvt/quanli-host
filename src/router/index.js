import AppLayout from '@/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/trip/list'
        },
        {
            path: '/',
            component: AppLayout,
            meta: { requiresAuth: true },
            children: [
                // Trip routes
                {
                    path: '/trip/list',
                    name: 'TripList',
                    component: () => import('@/views/trip/List.vue')
                },
                {
                    path: '/trip/add',
                    name: 'TripAdd',
                    component: () => import('@/views/trip/Add.vue')
                },
                {
                    path: '/trip/by-staff',
                    name: 'TripByStaff',
                    component: () => import('@/views/trip/ByStaff.vue')
                },
                {
                    path: '/trip/pending',
                    name: 'TripPending',
                    component: () => import('@/views/trip/Pending.vue')
                },

                // Customer routes
                {
                    path: '/customer/list',
                    name: 'CustomerList',
                    component: () => import('@/views/customer/List.vue')
                },
                {
                    path: '/customer/add',
                    name: 'CustomerAdd',
                    component: () => import('@/views/customer/Add.vue')
                },
                {
                    path: '/customer/edit/:id',
                    name: 'CustomerEdit',
                    component: () => import('@/views/customer/Edit.vue'),
                    meta: { requiresAuth: true }
                },

                // Staff routes
                {
                    path: '/staff/list',
                    name: 'StaffList',
                    component: () => import('@/views/staff/List.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/staff/add',
                    name: 'StaffAdd',
                    component: () => import('@/views/staff/Add.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/staff/edit/:id',
                    name: 'StaffEdit',
                    component: () => import('@/views/staff/Edit.vue'),
                    meta: { requiresAuth: true }
                },

                // Vehicle routes
                {
                    path: '/vehicle/list',
                    name: 'VehicleList',
                    component: () => import('@/views/vehicle/List.vue')
                },
                {
                    path: '/vehicle/add',
                    name: 'VehicleAdd',
                    component: () => import('@/views/vehicle/Add.vue')
                },
                {
                    path: '/vehicle/edit/:id',
                    name: 'VehicleEdit',
                    component: () => import('@/views/vehicle/Edit.vue')
                }
            ]
        },

        // Public routes
        {
            path: '/public/trip/add',
            name: 'PublicTripAdd',
            component: () => import('@/views/public/PublicTripInput.vue'),
            meta: { requiresAuth: false }
        },

        // Auth routes
        {
            path: '/auth/login',
            name: 'Login',
            component: () => import('@/views/auth/Login.vue')
        },
        {
            path: '/auth/access',
            name: 'AccessDenied',
            component: () => import('@/views/auth/Access.vue')
        },
        {
            path: '/auth/error',
            name: 'Error',
            component: () => import('@/views/auth/Error.vue')
        }
    ]
});

// Navigation guard
router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore();

    if (authStore.loading) {
        const unwatch = authStore.$subscribe(() => {
            if (!authStore.loading) {
                unwatch();
                checkAuth();
            }
        });
    } else {
        checkAuth();
    }

    function checkAuth() {
        if (to.matched.some((record) => record.meta.requiresAuth)) {
            if (!authStore.isAuthenticated) {
                next({ name: 'Login', query: { redirect: to.fullPath } });
            } else {
                next();
            }
        } else {
            if (authStore.isAuthenticated && to.name === 'Login') {
                next({ name: 'TripList' });
            } else {
                next();
            }
        }
    }
});

export default router;
