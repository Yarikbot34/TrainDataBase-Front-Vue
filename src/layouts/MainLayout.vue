<script setup>
import { ref } from "vue";
import { RouterView } from "vue-router";
import AppSidebar from "../components/AppSidebar.vue";

const sidebarCollapsed = ref(false);
</script>

<template>
  <div
      class="application-layout"
      :class="{ 'application-layout--sidebar-collapsed': sidebarCollapsed }">
    <AppSidebar @update:collapsed="sidebarCollapsed = $event" />

    <main class="application-layout__content">
      <RouterView />
    </main>
  </div>
</template>
