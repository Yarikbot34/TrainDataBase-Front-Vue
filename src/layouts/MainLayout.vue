<script setup>
import { RouterView } from "vue-router";
import AppSidebar from "../components/AppSidebar.vue";
</script>

<template>
  <div class="application-layout">
    <AppSidebar />

    <main class="application-layout__content">
      <RouterView />
    </main>
  </div>
</template>