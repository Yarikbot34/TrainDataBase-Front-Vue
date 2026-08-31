<script setup>
import {
  computed,
  onMounted,
  ref
} from "vue";

import FilterCombobox from "../../components/FilterCombobox.vue";
import PeriodModal from "../../components/PeriodModal.vue";

import { getWrittenPeriods } from "../../api/routesApi";

import {
  deleteTransactionObjects,
  getTransactions,
  getWrittenTransactionTypes,
  updateTransaction
} from "../../api/transactionsApi";

import "../../assets/site.css";

const transactions = ref([]);
const transactionTypes = ref([]);
const availablePeriods = ref([]);

const loading = ref(false);
const error = ref("");

const selectedPeriod = ref([]);
const selectedUserName = ref("");
const selectedTransactionType = ref("");
const createdDate = ref("");

const showPeriodModal = ref(false);

const editableTransaction = ref(null);
const newDescription = ref("");
const descriptionSaving = ref(false);
const descriptionError = ref("");

const deletableTransaction = ref(null);
const adminPassword = ref("");
const stationDelete = ref(false);
const deleteSaving = ref(false);
const deleteError = ref("");

const notification = ref("");
const notificationType = ref("success");

let notificationTimer = null;

const monthNames = Object.freeze([
  "",
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь"
]);

const userNameOptions = computed(() => {
  return [...new Set(
      transactions.value
          .map((transaction) => String(transaction.userName ?? "").trim())
          .filter(Boolean)
  )]
      .sort((first, second) => {
        return first.localeCompare(second, "ru");
      })
      .map((userName) => ({
        value: userName,
        label: userName
      }));
});

const transactionTypeOptions = computed(() => {
  return transactionTypes.value.map((transactionType) => ({
    value: transactionType,
    label: getTransactionTypeLabel(transactionType)
  }));
});

const hasActiveFilters = computed(() => {
  return Boolean(
      selectedPeriod.value.length ||
      selectedUserName.value ||
      selectedTransactionType.value ||
      createdDate.value
  );
});

const filteredTransactions = computed(() => {
  const normalizedDate = createdDate.value;

  return transactions.value
      .filter((transaction) => {
        if (
            selectedUserName.value &&
            transaction.userName !== selectedUserName.value
        ) {
          return false;
        }

        if (
            selectedTransactionType.value &&
            transaction.transactionType !== selectedTransactionType.value
        ) {
          return false;
        }

        if (
            normalizedDate &&
            formatDateOnly(transaction.dateCreated) !== normalizedDate
        ) {
          return false;
        }

        return true;
      })
      .sort(sortTransactions);
});

const periodButtonText = computed(() => {
  if (!selectedPeriod.value.length) {
    return "Все периоды";
  }

  const monthCount = selectedPeriod.value.reduce(
      (total, item) => total + item.months.length,
      0
  );

  return `Выбрано месяцев: ${monthCount}`;
});

function extractItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.result)) {
    return payload.result;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  return [];
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
      ? number
      : 0;
}

function formatYear(value) {
  const year = toNumber(value);

  if (year >= 0 && year < 100) {
    return String(2000 + year);
  }

  return String(year);
}

function formatMonth(value) {
  return String(toNumber(value)).padStart(2, "0");
}

function formatInteger(value) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).padStart(4, "0");

  return `${day}.${month}.${year}`;
}

function getTransactionTypeLabel(transactionType) {
  const labels = {
    Add: "Добавление объектов",
    AddFile: "Импорт файла",
    Update: "Обновление",
    Delete: "Удаление"
  };

  return labels[transactionType] ?? transactionType ?? "—";
}

function canDeleteObjects(transaction) {
  return (
      transaction?.transactionType === "Add" ||
      transaction?.transactionType === "AddFile"
  );
}

function sortTransactions(first, second) {
  const yearDifference =
      toNumber(second.year) -
      toNumber(first.year);

  if (yearDifference !== 0) {
    return yearDifference;
  }

  const monthDifference =
      toNumber(second.month) -
      toNumber(first.month);

  if (monthDifference !== 0) {
    return monthDifference;
  }

  return new Date(second.dateCreated).getTime() -
      new Date(first.dateCreated).getTime();
}

