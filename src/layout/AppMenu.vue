<script setup>
import { ref } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'Chức năng',
        items: [
            { label: 'Thêm chuyến', icon: 'pi pi-fw pi-id-card', to: '/TripInput' },
            { label: 'Lọc theo tên nhân viên', icon: 'pi pi-fw pi pi-user', to: '/TripByStaffName' },
            { label: 'Danh sách chuyến xe', icon: 'pi pi-fw pi pi-user', to: '/TripList', class: 'rotated-icon' },
            { label: 'Danh sách khách hàng', icon: 'pi pi-fw pi pi-user', to: '/CustomerList', class: 'rotated-icon' },
            { label: 'Thêm khách hàng', icon: 'pi pi-fw pi-user-plus', to: '/CustomerAdd' }
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
