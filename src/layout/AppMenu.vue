<script setup>
import { ref } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'Home',
        items: [{ label: 'Tổng quản lý', icon: 'pi pi-fw pi-home', to: '/' }]
    },
    {
        label: 'Chức năng',
        items: [
            { label: 'Thêm chuyến', icon: 'pi pi-fw pi-id-card', to: '/uikit/TripInput' },
            { label: 'Lọc theo tên nhân viên', icon: 'pi pi-fw pi pi-user', to: '/uikit/TripByStaffName' },
            { label: 'Lọc theo tên khách hàng', icon: 'pi pi-fw pi pi-user', to: '/uikit/TripByCustomerName', class: 'rotated-icon' }
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
