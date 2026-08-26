<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../stores/auth";

const router = useRouter();
const route = useRoute();
const auth = useAuth();

const name = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");

async function submit() {
  error.value = "";

  if (!name.value.trim()) {
    error.value = "Укажите имя пользователя.";
    return;
  }

  if (!password.value) {
    error.value = "Укажите пароль.";
    return;
  }

  loading.value = true;

  try {
    await auth.login(name.value.trim(), password.value);

    const returnUrl = route.query.returnUrl;

    if (
        typeof returnUrl === "string" &&
        returnUrl.startsWith("/") &&
        !returnUrl.startsWith("//")
    ) {
      await router.replace(returnUrl);
    } else {
      await router.replace("/routes");
    }
  } catch (exception) {
    error.value =
        exception instanceof Error
            ? exception.message
            : "Ошибка авторизации.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <header class="login-card__header">
        <div class="login-card__icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a5 5 0 0 0-5 5v3H5.5A2.5 2.5 0 0 0 3 12.5v7A2.5 2.5 0 0 0 5.5 22h13a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 18.5 10H17V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3H9Zm3 4a2 2 0 0 1 1 3.732V19h-2v-1.268A2 2 0 0 1 12 14Z" />
          </svg>
        </div>

        <div>
          <h1>Вход в систему</h1>
          <p>Введите имя пользователя и пароль</p>
        </div>
      </header>

      <form class="login-form" @submit.prevent="submit">
        <div class="login-form__field">
          <label for="login-name">
            Имя пользователя
          </label>

          <input
              id="login-name"
              v-model="name"
              type="text"
              autocomplete="username"
              placeholder="Введите имя пользователя"
              :disabled="loading" />
        </div>

        <div class="login-form__field">
          <label for="login-password">
            Пароль
          </label>

          <div class="login-password">
            <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Введите пароль"
                :disabled="loading" />

            <button
                class="login-password__toggle"
                type="button"
                :aria-label="
                                showPassword
                                    ? 'Скрыть пароль'
                                    : 'Показать пароль'
                            "
                @click="showPassword = !showPassword">
              ◉
            </button>
          </div>
        </div>

        <div
            v-if="error"
            class="login-result login-result--error"
            role="alert">
          {{ error }}
        </div>

        <button
            class="login-submit"
            type="submit"
            :disabled="loading">
                    <span v-if="!loading">
                        Войти
                    </span>

          <span v-else class="login-submit__loading">
                        <span class="spinner"></span>
                        Выполняется вход…
                    </span>
        </button>
      </form>
    </section>
  </main>
</template>