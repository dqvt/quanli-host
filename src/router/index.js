import AppLayout from '@/layout/AppLayout.vue';
import { useAuthStore } from '@/services/auth';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: AppLayout,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '',
                    redirect: 'rules' // Remove leading slash to make it relative
                },
                {
                    path: 'rules',
                    name: 'Rules',
                    component: () => import('@/components/Rules.vue')
                },

                // Trip routes
                {
                    path: '/trip/list',
                    name: 'TripList',
                    component: () => import('@/components/trip/List.vue')
                },
                {
                    path: '/trip/waiting-price',
                    name: 'TripWaitingPrice',
                    component: () => import('@/components/trip/WaitingPriceList.vue')
                },
                {
                    path: '/trip/add',
                    name: 'TripAdd',
                    component: () => import('@/components/trip/Add.vue'),
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

                // Expense routes have been removed

                // Customer routes
                {
                    path: '/customer/list',
                    name: 'CustomerList',
                    component: () => import('@/components/customer/List.vue')
                },
                {
                    path: '/customer/add',
                    name: 'CustomerAdd',
                    component: () => import('@/components/customer/Add.vue'),
                    beforeEnter: (_, from, next) => {
                        if (from.path === '/customer/list') {
                            next();
                        } else {
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
                    component: () => import('@/components/customer/Edit.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/customer/debt',
                    name: 'CustomerDebtList',
                    component: () => import('@/components/customer/DebtList.vue')
                },
                {
                    path: '/customer/debt/:id',
                    name: 'CustomerDebtDetail',
                    component: () => import('@/components/customer/DebtDetail.vue')
                },
                {
                    path: '/customer/trips/:id',
                    name: 'CustomerTripList',
                    component: () => import('@/components/customer/TripList.vue')
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
                    component: () => import('@/components/vehicle/List.vue')
                },
                {
                    path: '/vehicle/add',
                    name: 'VehicleAdd',
                    component: () => import('@/components/vehicle/Add.vue'),
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
                    component: () => import('@/components/vehicle/Edit.vue')
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
        },
        // Catch-all route for unknown URLs
        {
            path: '/:pathMatch(.*)*',
            name: 'NotFound',
            component: () => import('@/components/Rules.vue'),
            meta: { requiresAuth: true },
            beforeEnter: (to, _from, next) => {
                console.log('NotFound component route triggered for:', to.path);
                next();
            }
        }
    ]
});

// Add a specific navigation guard for handling unknown URLs - this must be first
router.beforeEach((to, _from, next) => {
    // Log all navigation for debugging
    console.log('Navigation to:', to.path, 'Route name:', to.name, 'Matched routes:', to.matched.length);

    // Check if this is a direct access to an unknown URL (not caught by the catch-all route)
    // This can happen with certain URL patterns or when the router is not fully initialized
    if (to.matched.length === 0) {
        console.log('CRITICAL: No matching route found for:', to.path);
        const authStore = useAuthStore();

        // Force redirect to Rules or Login based on authentication
        if (!authStore.loading && authStore.isAuthenticated) {
            console.log('User is authenticated, redirecting to Rules');
            next({ name: 'Rules' });
        } else {
            console.log('User is not authenticated or still loading, redirecting to Login');
            next({ name: 'Login' });
        }
        return;
    }

    // Continue with normal navigation
    next();
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
        // Handle NotFound route - add authentication requirement
        if (to.name === 'NotFound') {
            console.log('NotFound route detected in auth guard');
            if (!authStore.isAuthenticated) {
                console.log('User not authenticated, redirecting to Login');
                next({ name: 'Login' });
                return;
            }
        }

        if (to.matched.some((record) => record.meta.requiresAuth)) {
            if (!authStore.isAuthenticated) {
                next({ name: 'Login', query: { redirect: to.fullPath } });
            } else {
                next();
            }
        } else {
            if (authStore.isAuthenticated && to.name === 'Login') {
                console.log('User is authenticated and trying to access login page, redirecting to Rules');
                next({ name: 'Rules' });
            } else {
                next();
            }
        }
    }
});

export default router;
