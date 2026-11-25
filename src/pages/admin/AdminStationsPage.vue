<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref
} from "vue";

import {
  addStation,
  deleteStation,
  getStations,
  updateStation
} from "../../api/stationsApi";

const stations = ref([]);
const loading = ref(false);
const error = ref("");
const searchQuery = ref("");

const addForm = ref({ name: "", class: "" });
const addError = ref("");
const isAdding = ref(false);

const editingStation = ref(null);
const editForm = ref({ name: "", class: "" });
const editError = ref("");
const isSavingEdit = ref(false);
const editNameInput = ref(null);

const deletingStation = ref(null);
const deleteError = ref("");
const isDeleting = ref(false);

const contextMenu = ref({ visible: false, x: 0, y: 0, station: null });
const contextMenuElement = ref(null);
const notification = ref("");
const notificationType = ref("success");
const sortKey = ref("id");
const sortDirection = ref("asc");

let notificationTimer = null;

const filteredStations = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase("ru");
  const result = query
      ? stations.value.filter((station) => {
        return [station.id, station.name, station.class]
            .some((value) => String(value ?? "").toLocaleLowerCase("ru").includes(query));
      })
      : stations.value;

  if (!sortKey.value || !sortDirection.value) {
    return result;
  }

  const multiplier = sortDirection.value === "asc" ? 1 : -1;
  return [...result].sort((first, second) => {
    const firstValue = first[sortKey.value] ?? "";
    const secondValue = second[sortKey.value] ?? "";

    if (sortKey.value === "id") {
      return (Number(firstValue) - Number(secondValue)) * multiplier;
    }

    if (sortKey.value === "inUse") {
      return (Number(Boolean(firstValue)) - Number(Boolean(secondValue))) * multiplier;
    }

    return String(firstValue).localeCompare(String(secondValue), "ru", {
      numeric: true,
      sensitivity: "base"
    }) * multiplier;
  });
});

function showNotification(message, type = "success") {
  notification.value = message;
  notificationType.value = type;
  window.clearTimeout(notificationTimer);
  notificationTimer = window.setTimeout(() => {
    notification.value = "";
  }, 3500);
}

