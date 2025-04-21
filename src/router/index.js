import AppLayout from '@/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
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
                    path: '/',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue')
                },
                {
                    path: '/tripinput',
                    name: 'TripInput',
                    component: () => import('@/views/TripInput.vue')
                },
                {
                    path: '/TripByStaffName',
                    name: 'TripByStaffName',
                    component: () => import('@/views/TripByStaffName.vue')
                },
                {
                    path: '/TripList',
                    name: 'TripList',
                    component: () => import('@/views/TripList.vue')
                },
                {
                    path: '/CustomerList',
                    name: 'CustomerList',
                    component: () => import('@/views/customer/List.vue')
                },
                {
                    path: '/CustomerAdd',
                    name: 'CustomerAdd',
                    component: () => import('@/views/customer/Add.vue')
                }
            ]
        },
        {
            path: '/landing',
            name: 'landing',
            component: () => import('@/views/pages/Landing.vue')
        },
        {
            path: '/pages/notfound',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue')
        },

        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue')
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/views/pages/auth/Access.vue')
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue')
        }
    ]
});

// Navigation guard to check authentication
router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore();

    // Wait for auth to initialize before proceeding
    if (authStore.loading) {
        // You might want to show a loading screen here
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
        // Check if the route requires authentication
        if (to.matched.some((record) => record.meta.requiresAuth)) {
            // Check if user is authenticated
            if (!authStore.isAuthenticated) {
                // Redirect to login page
                next({ name: 'login', query: { redirect: to.fullPath } });
            } else {
                // User is authenticated, proceed
                next();
            }
        } else {
            // Route doesn't require authentication
            // If user is already logged in and tries to access login page, redirect to dashboard
            if (authStore.isAuthenticated && to.name === 'login') {
                next({ name: 'dashboard' });
            } else {
                // Otherwise proceed normally
                next();
            }
        }
    }
});

export default router;
