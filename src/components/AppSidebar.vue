<script setup>
import {
  RouterLink,
  useRouter
} from "vue-router";

import {
  useAuth
} from "../stores/auth";

const router = useRouter();

const auth = useAuth();
const { isAdmin } = auth;

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
        aria-label="Основная навигация">
      <RouterLink to="/routes">
        Маршруты
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