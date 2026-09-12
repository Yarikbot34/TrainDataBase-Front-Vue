<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import {
  addUser,
  deleteUser,
  editUser,
  getUserRoles,
  getUsers
} from "../../api/usersApi";

const users = ref([]);
const roles = ref([]);

const loading = ref(false);
const saving = ref(false);
const error = ref("");

const editModalOpen = ref(false);
const deleteModalOpen = ref(false);
const createModalOpen = ref(false);

const selectedUser = ref(null);

const editForm = reactive({
  id: null,
  username: "",
  role: "",
  adminPassword: ""
});

const createForm = reactive({
  username: "",
  role: "",
  password: "",
  passwordRepeat: "",
  adminPassword: ""
});

const deleteForm = reactive({
  adminPassword: ""
});

const isCreateFormValid = computed(() => {
  return Boolean(
      createForm.username.trim() &&
      createForm.role &&
      createForm.password &&
      createForm.passwordRepeat &&
      createForm.adminPassword &&
      createForm.password === createForm.passwordRepeat
  );
});

function extractItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.result)) {
    return payload.result;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

function resetEditForm() {
  editForm.id = null;
  editForm.username = "";
  editForm.role = "";
  editForm.adminPassword = "";
}

function resetCreateForm() {
  createForm.username = "";
  createForm.role = "";
  createForm.password = "";
  createForm.passwordRepeat = "";
  createForm.adminPassword = "";
}

function resetDeleteForm() {
  deleteForm.adminPassword = "";
}

function canManageUser(user) {
  return Number(user.id) !== 1;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

async function loadData() {
  loading.value = true;
  error.value = "";

  try {
    const [usersResponse, rolesResponse] = await Promise.all([
      getUsers(),
      getUserRoles()
    ]);

    users.value = extractItems(usersResponse).sort(
        (first, second) => Number(first.id) - Number(second.id)
    );

    roles.value = extractItems(rolesResponse);
  } catch (exception) {
    error.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось загрузить пользователей.";
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  resetCreateForm();
  createModalOpen.value = true;
}

function closeCreateModal() {
  createModalOpen.value = false;
  resetCreateForm();
}

function openEditModal(user) {
  if (!canManageUser(user)) {
    return;
  }

  selectedUser.value = user;

  editForm.id = user.id;
  editForm.username = user.username ?? "";
  editForm.role = user.role ?? "";
  editForm.adminPassword = "";

  editModalOpen.value = true;
}

function closeEditModal() {
  editModalOpen.value = false;
  selectedUser.value = null;
  resetEditForm();
}

function openDeleteModal(user) {
  if (!canManageUser(user)) {
    return;
  }

  selectedUser.value = user;
  resetDeleteForm();
  deleteModalOpen.value = true;
}

function closeDeleteModal() {
  deleteModalOpen.value = false;
  selectedUser.value = null;
  resetDeleteForm();
}

async function submitCreate() {
  if (!isCreateFormValid.value || saving.value) {
    return;
  }

  saving.value = true;
  error.value = "";

  try {
    await addUser(createForm);
    closeCreateModal();
    await loadData();
  } catch (exception) {
    error.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось добавить пользователя.";
  } finally {
    saving.value = false;
  }
}

async function submitEdit() {
  if (
      saving.value ||
      !editForm.username.trim() ||
      !editForm.role ||
      !editForm.adminPassword
  ) {
    return;
  }

  saving.value = true;
  error.value = "";

  try {
    await editUser(editForm);
    closeEditModal();
    await loadData();
  } catch (exception) {
    error.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось изменить пользователя.";
  } finally {
    saving.value = false;
  }
}

async function submitDelete() {
  if (
      saving.value ||
      !selectedUser.value ||
      !deleteForm.adminPassword
  ) {
    return;
  }

  saving.value = true;
  error.value = "";

  try {
    await deleteUser(
        selectedUser.value.id,
        deleteForm.adminPassword
    );

    closeDeleteModal();
    await loadData();
  } catch (exception) {
    error.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось удалить пользователя.";
  } finally {
    saving.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <section class="users-page">
    <div class="page-header">
      <div>
        <p class="breadcrumbs">Главная / Администрирование / Пользователи</p>

        <div class="title-row">
          <h1>Пользователи</h1>

          <button
              class="add-button"
              type="button"
              title="Добавить пользователя"
              aria-label="Добавить пользователя"
              @click="openCreateModal"
          >
            +
          </button>
        </div>
      </div>

      <button
          class="secondary-button"
          type="button"
          :disabled="loading"
          @click="loadData"
      >
        {{ loading ? "Загрузка…" : "Обновить" }}
      </button>
    </div>

    <p v-if="error" class="error-message">
      {{ error }}
    </p>

    <div class="table-wrapper">
      <table class="users-table">
        <thead>
        <tr>
          <th>Id</th>
          <th>Имя пользователя</th>
          <th>Права пользователя</th>
          <th>Время добавления</th>
          <th>Редактирование</th>
          <th>Удаление</th>
        </tr>
        </thead>

        <tbody>
        <tr v-if="loading">
          <td colspan="6" class="empty-cell">
            Загрузка пользователей…
          </td>
        </tr>

        <tr v-else-if="users.length === 0">
          <td colspan="6" class="empty-cell">
            Пользователи не найдены.
          </td>
        </tr>

        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.username || "—" }}</td>
          <td>{{ user.role || "—" }}</td>
          <td>{{ formatDate(user.dateCreated) }}</td>

          <td>
            <button
                v-if="canManageUser(user)"
                class="icon-button"
                type="button"
                title="Редактировать пользователя"
                aria-label="Редактировать пользователя"
                @click="openEditModal(user)"
            >
              ✎
            </button>

            <span v-else>—</span>
          </td>

          <td>
            <button
                v-if="canManageUser(user)"
                class="icon-button danger"
                type="button"
                title="Удалить пользователя"
                aria-label="Удалить пользователя"
                @click="openDeleteModal(user)"
            >
              ×
            </button>

            <span v-else>—</span>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </section>

  <Teleport to="body">
    <div
        v-if="createModalOpen"
        class="modal-overlay"
        @click.self="closeCreateModal"
    >
      <form class="modal-card" @submit.prevent="submitCreate">
        <h2>Добавление пользователя</h2>

        <label>
          Имя пользователя
          <input
              v-model.trim="createForm.username"
              type="text"
              required
              autocomplete="username"
          />
        </label>

        <label>
          Роль пользователя
          <select v-model="createForm.role" required>
            <option disabled value="">Выберите роль</option>
            <option v-for="role in roles" :key="role" :value="role">
              {{ role }}
            </option>
          </select>
        </label>

        <label>
          Пароль пользователя
          <input
              v-model="createForm.password"
              type="password"
              required
              autocomplete="new-password"
          />
        </label>

        <label>
          Повторение пароля
          <input
              v-model="createForm.passwordRepeat"
              type="password"
              required
              autocomplete="new-password"
          />
        </label>

        <p
            v-if="
            createForm.passwordRepeat &&
            createForm.password !== createForm.passwordRepeat
          "
            class="field-error"
        >
          Пароли пользователя не совпадают.
        </p>

        <label>
          Пароль администратора
          <input
              v-model="createForm.adminPassword"
              type="password"
              required
              autocomplete="current-password"
          />
        </label>

        <div class="modal-actions">
          <button
              class="secondary-button"
              type="button"
              :disabled="saving"
              @click="closeCreateModal"
          >
            Отмена
          </button>

          <button
              class="primary-button"
              type="submit"
              :disabled="saving || !isCreateFormValid"
          >
            {{ saving ? "Сохранение…" : "Подтвердить" }}
          </button>
        </div>
      </form>
    </div>

    <div
        v-if="editModalOpen"
        class="modal-overlay"
        @click.self="closeEditModal"
    >
      <form class="modal-card" @submit.prevent="submitEdit">
        <h2>Редактирование пользователя</h2>

        <label>
          Имя пользователя
          <input
              v-model.trim="editForm.username"
              type="text"
              required
              autocomplete="username"
          />
        </label>

        <label>
          Роль пользователя
          <select v-model="editForm.role" required>
            <option disabled value="">Выберите роль</option>
            <option v-for="role in roles" :key="role" :value="role">
              {{ role }}
            </option>
          </select>
        </label>

        <label>
          Пароль администратора
          <input
              v-model="editForm.adminPassword"
              type="password"
              required
              autocomplete="current-password"
          />
        </label>

        <div class="modal-actions">
          <button
              class="secondary-button"
              type="button"
              :disabled="saving"
              @click="closeEditModal"
          >
            Отмена
          </button>

          <button
              class="primary-button"
              type="submit"
              :disabled="
              saving ||
              !editForm.username ||
              !editForm.role ||
              !editForm.adminPassword
            "
          >
            {{ saving ? "Сохранение…" : "Подтвердить" }}
          </button>
        </div>
      </form>
    </div>

    <div
        v-if="deleteModalOpen"
        class="modal-overlay"
        @click.self="closeDeleteModal"
    >
      <form class="modal-card" @submit.prevent="submitDelete">
        <h2>Удаление пользователя</h2>

        <div class="user-info">
          <p>
            <strong>Имя пользователя:</strong>
            {{ selectedUser?.username }}
          </p>

          <p>
            <strong>Роль пользователя:</strong>
            {{ selectedUser?.role }}
          </p>
        </div>

        <label>
          Пароль администратора
          <input
              v-model="deleteForm.adminPassword"
              type="password"
              required
              autofocus
              autocomplete="current-password"
          />
        </label>

        <div class="modal-actions">
          <button
              class="secondary-button"
              type="button"
              :disabled="saving"
              @click="closeDeleteModal"
          >
            Отмена
          </button>

          <button
              class="danger-button"
              type="submit"
              :disabled="saving || !deleteForm.adminPassword"
          >
            {{ saving ? "Удаление…" : "Подтвердить" }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.users-page {
  padding: 24px;
}

.page-header,
.title-row,
.modal-actions {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.title-row {
  gap: 12px;
}

h1,
h2,
p {
  margin: 0;
}

.breadcrumbs {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 14px;
}

.add-button,
.icon-button,
.primary-button,
.secondary-button,
.danger-button {
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
}

.add-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
}

.add-button,
.primary-button {
  background: #2563eb;
  color: #fff;
}

.add-button {
  font-size: 24px;
  line-height: 1;
}

.secondary-button {
  padding: 9px 14px;
  background: #e5e7eb;
  color: #111827;
}

.primary-button,
.danger-button {
  padding: 9px 14px;
  color: #fff;
}

.danger-button,
.icon-button.danger {
  background: #dc2626;
}

.icon-button {
  background: #e5e7eb;
  color: #111827;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.users-table th {
  background: #f9fafb;
  white-space: nowrap;
}

.empty-cell {
  padding: 28px !important;
  text-align: center !important;
  color: #6b7280;
}

.error-message,
.field-error {
  color: #b91c1c;
}

.error-message {
  margin-bottom: 16px;
}

.field-error {
  margin-top: -8px;
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(17 24 39 / 55%);
}

.modal-card {
  display: grid;
  width: min(100%, 440px);
  gap: 16px;
  padding: 24px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 48px rgb(0 0 0 / 25%);
}

.modal-card label {
  display: grid;
  gap: 6px;
  color: #374151;
  font-weight: 600;
}

.modal-card input,
.modal-card select {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font: inherit;
  font-weight: 400;
}

.user-info {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  background: #f9fafb;
}

.modal-actions {
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>