<script setup>
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  computed,
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

const emit = defineEmits(["update:collapsed"]);

const auth = useAuth();
const { isAdmin } = auth;

const collapsed = ref(false);

const navigationItems = computed(() => {
  const items = [
    {
      to: "/routes",
      label: "Маршруты",
      icon: "route",
      path: "M3 17.5 8.5 12 13 16.5 21 8.5M16 8.5h5v5"
    },
    {
      to: "/trains",
      label: "Поезда",
      icon: "train",
      path: "M5 18V6.5C5 4.6 8.1 3 12 3s7 1.6 7 3.5V18M5 9h14M8 21l2-3h4l2 3M8 13h.01M16 13h.01"
    },
    {
      to: "/statistics",
      label: "Статистика",
      icon: "statistics",
      path: "M4 19V5M4 19h17M8 16v-4M12 16V8M16 16v-6M20 16V4"
    },
    {
      to: "/import",
      label: "Импорт файлов",
      icon: "import",
      path: "M12 3v11M8 10l4 4 4-4M5 17v3h14v-3"
    },
    {
      to: "/map/view",
      label: "Просмотр схемы",
      icon: "map",
      path: "M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5ZM9 4v13.5M15 6.5V20"
    }
  ];

  if (isAdmin.value) {
    items.push({
      to: "/admin",
      label: "Администрирование",
      icon: "admin",
      path: "M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3ZM9 12l2 2 4-4"
    });
  }

  return items;
});

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

function setCollapsed(value) {
  if (collapsed.value === value) {
    return;
  }

  collapsed.value = value;
  emit("update:collapsed", value);
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
  <aside
      class="sidebar"
      :class="{ 'sidebar--collapsed': collapsed }"
      @mouseenter="setCollapsed(false)"
      @mouseleave="setCollapsed(true)">
    <div class="sidebar__brand">
      <span class="sidebar__brand-label">База данных маршрутов</span>
    </div>

    <nav
        class="sidebar__navigation"
        aria-label="Основная навигация"
        ref="navigation">
      <span
          class="sidebar__active-indicator"
          aria-hidden="true"
          :style="activeIndicatorStyle" />

      <RouterLink
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          :title="collapsed ? item.label : undefined">
        <svg class="sidebar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="item.path" />
        </svg>
        <span class="sidebar__link-label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <button
      class="sidebar__logout"
      type="button"
      :title="collapsed ? 'Выйти' : undefined"
      @click="logout">
      <svg class="sidebar__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 8V5H4v14h10v-3M11 12h9M17 8l3 4-3 4" />
      </svg>
      <span class="sidebar__link-label">Выйти</span>
    </button>
  </aside>
</template>