function extractStations(payload) {
  if (Array.isArray(payload)) return payload;

  for (const value of [payload?.result, payload?.data, payload?.items, payload?.content]) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function validateStation(form) {
  const name = String(form.name ?? "").trim();
  const stationClass = String(form.class ?? "").trim();

  if (!name) return "Введите название станции.";
  if (name.length > 200) return "Название станции не может быть длиннее 200 символов.";
  if (!stationClass) return "Введите класс станции.";
  if (stationClass.length > 50) return "Класс станции не может быть длиннее 50 символов.";

  return "";
}

async function loadStations() {
  loading.value = true;
  error.value = "";

  try {
    stations.value = extractStations(await getStations());
  } catch (exception) {
    console.error("Ошибка загрузки станций:", exception);
    stations.value = [];
    error.value = exception instanceof Error
        ? exception.message
        : "Не удалось загрузить станции.";
  } finally {
    loading.value = false;
  }
}

async function submitAdd() {
  addError.value = validateStation(addForm.value);
  if (addError.value || isAdding.value) return;

  isAdding.value = true;
  try {
    await addStation({
      name: addForm.value.name.trim(),
      class: addForm.value.class.trim()
    });
    addForm.value = { name: "", class: "" };
    await loadStations();
    showNotification("Станция успешно добавлена.");
  } catch (exception) {
    addError.value = exception instanceof Error
        ? exception.message
        : "Не удалось добавить станцию.";
  } finally {
    isAdding.value = false;
  }
}

function openEdit(station = contextMenu.value.station) {
  closeContextMenu();
  if (!station) return;

  editingStation.value = station;
  editForm.value = {
    name: station.name ?? "",
    class: station.class ?? ""
  };
  editError.value = "";
  nextTick(() => editNameInput.value?.focus());
}

function closeEdit() {
  if (!isSavingEdit.value) editingStation.value = null;
}

async function submitEdit() {
  if (isSavingEdit.value || !editingStation.value) return;

  editError.value = validateStation(editForm.value);
  if (editError.value) return;

  const id = editingStation.value.id;
  const changes = {
    name: editForm.value.name.trim(),
    class: editForm.value.class.trim()
  };

  isSavingEdit.value = true;
  try {
    await updateStation(id, changes);
    stations.value = stations.value.map((station) =>
        station.id === id ? { ...station, ...changes } : station);
    editingStation.value = null;
    showNotification("Станция успешно обновлена.");
  } catch (exception) {
    editError.value = exception instanceof Error
        ? exception.message
        : "Не удалось обновить станцию.";
  } finally {
    isSavingEdit.value = false;
  }
}

async function openContextMenu(event, station) {
  event.preventDefault();
  const { clientX, clientY } = event;
  contextMenu.value = { visible: true, x: clientX, y: clientY, station };

  await nextTick();
  if (!contextMenuElement.value) return;

  const { width, height } = contextMenuElement.value.getBoundingClientRect();
  contextMenu.value.x = Math.max(0, Math.min(clientX, window.innerWidth - width - 8));
  contextMenu.value.y = Math.max(0, Math.min(clientY, window.innerHeight - height - 8));
}

function closeContextMenu() {
  contextMenu.value.visible = false;
  contextMenu.value.station = null;
}

function openDelete(station = contextMenu.value.station) {
  closeContextMenu();
  deletingStation.value = station;
  deleteError.value = "";
}

function closeDelete() {
  if (!isDeleting.value) deletingStation.value = null;
}

async function confirmDelete() {
  if (!deletingStation.value || isDeleting.value) return;

  isDeleting.value = true;
  deleteError.value = "";
  try {
    await deleteStation(deletingStation.value.id);
    const deletedId = deletingStation.value.id;
    stations.value = stations.value.filter((station) => station.id !== deletedId);
    closeDelete();
    showNotification("Станция удалена.");
  } catch (exception) {
    deleteError.value = exception instanceof Error
        ? exception.message
        : "Не удалось удалить станцию.";
  } finally {
    isDeleting.value = false;
  }
}

async function copyStationName(station = contextMenu.value.station) {
  closeContextMenu();
  if (!station) return;

  try {
    await navigator.clipboard.writeText(String(station.name ?? ""));
    showNotification("Название станции скопировано.");
  } catch {
    showNotification("Не удалось скопировать название станции.", "error");
  }
}

function toggleSort(key) {
  if (sortKey.value !== key) {
    sortKey.value = key;
    sortDirection.value = "desc";
  } else if (sortDirection.value === "desc") {
    sortDirection.value = "asc";
  } else {
    sortKey.value = "";
    sortDirection.value = "";
  }
}

function sortIndicator(key) {
  return sortKey.value === key
      ? sortDirection.value === "asc" ? "▲" : "▼"
      : "";
}

function onKeydown(event) {
  if (event.key === "Escape") {
    closeContextMenu();
    closeEdit();
    closeDelete();
  }
}

onMounted(() => {
  document.addEventListener("click", closeContextMenu);
  document.addEventListener("keydown", onKeydown);
  loadStations();
});

onBeforeUnmount(() => {
  window.clearTimeout(notificationTimer);
  document.removeEventListener("click", closeContextMenu);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <main class="routes-page admin-page stations-page">
    <header class="page-header">
      <div>
        <div class="breadcrumbs">
          <RouterLink to="/admin">Администрирование</RouterLink>
          <span>/</span>
          <strong>Управление станциями</strong>
        </div>
        <h1>Управление станциями</h1>
        <p class="page-record-count">
          {{ loading ? "Загрузка данных…" : `Станций: ${filteredStations.length}` }}
        </p>
      </div>

      <button class="refresh-button" type="button" :disabled="loading" :class="{ 'is-loading': loading }" @click="loadStations">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-4.9 6H5.02A7 7 0 1 0 17.65 6.35Z" /></svg>
        <span>{{ loading ? "Загрузка…" : "Обновить" }}</span>
      </button>
    </header>

    <section class="stations-card">
      <form class="stations-add-form" @submit.prevent="submitAdd">
        <div class="stations-card__heading">
          <h2>Добавить станцию</h2>
          <p>Название и класс станции обязательны для заполнения.</p>
        </div>

        <label class="stations-field">
          <span>Название</span>
          <input v-model="addForm.name" type="text" maxlength="200" placeholder="Например, Центральная" :disabled="isAdding" />
        </label>
        <label class="stations-field">
          <span>Класс</span>
          <input v-model="addForm.class" type="text" maxlength="50" :disabled="isAdding" />
        </label>
        <button class="upload-button" type="submit" :disabled="isAdding">
          {{ isAdding ? "Добавление…" : "Добавить станцию" }}
        </button>
        <p v-if="addError" class="stations-form-error">{{ addError }}</p>
      </form>

      <div class="stations-toolbar">
        <div>
          <h2>Список станций</h2>
          <p>Для действий со станцией нажмите правой кнопкой мыши по строке.</p>
        </div>
        <label class="stations-search">
          <span class="visually-hidden">Поиск станций</span>
          <input v-model="searchQuery" type="search" placeholder="Поиск станции" />
        </label>
      </div>

      <div class="stations-table-container">
        <table class="stations-table">
          <thead>
          <tr>
            <th v-for="column in [
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Название' },
              { key: 'class', label: 'Класс' },
              { key: 'inUse', label: 'Используется' }
            ]" :key="column.key" :class="{ 'is-sortable': true }" @click="toggleSort(column.key)">
              {{ column.label }} <span class="sort-indicator">{{ sortIndicator(column.key) }}</span>
            </th>
          </tr>
          </thead>
          <tbody>
          <tr v-if="loading"><td colspan="4" class="stations-state-cell"><span class="spinner"></span> Загрузка станций…</td></tr>
          <tr v-else-if="error"><td colspan="4" class="stations-state-cell stations-state-cell--error"><strong>Ошибка загрузки</strong><span>{{ error }}</span><button class="reset-button" type="button" @click="loadStations">Повторить</button></td></tr>
          <tr v-else-if="filteredStations.length === 0"><td colspan="4" class="stations-state-cell">Станции не найдены.</td></tr>
          <tr v-for="station in filteredStations" v-else :key="station.id" @dblclick="openEdit(station)" @contextmenu="openContextMenu($event, station)">
            <td class="numeric-cell">{{ station.id ?? "—" }}</td>
            <td class="station-name-cell">{{ station.name || "—" }}</td>
            <td>{{ station.class || "—" }}</td>
            <td><span class="station-status" :class="{ 'is-used': station.inUse }">{{ station.inUse ? "Да" : "Нет" }}</span></td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="contextMenu.visible" ref="contextMenuElement" class="stations-context-menu" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop>
      <button type="button" @click="openEdit()">Редактировать станцию</button>
      <button type="button" @click="openDelete()">Удалить станцию</button>
      <button type="button" @click="copyStationName()">Скопировать название станции</button>
    </div>

    <Teleport to="body">
      <div v-if="editingStation" class="stations-modal" role="dialog" aria-modal="true" aria-labelledby="station-edit-title" @click.self="closeEdit">
        <section class="stations-modal__dialog">
          <header class="stations-modal__header">
            <div>
              <span>{{ editingStation.name }}</span>
              <h2 id="station-edit-title">Редактирование станции</h2>
            </div>
            <button type="button" aria-label="Закрыть" :disabled="isSavingEdit" @click="closeEdit">×</button>
          </header>
          <form class="stations-modal__body stations-modal__body--edit" @submit.prevent="submitEdit">
            <label class="stations-modal__field">
              <span>Название</span>
              <input ref="editNameInput" v-model="editForm.name" type="text" maxlength="200" :disabled="isSavingEdit" />
            </label>
            <label class="stations-modal__field">
              <span>Класс</span>
              <input v-model="editForm.class" type="text" maxlength="50" :disabled="isSavingEdit" />
            </label>
            <p v-if="editError" class="stations-form-error" role="alert">{{ editError }}</p>
            <footer class="stations-modal__actions">
              <button class="reset-button" type="button" :disabled="isSavingEdit" @click="closeEdit">Отмена</button>
              <button class="upload-button" type="submit" :disabled="isSavingEdit">
                {{ isSavingEdit ? "Сохранение…" : "Сохранить" }}
              </button>
            </footer>
          </form>
        </section>
      </div>

      <div v-if="deletingStation" class="stations-modal" role="dialog" aria-modal="true" @click.self="closeDelete">
        <section class="stations-modal__dialog stations-modal__dialog--danger">
          <header class="stations-modal__header"><div><span>Подтверждение действия</span><h2>Удалить станцию?</h2></div><button type="button" aria-label="Закрыть" :disabled="isDeleting" @click="closeDelete">×</button></header>
          <div class="stations-modal__body"><p>Вы действительно хотите удалить станцию «{{ deletingStation.name }}»?</p><p v-if="deleteError" class="stations-form-error">{{ deleteError }}</p><footer class="stations-modal__actions"><button class="reset-button" type="button" :disabled="isDeleting" @click="closeDelete">Отмена</button><button class="station-delete-button" type="button" :disabled="isDeleting" @click="confirmDelete">{{ isDeleting ? "Удаление…" : "Удалить" }}</button></footer></div>
        </section>
      </div>
    </Teleport>

    <div v-if="notification" class="notification is-visible" :class="{ 'is-error': notificationType === 'error' }">{{ notification }}</div>
  </main>
</template>

<style scoped>
.stations-page { min-height: 100vh; }
.stations-card { overflow: hidden; border: 1px solid #e4e9f0; border-radius: 14px; background: var(--surface); box-shadow: var(--shadow); }
.stations-add-form, .stations-toolbar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px; padding: 18px 22px; border-bottom: 1px solid var(--border); background: #fbfcff; }
.stations-card__heading, .stations-toolbar > div { flex: 1 1 100%; }
.stations-card__heading h2, .stations-toolbar h2 { margin: 0; font-size: 19px; }
.stations-card__heading p, .stations-toolbar p { margin: 5px 0 0; color: var(--text-secondary); font-size: 13px; }
.stations-field { display: flex; min-width: 220px; flex: 1 1 260px; flex-direction: column; gap: 6px; color: var(--text-primary); font-size: 13px; font-weight: 650; }
.stations-modal__field { display: flex; width: 100%; min-width: 0; flex-direction: column; gap: 6px; color: var(--text-primary); font-size: 13px; font-weight: 650; }
.stations-field input, .stations-modal__field input, .stations-search input { width: 100%; height: 42px; padding: 0 12px; color: var(--text-primary); border: 1px solid var(--border); border-radius: 9px; background: #fff; outline: none; font: inherit; font-weight: 400; }
.stations-field input:focus, .stations-modal__field input:focus, .stations-search input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(23 105 224 / 12%); }
.stations-add-form .upload-button { align-self: flex-end; min-height: 42px; }
.stations-form-error { flex: 1 1 100%; margin: 0; padding: 10px 12px; color: #912018; border: 1px solid #f0b7b2; border-radius: 8px; background: #fff1f0; font-size: 13px; }
.stations-toolbar { align-items: center; justify-content: space-between; }
.stations-toolbar > div { flex: 1 1 auto; }
.stations-search { width: min(100%, 280px); }
.stations-table-container { max-height: calc(100vh - 310px); min-height: 260px; overflow: auto; }
.stations-table { width: 100%; min-width: 620px; border-spacing: 0; border-collapse: separate; color: var(--text-primary); font-size: 14px; }
.stations-table th, .stations-table td { padding: 11px 16px; border-right: 1px solid var(--table-border); border-bottom: 1px solid var(--table-border); text-align: left; vertical-align: middle; }
.stations-table tr > *:last-child { border-right: 0; }
.stations-table thead { position: sticky; z-index: 2; top: 0; }
.stations-table thead th { color: #1a2940; background: #dfebff; font-weight: 650; user-select: none; }
.stations-table tbody tr:nth-child(even) td { background: #f9fbfd; }
.stations-table tbody tr:hover td { background: #edf5ff; }
.stations-table th:nth-child(1), .stations-table td:nth-child(1) { width: 100px; }
.stations-table th:nth-child(4), .stations-table td:nth-child(4) { width: 180px; }
.stations-table .is-sortable { cursor: pointer; }
.sort-indicator { color: var(--accent); font-size: 11px; }
.numeric-cell { font-variant-numeric: tabular-nums; }
.station-name-cell { font-weight: 650; }
.station-status { display: inline-flex; min-width: 45px; justify-content: center; padding: 4px 10px; color: #667085; border-radius: 999px; background: #eef2f7; font-size: 12px; font-weight: 650; }
.station-status.is-used { color: #166534; background: #dcfce7; }
.stations-state-cell { height: 180px; color: var(--text-secondary); text-align: center !important; }
.stations-state-cell > * { margin: 4px; }
.stations-state-cell--error { display: table-cell; color: #912018; }
.stations-state-cell--error strong, .stations-state-cell--error span { display: block; }
.stations-context-menu { position: fixed; z-index: 1500; width: 230px; overflow: hidden; border: 1px solid var(--border); border-radius: 9px; background: #fff; box-shadow: 0 12px 30px rgb(29 49 84 / 18%); }
.stations-context-menu button { display: block; width: 100%; padding: 11px 13px; color: var(--text-primary); border: 0; background: #fff; text-align: left; cursor: pointer; font-size: 13px; }
.stations-context-menu button:hover { background: var(--accent-light); color: var(--accent-dark); }
.stations-modal { position: fixed; z-index: 2500; inset: 0; display: grid; place-items: center; padding: 20px; background: rgb(10 24 46 / 70%); backdrop-filter: blur(2px); }
.stations-modal__dialog { width: min(100%, 540px); overflow: hidden; border: 1px solid var(--border); border-radius: 14px; background: #fff; box-shadow: 0 24px 70px rgb(7 20 41 / 40%); }
.stations-modal__dialog--danger { border-color: #f0b7b2; }
.stations-modal__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 21px 24px 18px; border-bottom: 1px solid #edf0f5; background: #fbfcff; }
.stations-modal__header span { color: var(--text-secondary); font-size: 12px; }
.stations-modal__header h2 { margin: 5px 0 0; font-size: 20px; }
.stations-modal__header button { width: 36px; height: 36px; border: 1px solid var(--border); border-radius: 8px; background: #fff; cursor: pointer; font-size: 24px; line-height: 1; }
.stations-modal__body { display: flex; flex-direction: column; gap: 16px; padding: 24px; }
.stations-modal__body--edit { gap: 10px; }
.stations-modal__body > p { margin: 0; line-height: 1.5; }
.stations-modal__actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.station-delete-button { min-height: 43px; padding: 0 18px; color: #fff; border: 1px solid #b42318; border-radius: 9px; background: #b42318; cursor: pointer; }
.station-delete-button:hover:not(:disabled) { background: #912018; }
@media (max-width: 700px) { .stations-add-form, .stations-toolbar { align-items: stretch; flex-direction: column; padding: 16px; } .stations-field, .stations-search { width: 100%; min-width: 0; } .stations-add-form .upload-button { width: 100%; } .stations-modal { align-items: end; padding: 0; } .stations-modal__dialog { width: 100%; border-radius: 14px 14px 0 0; } }
</style>
