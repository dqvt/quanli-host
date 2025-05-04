<script setup>
import { ref } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'Hướng dẫn sử dụng',
        items: [{ label: 'Quy tắc sử dụng hệ thống', icon: 'pi pi-fw pi-book', to: '/rules' }]
    },
    {
        label: 'Chức năng',
        items: [
            { label: 'Danh sách chuyến xe', icon: 'pi pi-fw pi-list', to: '/trip/list', class: 'rotated-icon' },
            { label: 'Chuyến xe chờ báo giá', icon: 'pi pi-fw pi-tag', to: '/trip/waiting-price', class: 'rotated-icon' }
        ]
    },
    {
        label: 'Quản lý xe',
        items: [{ label: 'Danh sách xe', icon: 'pi pi-fw pi-list', to: '/vehicle/list', class: 'rotated-icon' }]
    },
    {
        label: 'Quản lý thông tin khách hàng',
        items: [
            { label: 'Danh sách khách hàng', icon: 'pi pi-fw pi-users', to: '/customer/list', class: 'rotated-icon' },
            { label: 'Công nợ khách hàng', icon: 'pi pi-fw pi-money-bill', to: '/customer/debt', class: 'rotated-icon' }
        ]
    },
    {
        label: 'Quản lý nhân viên',
        items: [{ label: 'Danh sách nhân viên', icon: 'pi pi-fw pi-users', to: '/staff/list', class: 'rotated-icon' }]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