function dateMask(value) {
  const digits = String(value ?? "")
      .replace(/\D/g, "")
      .slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function handleCreatedDateInput(event) {
  createdDate.value = dateMask(event.target.value);
}

function parseMaskedDate(value) {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    return null;
  }

  const [day, month, year] = value.split(".").map(Number);
  const date = new Date(year, month - 1, day);

  if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function buildFilters() {
  const selectedDate = parseMaskedDate(createdDate.value);

  let startDate = null;
  let endDate = null;

  if (selectedDate) {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    startDate = start.toISOString();
    endDate = end.toISOString();
  }

  return {
    userNames: selectedUserName.value
        ? [selectedUserName.value]
        : [],

    periods: selectedPeriod.value.map((item) => ({
      year: Number(item.year),
      months: item.months.map(Number)
    })),

    startDate,
    endDate,

    transactionTypes: selectedTransactionType.value
        ? [selectedTransactionType.value]
        : []
  };
}

function showNotification(message, type = "success") {
  notification.value = message;
  notificationType.value = type;

  window.clearTimeout(notificationTimer);

  notificationTimer = window.setTimeout(() => {
    notification.value = "";
  }, 3500);
}

async function loadTransactions() {
  loading.value = true;
  error.value = "";

  try {
    const payload = await getTransactions(buildFilters());

    transactions.value = extractItems(payload).sort(sortTransactions);
  } catch (exception) {
    console.error("Ошибка загрузки транзакций:", exception);

    error.value = exception instanceof Error
        ? exception.message
        : "Не удалось загрузить транзакции.";

    showNotification(
        "Не удалось загрузить список транзакций.",
        "error"
    );
  } finally {
    loading.value = false;
  }
}

async function loadFilterOptions() {
  try {
    const [periodsPayload, typesPayload] = await Promise.all([
      getWrittenPeriods(),
      getWrittenTransactionTypes()
    ]);

    availablePeriods.value = extractItems(periodsPayload);
    transactionTypes.value = extractItems(typesPayload);
  } catch (exception) {
    console.error("Ошибка загрузки фильтров транзакций:", exception);

    showNotification(
        "Не удалось загрузить часть значений фильтров.",
        "error"
    );
  }
}

async function applyPeriod(period) {
  selectedPeriod.value = period;
  showPeriodModal.value = false;

  await loadTransactions();
}

async function handleFilterChange() {
  await loadTransactions();
}

async function resetFilters() {
  selectedPeriod.value = [];
  selectedUserName.value = "";
  selectedTransactionType.value = "";
  createdDate.value = "";

  await loadTransactions();
}

function openDescriptionModal(transaction) {
  editableTransaction.value = transaction;
  newDescription.value = transaction.description ?? "";
  descriptionError.value = "";
}

function closeDescriptionModal() {
  if (descriptionSaving.value) {
    return;
  }

  editableTransaction.value = null;
  newDescription.value = "";
  descriptionError.value = "";
}

async function saveDescription() {
  if (!editableTransaction.value) {
    return;
  }

  descriptionSaving.value = true;
  descriptionError.value = "";

  try {
    const updatedTransaction = {
      ...editableTransaction.value,
      description: newDescription.value.trim()
    };

    const response = await updateTransaction(updatedTransaction);

    const transactionFromResponse = response &&
    typeof response === "object"
        ? response
        : updatedTransaction;

    const index = transactions.value.findIndex((transaction) => {
      return transaction.id === editableTransaction.value.id;
    });

    if (index !== -1) {
      transactions.value[index] = {
        ...transactions.value[index],
        ...transactionFromResponse,
        description: updatedTransaction.description
      };
    }

    closeDescriptionModal();

    showNotification("Описание транзакции обновлено.");
  } catch (exception) {
    console.error("Ошибка обновления описания:", exception);

    descriptionError.value = exception instanceof Error
        ? exception.message
        : "Не удалось обновить описание.";
  } finally {
    descriptionSaving.value = false;
  }
}

function openDeleteModal(transaction) {
  if (!canDeleteObjects(transaction)) {
    return;
  }

  deletableTransaction.value = transaction;
  adminPassword.value = "";
  stationDelete.value = false;
  deleteError.value = "";
}

function closeDeleteModal() {
  if (deleteSaving.value) {
    return;
  }

  deletableTransaction.value = null;
  adminPassword.value = "";
  stationDelete.value = false;
  deleteError.value = "";
}

async function confirmDeleteObjects() {
  if (!deletableTransaction.value) {
    return;
  }

  if (!adminPassword.value) {
    deleteError.value = "Введите пароль администратора.";
    return;
  }

  deleteSaving.value = true;
  deleteError.value = "";

  try {
    await deleteTransactionObjects({
      transactionId: deletableTransaction.value.id,
      stationDelete: stationDelete.value,
      adminPassword: adminPassword.value
    });

    const deletedId = deletableTransaction.value.id;

    transactions.value = transactions.value.filter((transaction) => {
      return transaction.id !== deletedId;
    });

    closeDeleteModal();

    showNotification(
        "Полученные объекты транзакции успешно удалены."
    );
  } catch (exception) {
    console.error("Ошибка удаления объектов транзакции:", exception);

    deleteError.value = exception instanceof Error
        ? exception.message
        : "Не удалось удалить полученные объекты.";
  } finally {
    deleteSaving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    loadFilterOptions(),
    loadTransactions()
  ]);
});
</script>

