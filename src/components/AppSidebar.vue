<script setup>
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "vue";

import {
  RouterLink,
  useRoute,
  useRouter
} from "vue-router";

import {
  useAuth
} from "../stores/auth";

const router = useRouter();
const route = useRoute();

const auth = useAuth();
const { isAdmin } = auth;

const navigation = ref(null);
const activeIndicatorStyle = ref({
  opacity: 0,
  transform: "translateY(0px)",
  height: "0px"
});

let navigationResizeObserver;

function updateActiveIndicator() {
  const navigationElement = navigation.value;
  const activeLink = navigationElement?.querySelector(
    ".router-link-active"
  );

  if (!activeLink) {
    activeIndicatorStyle.value = {
      ...activeIndicatorStyle.value,
      opacity: 0
    };
    return;
  }

  activeIndicatorStyle.value = {
    opacity: 1,
    transform: `translateY(${activeLink.offsetTop}px)`,
    height: `${activeLink.offsetHeight}px`
  };
}

function updateActiveIndicatorAfterRender() {
  nextTick(updateActiveIndicator);
}

onMounted(() => {
  updateActiveIndicatorAfterRender();

  navigationResizeObserver = new ResizeObserver(
    updateActiveIndicator
  );
  navigationResizeObserver.observe(navigation.value);
});

watch(
  () => route.fullPath,
  updateActiveIndicatorAfterRender
);

onBeforeUnmount(() => {
  navigationResizeObserver?.disconnect();
});

function logout() {
  auth.logout();
  router.replace("/login");
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      База данных маршрутов
    </div>

    <nav
        class="sidebar__navigation"
        aria-label="Основная навигация"
        ref="navigation">
      <span
          class="sidebar__active-indicator"
          aria-hidden="true"
          :style="activeIndicatorStyle" />

      <RouterLink to="/routes">
        Маршруты
      </RouterLink>

      <RouterLink to="/trains">
        Поезда
      </RouterLink>

      <RouterLink to="/statistics">
        Статистика
      </RouterLink>

      <RouterLink to="/import">
        Импорт файлов
      </RouterLink>

      <RouterLink to="/map/editor">
        Редактор схемы
      </RouterLink>

      <RouterLink to="/map/view">
        Просмотр схемы
      </RouterLink>

      <!--
        Ссылка отсутствует в DOM для всех
        пользователей, кроме администратора.
      -->
      <RouterLink
          v-if="isAdmin"
          to="/admin">
        Администрирование
      </RouterLink>
    </nav>

    <button
        class="sidebar__logout"
        type="button"
        @click="logout">
      Выйти
    </button>
  </aside>
</template>
