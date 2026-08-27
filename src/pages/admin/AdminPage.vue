<script setup>
const adminSections = Object.freeze([
  {
    routeName: "admin-routes",
    title: "Управление маршрутами",
    description:
        "Создание, редактирование и удаление маршрутов."
  },
  {
    routeName: "admin-trains",
    title: "Управление поездами",
    description:
        "Создание, редактирование и удаление поездов."
  },
  {
    routeName: "admin-stations",
    title: "Управление станциями",
    description:
        "Создание, редактирование и удаление станций."
  },
  {
    routeName: "admin-transactions",
    title: "Просмотр транзакций",
    description:
        "Просмотр истории административных операций."
  }
]);
</script>

<template>
  <main class="admin-page">
    <header class="page-header">
      <div>
        <div class="breadcrumbs">
          <span>
            База данных маршрутов
          </span>

          <span>/</span>

          <strong>
            Администрирование
          </strong>
        </div>

        <h1>
          Администрирование
        </h1>

        <p>
          Выберите необходимый раздел управления
          системой.
        </p>
      </div>
    </header>

    <section class="admin-menu">
      <RouterLink
          v-for="section in adminSections"
          :key="section.routeName"
          class="admin-menu__item"
          :to="{ name: section.routeName }">
        <span class="admin-menu__content">
          <strong>
            {{ section.title }}
          </strong>

          <span>
            {{ section.description }}
          </span>
        </span>

        <span
            class="admin-menu__arrow"
            aria-hidden="true">
          →
        </span>
      </RouterLink>
    </section>
  </main>
</template>