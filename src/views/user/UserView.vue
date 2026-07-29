<template>
    <div class="h-screen bg-cover bg-default overflow-auto"
        :style="{ backgroundImage: `url(${bg})`, '--el-color-primary': '#2D8DD2' }">
        <template v-if="isLoginPage">
            <RouterView />
        </template>
        <template v-else>
            <HeaderView />
            <RouterView />
            <FooterView />
        </template>
    </div>
</template>

<script lang="ts" setup>

import bg from '@/assets/bg.png';
import { provideConfig } from '@/composables/config';
import config from '@/composables/config/config.json';
import { UserModel, provideUser } from '@/composables/user';
import { computed, reactive } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import FooterView from './FooterView.vue';
import HeaderView from './HeaderView.vue';

const route = useRoute();
const isLoginPage = computed(() => route.path === '/login');
const user = reactive<UserModel>({
    loggedIn: false,
});

provideUser(user);
provideConfig(config);
</script>

<style scoped>
/* 定义淡入淡出的过渡效果 */
.fade-enter-active,
.fade-leave-active {
    transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
