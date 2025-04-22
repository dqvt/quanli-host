<script setup>
import { ref } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'Chức năng',
        items: [
            { label: 'Danh sách chuyến xe', icon: 'pi pi-fw pi-list', to: '/trip/list', class: 'rotated-icon' },
            { label: 'Thêm chuyến', icon: 'pi pi-fw pi-plus', to: '/trip/add' },
            { label: 'Lọc theo tên nhân viên', icon: 'pi pi-fw pi-user', to: '/trip/by-staff' },
            { label: 'Chuyến xe chờ duyệt', icon: 'pi pi-clock', to: '/trip/pending' }
        ]
    },
    {
        label: 'Quản lý xe',
        items: [
            { label: 'Danh sách xe', icon: 'pi pi-fw pi-list', to: '/vehicle/list', class: 'rotated-icon' },
            { label: 'Thêm xe mới', icon: 'pi pi-fw pi-plus', to: '/vehicle/add' }
        ]
    },
    {
        label: 'Quản lý thông tin khách hàng',
        items: [
            { label: 'Thêm khách hàng', icon: 'pi pi-fw pi-user-plus', to: '/customer/add' },
            { label: 'Danh sách khách hàng', icon: 'pi pi-fw pi-users', to: '/customer/list', class: 'rotated-icon' }
        ]
    },
    {
        label: 'Quản lý nhân viên',
        items: [
            { label: 'Thêm nhân viên', icon: 'pi pi-fw pi-user-plus', to: '/staff/add' },
            { label: 'Danh sách nhân viên', icon: 'pi pi-fw pi-users', to: '/staff/list', class: 'rotated-icon' }
        ]
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
