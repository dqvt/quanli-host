import AppLayout from '@/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/rules'
        },
        {
            path: '/',
            component: AppLayout,
            meta: { requiresAuth: true },
            children: [
                // Rules page
                {
                    path: '/rules',
                    name: 'Rules',
                    component: () => import('@/components/Rules.vue')
                },

                // Trip routes
                {
                    path: '/trip/list',
                    name: 'TripList',
                    component: () => import('@/components/TripList.vue')
                },

                {
                    path: '/trip/add',
                    name: 'TripAdd',
                    component: () => import('@/components/TripAdd.vue'),
                    beforeEnter: (_, from, next) => {
                        // Only allow access if coming from the trip list page
                        if (from.path === '/trip/list') {
                            next();
                        } else {
                            // Redirect to trip list page with a notification
                            next({
                                path: '/trip/list',
                                query: { redirected: 'true' }
                            });
                        }
                    }
                },

                {
                    path: '/trip/edit/:id',
                    name: 'TripEdit',
                    component: () => import('@/components/TripEdit.vue')
                },

                // Expense routes have been removed

                // Customer routes
                {
                    path: '/customer/list',
                    name: 'CustomerList',
                    component: () => import('@/components/CustomerList.vue')
                },
                {
                    path: '/customer/add',
                    name: 'CustomerAdd',
                    component: () => import('@/components/CustomerAdd.vue'),
                    beforeEnter: (_, from, next) => {
                        // Only allow access if coming from the customer list page
                        if (from.path === '/customer/list') {
                            next();
                        } else {
                            // Redirect to customer list page with a notification
                            next({
                                path: '/customer/list',
                                query: { redirected: 'true' }
                            });
                        }
                    }
                },
                {
                    path: '/customer/edit/:id',
                    name: 'CustomerEdit',
                    component: () => import('@/components/CustomerEdit.vue'),
                    meta: { requiresAuth: true }
                },

                // Staff routes
                {
                    path: '/staff/list',
                    name: 'StaffList',
                    component: () => import('@/components/staff/List.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/staff/add',
                    name: 'StaffAdd',
                    component: () => import('@/components/staff/Add.vue'),
                    meta: { requiresAuth: true },
                    beforeEnter: (_, from, next) => {
                        // Only allow access if coming from the staff list page
                        if (from.path === '/staff/list') {
                            next();
                        } else {
                            // Redirect to staff list page with a notification
                            next({
                                path: '/staff/list',
                                query: { redirected: 'true' }
                            });
                        }
                    }
                },
                {
                    path: '/staff/edit/:id',
                    name: 'StaffEdit',
                    component: () => import('@/components/staff/Edit.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/staff/salary/:id',
                    name: 'StaffSalary',
                    component: () => import('@/components/staff/Salary.vue'),
                    meta: { requiresAuth: true }
                },

                // Vehicle routes
                {
                    path: '/vehicle/list',
                    name: 'VehicleList',
                    component: () => import('@/components/VehicleList.vue')
                },
                {
                    path: '/vehicle/add',
                    name: 'VehicleAdd',
                    component: () => import('@/components/VehicleAdd.vue'),
                    beforeEnter: (_, from, next) => {
                        // Only allow access if coming from the vehicle list page
                        if (from.path === '/vehicle/list') {
                            next();
                        } else {
                            // Redirect to vehicle list page with a notification
                            next({
                                path: '/vehicle/list',
                                query: { redirected: 'true' }
                            });
                        }
                    }
                },
                {
                    path: '/vehicle/edit/:id',
                    name: 'VehicleEdit',
                    component: () => import('@/components/VehicleEdit.vue')
                },
                // Customer Debt routes
                {
                    path: '/customer/debt',
                    name: 'CustomerDebtList',
                    component: () => import('@/components/CustomerDebtList.vue')
                },
                {
                    path: '/customer/debt/:id',
                    name: 'CustomerDebtDetail',
                    component: () => import('@/components/CustomerDebtDetail.vue')
                },
                {
                    path: '/customer/trips/:id',
                    name: 'CustomerTripList',
                    component: () => import('@/components/CustomerTripList.vue')
                }
            ]
        },

        // Public routes
        {
            path: '/public/trip/add',
            name: 'PublicTripAdd',
            component: () => import('@/components/public/PublicTripInput.vue'),
            meta: { requiresAuth: false }
        },

        // Auth routes
        {
            path: '/auth/login',
            name: 'Login',
            component: () => import('@/components/auth/Login.vue')
        },
        {
            path: '/auth/access',
            name: 'AccessDenied',
            component: () => import('@/components/auth/Access.vue')
        },
        {
            path: '/auth/error',
            name: 'Error',
            component: () => import('@/components/auth/Error.vue')
        }
    ]
});

// Navigation guard for trip edit/add pages
router.beforeEach((to, from, next) => {
    // Check if navigating away from trip edit or add page
    if ((from.path.includes('/trip/edit/') || from.path === '/trip/add') && to.path !== from.path) {
        // Show confirmation dialog
        const confirmed = confirm('Bạn có chắc muốn rời đi?');
        if (confirmed) {
            next();
        } else {
            next(false);
        }
    } else {
        next();
    }
});

// Authentication guard
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
                next({ name: 'Rules' });
            } else {
                next();
            }
        }
    }
});

export default router;
