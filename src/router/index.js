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
                    component: () => import('@/views/rules/Rules.vue')
                },

                // Trip routes
                {
                    path: '/trip/list',
                    name: 'TripList',
                    component: () => import('@/views/trip/List.vue')
                },
                {
                    path: '/trip/add',
                    name: 'TripAdd',
                    component: () => import('@/views/trip/Add.vue'),
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
                    component: () => import('@/views/trip/Edit.vue')
                },

                // Expense routes
                {
                    path: '/expense/list',
                    name: 'ExpenseList',
                    component: () => import('@/views/expense/StaffList.vue')
                },
                {
                    path: '/expense/staff/:staffName',
                    name: 'StaffBalance',
                    component: () => import('@/views/expense/BalanceList.vue')
                },
                // Remove the '/expense/add' route

                // Customer routes
                {
                    path: '/customer/list',
                    name: 'CustomerList',
                    component: () => import('@/views/customer/List.vue')
                },
                {
                    path: '/customer/add',
                    name: 'CustomerAdd',
                    component: () => import('@/views/customer/Add.vue'),
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
                    component: () => import('@/views/vehicle/Add.vue'),
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