<template>
  <main class="transactions-page">
    <header class="page-header">
      <div>
        <div class="breadcrumbs">
          <span>База данных маршрутов</span>
          <span>/</span>
          <span>Администрирование</span>
          <span>/</span>
          <strong>Транзакции</strong>
        </div>

        <h1>Управление транзакциями</h1>

        <p>
          Просмотр истории операций, редактирование описаний
          и удаление полученных объектов.
        </p>
      </div>

      <button
          class="refresh-button"
          type="button"
          :disabled="loading"
          :class="{ 'is-loading': loading }"
          @click="loadTransactions">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
              d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-4.9 6H5.02A7 7 0 1 0 17.65 6.35Z" />
        </svg>

        <span>{{ loading ? "Загрузка…" : "Обновить" }}</span>
      </button>
    </header>

    <section class="transactions-card">
      <div class="transactions-card__header">
        <div>
          <h2>Список транзакций</h2>
          <p>
            {{
              loading
                  ? "Загрузка данных…"
                  : `Найдено записей: ${filteredTransactions.length}`
            }}
          </p>
        </div>
      </div>

      <div class="filters-bar transactions-filters">
        <div class="filter-combobox period-filter">
          <span class="filter-combobox__label">
            Период транзакции
          </span>

          <button
              class="filter-combobox__button period-filter__button"
              type="button"
              @click="showPeriodModal = true">
            <span class="filter-combobox__value">
              {{ periodButtonText }}
            </span>

            <svg
                class="filter-combobox__caret"
                viewBox="0 0 24 24"
                aria-hidden="true">
              <path d="m7 9 5 5 5-5-1.4-1.4-3.6 3.6-3.6-3.6L7 9Z" />
            </svg>
          </button>
        </div>

        <FilterCombobox
            v-model="selectedUserName"
            label="Пользователь"
            placeholder="Все пользователи"
            all-text="Все пользователи"
            :options="userNameOptions"
            @change="handleFilterChange" />

        <FilterCombobox
            v-model="selectedTransactionType"
            label="Тип транзакции"
            placeholder="Все типы"
            all-text="Все типы"
            :options="transactionTypeOptions"
            @change="handleFilterChange" />

        <label class="transaction-date-filter">
          <span class="filter-combobox__label">
            Дата создания
          </span>

          <input
              :value="createdDate"
              type="text"
              inputmode="numeric"
              maxlength="10"
              placeholder="01.01.0001"
              aria-label="Дата создания транзакции"
              @input="handleCreatedDateInput"
              @change="handleFilterChange" />
        </label>

        <button
            class="filters-reset-button"
            type="button"
            :class="{ 'is-active': hasActiveFilters }"
            @click="resetFilters">
          Сбросить фильтры
        </button>
      </div>

      <div class="transactions-table-container">
        <table class="transactions-table">
          <thead>
          <tr>
            <th>Время создания</th>
            <th>Год</th>
            <th>Месяц</th>
            <th>Получено объектов</th>
            <th>Тип транзакции</th>
            <th>Описание</th>
            <th class="transactions-table__actions-header">
              Действия
            </th>
          </tr>
          </thead>

          <tbody>
          <tr v-if="loading">
            <td class="transactions-state-cell" colspan="7">
              <div class="loading-state">
                <span class="spinner"></span>
                Загрузка транзакций…
              </div>
            </td>
          </tr>

          <tr v-else-if="error">
            <td class="transactions-state-cell" colspan="7">
              <div class="error-state">
                <strong>Ошибка загрузки</strong>
                <span>{{ error }}</span>

                <button type="button" @click="loadTransactions">
                  Повторить
                </button>
              </div>
            </td>
          </tr>

          <tr v-else-if="filteredTransactions.length === 0">
            <td class="transactions-state-cell" colspan="7">
              Транзакции не найдены.
            </td>
          </tr>

          <tr
              v-for="transaction in filteredTransactions"
              v-else
              :key="transaction.id">
            <td class="transaction-date-cell">
              {{ formatDateTime(transaction.dateCreated) }}
            </td>

            <td>
              {{ formatYear(transaction.year) }}
            </td>

            <td>
              {{ formatMonth(transaction.month) }}
            </td>

            <td class="numeric-cell">
              {{ formatInteger(transaction.unitCount) }}
            </td>

            <td>
                <span class="transaction-type-badge">
                  {{ getTransactionTypeLabel(transaction.transactionType) }}
                </span>
            </td>

            <td class="transaction-description-cell">
              {{ transaction.description || "—" }}
            </td>

            <td class="transaction-actions-cell">
              <button
                  class="transaction-action-button"
                  type="button"
                  @click="openDescriptionModal(transaction)">
                Редактировать описание
              </button>

              <button
                  v-if="canDeleteObjects(transaction)"
                  class="transaction-action-button transaction-action-button--danger"
                  type="button"
                  @click="openDeleteModal(transaction)">
                Удалить полученные объекты
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div
          v-if="editableTransaction"
          class="transaction-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-description-title">
        <div
            class="transaction-modal__backdrop"
            @click="closeDescriptionModal"></div>

        <section class="transaction-modal__dialog">
          <header class="transaction-modal__header">
            <div>
              <span class="transaction-modal__caption">
                Транзакция за {{ formatMonth(editableTransaction.month) }}.{{ formatYear(editableTransaction.year) }}
              </span>

              <h2 id="edit-description-title">
                Редактирование описания
              </h2>
            </div>

            <button
                class="transaction-modal__close"
                type="button"
                aria-label="Закрыть"
                :disabled="descriptionSaving"
                @click="closeDescriptionModal">
              ×
            </button>
          </header>

          <div class="transaction-modal__body">
            <div class="transaction-old-description">
              <span>Старое описание</span>
              <p>{{ editableTransaction.description || "Описание отсутствует" }}</p>
            </div>

            <label class="transaction-modal__field">
              <span>Новое описание</span>

              <textarea
                  v-model="newDescription"
                  rows="6"
                  placeholder="Введите новое описание транзакции"
                  :disabled="descriptionSaving"></textarea>
            </label>

            <p
                v-if="descriptionError"
                class="transaction-modal__error">
              {{ descriptionError }}
            </p>
          </div>

          <footer class="transaction-modal__actions">
            <button
                class="reset-button"
                type="button"
                :disabled="descriptionSaving"
                @click="closeDescriptionModal">
              Отмена
            </button>

            <button
                class="upload-button"
                type="button"
                :disabled="descriptionSaving"
                @click="saveDescription">
              {{ descriptionSaving ? "Сохранение…" : "Сохранить" }}
            </button>
          </footer>
        </section>
      </div>

      <div
          v-if="deletableTransaction"
          class="transaction-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-transaction-title">
        <div
            class="transaction-modal__backdrop"
            @click="closeDeleteModal"></div>

        <section class="transaction-modal__dialog transaction-modal__dialog--danger">
          <header class="transaction-modal__header">
            <div>
              <span class="transaction-modal__caption">
                Транзакция за {{ formatMonth(deletableTransaction.month) }}.{{ formatYear(deletableTransaction.year) }}
              </span>

              <h2 id="delete-transaction-title">
                Удалить полученные объекты
              </h2>
            </div>

            <button
                class="transaction-modal__close"
                type="button"
                aria-label="Закрыть"
                :disabled="deleteSaving"
                @click="closeDeleteModal">
              ×
            </button>
          </header>

          <div class="transaction-modal__body">
            <p class="transaction-modal__warning">
              Действие удалит объекты, полученные в рамках выбранной транзакции.
            </p>

            <label class="transaction-modal__field">
              <span>Пароль администратора</span>

              <input
                  v-model="adminPassword"
                  type="password"
                  autocomplete="current-password"
                  placeholder="Введите пароль"
                  :disabled="deleteSaving"
                  @keydown.enter="confirmDeleteObjects" />
            </label>

            <label class="transaction-delete-stations">
              <input
                  v-model="stationDelete"
                  type="checkbox"
                  :disabled="deleteSaving" />

              <span>Удалить связанные станции</span>
            </label>

            <p
                v-if="deleteError"
                class="transaction-modal__error">
              {{ deleteError }}
            </p>
          </div>

          <footer class="transaction-modal__actions">
            <button
                class="reset-button"
                type="button"
                :disabled="deleteSaving"
                @click="closeDeleteModal">
              Отмена
            </button>

            <button
                class="transaction-delete-confirm-button"
                type="button"
                :disabled="deleteSaving"
                @click="confirmDeleteObjects">
              {{ deleteSaving ? "Удаление…" : "Удалить" }}
            </button>
          </footer>
        </section>
      </div>
    </Teleport>

    <div
        v-if="notification"
        class="notification is-visible"
        :class="{ 'is-error': notificationType === 'error' }">
      {{ notification }}
    </div>

    <PeriodModal
        v-model="showPeriodModal"
        :periods="availablePeriods"
        :selected-period="selectedPeriod"
        @apply="applyPeriod" />
  </main>
</template>