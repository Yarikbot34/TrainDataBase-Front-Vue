<script setup>
import {
  computed,
  ref
} from "vue";

import {
  updateRecordDescription,
  uploadImportFile
} from "../api/importApi";

import RecordDescriptionModal from
      "../components/RecordDescriptionModal.vue";

const currentYear = new Date().getFullYear();

const months = [
  { value: 1, label: "01 — Январь" },
  { value: 2, label: "02 — Февраль" },
  { value: 3, label: "03 — Март" },
  { value: 4, label: "04 — Апрель" },
  { value: 5, label: "05 — Май" },
  { value: 6, label: "06 — Июнь" },
  { value: 7, label: "07 — Июль" },
  { value: 8, label: "08 — Август" },
  { value: 9, label: "09 — Сентябрь" },
  { value: 10, label: "10 — Октябрь" },
  { value: 11, label: "11 — Ноябрь" },
  { value: 12, label: "12 — Декабрь" }
];

const year = ref("");
const month = ref("");
const note = ref("");

const selectedFile = ref(null);
const fileInput = ref(null);
const fileDropZone = ref(null);

const isDragging = ref(false);
const isUploading = ref(false);
const isSendingDescription = ref(false);

const validationMessage = ref("");
const serverResult = ref(null);

const importedRecords = ref([]);
const currentRecordIndex = ref(0);
const descriptionError = ref("");

const currentRecord = computed(() => {
  return importedRecords.value[
      currentRecordIndex.value
      ] ?? null;
});

const currentYearPlaceholder = computed(() => {
  return String(currentYear) % 1000;
});

const isDescriptionModalVisible = computed(() => {
  return Boolean(currentRecord.value);
});

function extractRecords(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.data,
    payload?.items,
    payload?.content,
    payload?.records,
    payload?.result
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function getServerMessage(payload, fallback) {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  return payload?.message ??
      payload?.detail ??
      payload?.title ??
      fallback;
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return "Размер неизвестен";
  }

  const units = [
    "Б",
    "КБ",
    "МБ",
    "ГБ"
  ];

  const unitIndex = Math.min(
      Math.floor(Math.log(size) / Math.log(1024)),
      units.length - 1
  );

  const value = size / Math.pow(1024, unitIndex);

  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: unitIndex === 0 ? 0 : 2
  }).format(value)} ${units[unitIndex]}`;
}

function isXlsxFile(file) {
  return file &&
      file.name.toLocaleLowerCase("ru").endsWith(".xlsx");
}

function showValidation(message) {
  validationMessage.value = message;
}

function hideValidation() {
  validationMessage.value = "";
}

function showServerResult(type, title, message) {
  serverResult.value = {
    type,
    title,
    message
  };
}

function closeServerResult() {
  serverResult.value = null;
}

function setSelectedFile(file) {
  hideValidation();

  if (!isXlsxFile(file)) {
    selectedFile.value = null;

    showValidation(
        "Поддерживается только файл с расширением .xlsx."
    );

    return;
  }

  selectedFile.value = file;
}

function clearSelectedFile() {
  selectedFile.value = null;

  if (fileInput.value) {
    fileInput.value.value = "";
  }

  isDragging.value = false;
  hideValidation();
}

function openFileDialog() {
  if (!isUploading.value) {
    fileInput.value?.click();
  }
}

function handleFileChange(event) {
  const file = event.target.files?.[0];

  if (file) {
    setSelectedFile(file);
  }
}

function handleDrop(event) {
  event.preventDefault();

  isDragging.value = false;

  if (isUploading.value) {
    return;
  }

  const files = event.dataTransfer?.files;

  if (!files || files.length !== 1) {
    showValidation(
        "Выберите ровно один XLSX-файл."
    );

    return;
  }

  setSelectedFile(files[0]);
}

function handleDropZoneKeydown(event) {
  if (
      event.key === "Enter" ||
      event.key === " "
  ) {
    event.preventDefault();
    openFileDialog();
  }
}

function validateForm() {
  hideValidation();

  const rawYear = String(year.value ?? "").trim();
  const rawMonth = String(month.value ?? "").trim();

  const numericYear = Number(rawYear);
  const numericMonth = Number(rawMonth);

  if (
      rawYear === "" ||
      !Number.isInteger(numericYear) ||
      numericYear < 0 ||
      numericYear > 99
  ) {
    showValidation(
        "Укажите последние две цифры года: от 0 до 99."
    );

    return false;
  }

  if (
      rawMonth === "" ||
      !Number.isInteger(numericMonth) ||
      numericMonth < 1 ||
      numericMonth > 12
  ) {
    showValidation("Выберите месяц.");

    return false;
  }

  if (!selectedFile.value) {
    showValidation("Выберите XLSX-файл.");

    return false;
  }

  if (!isXlsxFile(selectedFile.value)) {
    showValidation(
        "Поддерживается только файл с расширением .xlsx."
    );

    return false;
  }

  return true;
}

function closeDescriptionModal() {
  importedRecords.value = [];
  currentRecordIndex.value = 0;
  descriptionError.value = "";
}

function goToNextRecord() {
  currentRecordIndex.value += 1;
  descriptionError.value = "";

  if (currentRecordIndex.value >= importedRecords.value.length) {
    closeDescriptionModal();
  }
}

function skipCurrentDescription() {
  if (
      isDescriptionModalVisible.value &&
      !isSendingDescription.value
  ) {
    goToNextRecord();
  }
}

function resetForm() {
  if (isUploading.value) {
    return;
  }

  year.value = "";
  month.value = "";
  note.value = "";

  clearSelectedFile();
  closeServerResult();
  closeDescriptionModal();
}

async function uploadFile() {
  if (isUploading.value || !validateForm()) {
    return;
  }

  isUploading.value = true;
  closeServerResult();
  closeDescriptionModal();

  try {
    const payload = await uploadImportFile({
      file: selectedFile.value,
      year: Number(String(year.value).trim()),
      month: Number(String(month.value).trim())
    });

    const records = extractRecords(payload);

    importedRecords.value = records;
    currentRecordIndex.value = 0;

    showServerResult(
        "success",
        "Файл успешно загружен",
        records.length > 0
            ? `Импортировано записей: ${records.length}.`
            : getServerMessage(
                payload,
                "Файл обработан сервером."
            )
    );

    clearSelectedFile();
  } catch (exception) {
    console.error(
        "Ошибка загрузки файла:",
        exception
    );

    showServerResult(
        "error",
        "Ошибка загрузки",
        exception instanceof Error
            ? exception.message
            : "Не удалось загрузить файл."
    );
  } finally {
    isUploading.value = false;
  }
}

async function saveDescription(description) {
  const record = currentRecord.value;

  if (
      isSendingDescription.value ||
      !record
  ) {
    return;
  }

  if (
      record.id === undefined ||
      record.id === null
  ) {
    descriptionError.value =
        "В ответе сервера отсутствует идентификатор записи.";

    return;
  }

  isSendingDescription.value = true;
  descriptionError.value = "";

  try {
    await updateRecordDescription(
        record.id,
        record,
        description
    );

    importedRecords.value[
        currentRecordIndex.value
        ] = {
      ...record,
      description
    };

    goToNextRecord();
  } catch (exception) {
    console.error(
        "Ошибка отправки описания:",
        exception
    );

    descriptionError.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось сохранить описание.";
  } finally {
    isSendingDescription.value = false;
  }
}
</script>

<template>
  <main class="file-input-page">
    <header class="page-header">
      <div>
        <div class="breadcrumbs">
          <span>База данных маршрутов</span>
          <span>/</span>
          <strong>Загрузка файлов</strong>
        </div>

        <h1>Загрузка файлов</h1>

        <p>
          Импорт маршрутных данных из файла
          Microsoft Excel
        </p>
      </div>
    </header>

    <section class="upload-card">
      <header class="upload-card__header">
        <div class="upload-card__header-icon">
          <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
          >
            <path d="M12 3 5 10h4v7h6v-7h4l-7-7Zm-7 16h14v2H5v-2Z" />
          </svg>
        </div>

        <div>
          <h2>Импорт данных</h2>

          <p>
            Выберите отчётный период и прикрепите
            один файл формата XLSX.
          </p>
        </div>
      </header>

      <form
          class="upload-form"
          @submit.prevent="uploadFile"
          @reset.prevent="resetForm"
      >
        <div class="period-fields">
          <div class="form-field">
            <label for="year-input">
              Год
            </label>

            <input
                id="year-input"
                v-model="year"
                type="number"
                inputmode="numeric"
                min="0"
                max="99"
                step="1"
                :placeholder="currentYearPlaceholder"
                :disabled="isUploading"
            />

            <span class="form-field__description">
              Укажите последние две цифры года,
              например: 26.
            </span>
          </div>

          <div class="form-field">
            <label for="month-input">
              Месяц
            </label>

            <select
                id="month-input"
                v-model="month"
                :disabled="isUploading"
            >
              <option value="">
                Выберите месяц
              </option>

              <option
                  v-for="item in months"
                  :key="item.value"
                  :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>

            <span class="form-field__description">
              Период, за который загружаются данные.
            </span>
          </div>
        </div>

        <!-- Сохранённое поле исходной страницы -->
        <div class="form-field">
          <label for="period-note">
            Примечание (необязательно)
          </label>

          <input
              id="period-note"
              v-model="note"
              type="text"
              maxlength="500"
              placeholder="Добавьте примечание к периоду"
              :disabled="isUploading"
          />

          <span class="form-field__description">
            Поле пока отображается только в интерфейсе
            и не отправляется на сервер.
          </span>
        </div>

        <div class="form-field">
          <label for="file-input">
            Файл XLSX
          </label>

          <input
              id="file-input"
              ref="fileInput"
              class="visually-hidden"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              :disabled="isUploading"
              @change="handleFileChange"
          />

          <div
              ref="fileDropZone"
              class="file-drop-zone"
              :class="{
              'is-dragging': isDragging
            }"
              tabindex="0"
              role="button"
              aria-label="Выбрать XLSX-файл"
              @click="openFileDialog"
              @keydown="handleDropZoneKeydown"
              @dragenter.prevent="isDragging = true"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop="handleDrop"
          >
            <div class="file-drop-zone__icon">
              <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
              >
                <path d="M12 3 5 10h4v7h6v-7h4l-7-7Zm-1 11h2v-3h2l-3-3-3 3h2v3ZM5 19h14v2H5v-2Z" />
              </svg>
            </div>

            <div class="file-drop-zone__content">
              <strong>
                Перетащите XLSX-файл сюда
              </strong>

              <span>
                или нажмите, чтобы выбрать файл
              </span>

              <span class="file-select-button">
                Выбрать файл
              </span>
            </div>
          </div>

          <div
              v-if="selectedFile"
              class="selected-file"
          >
            <div class="selected-file__icon">
              <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm1 1.5L18.5 7H15V3.5ZM6 4h7v5h5v11H6V4Zm2 8h8v2H8v-2Zm0 4h8v2H8v-2Z" />
              </svg>
            </div>

            <div class="selected-file__information">
              <strong>
                {{ selectedFile.name }}
              </strong>

              <span>
                {{ formatFileSize(selectedFile.size) }}
              </span>
            </div>

            <button
                class="selected-file__remove"
                type="button"
                aria-label="Удалить выбранный файл"
                :disabled="isUploading"
                @click="clearSelectedFile"
            >
              ×
            </button>
          </div>

          <span class="form-field__description">
            Поддерживается строго один файл
            с расширением .xlsx.
          </span>
        </div>

        <div
            v-if="validationMessage"
            class="validation-message"
        >
          {{ validationMessage }}
        </div>

        <div class="upload-form__actions">
          <button
              class="upload-button"
              type="submit"
              :disabled="isUploading"
          >
            <svg
                v-if="!isUploading"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
              <path d="M12 3 5 10h4v7h6v-7h4l-7-7Zm-1 11h2v-3h2l-3-3-3 3h2v3ZM5 19h14v2H5v-2Z" />
            </svg>

            <span
                v-if="!isUploading"
                class="upload-button__text"
            >
              Загрузить файл
            </span>

            <span
                v-else
                class="upload-button__loading"
            >
              <span class="spinner"></span>
              Загрузка…
            </span>
          </button>

          <button
              class="reset-button"
              type="reset"
              :disabled="isUploading"
          >
            Очистить
          </button>
        </div>

        <div
            v-if="serverResult"
            class="server-result"
            :class="{
            'server-result--success':
              serverResult.type === 'success',
            'server-result--error':
              serverResult.type === 'error'
          }"
        >
          <div class="server-result__icon">
            <span
                v-if="serverResult.type === 'success'"
            >
              ✓
            </span>

            <span v-else>!</span>
          </div>

          <div class="server-result__content">
            <h2>
              {{ serverResult.title }}
            </h2>

            <p>
              {{ serverResult.message }}
            </p>
          </div>

          <button
              class="server-result__close"
              type="button"
              aria-label="Закрыть сообщение"
              @click="closeServerResult"
          >
            ×
          </button>
        </div>
      </form>
    </section>

    <RecordDescriptionModal
        v-if="isDescriptionModalVisible"
        :record="currentRecord"
        :current-index="currentRecordIndex"
        :total-records="importedRecords.length"
        :is-sending="isSendingDescription"
        :error="descriptionError"
        @close="closeDescriptionModal"
        @skip="skipCurrentDescription"
        @save="saveDescription"
    />
  </main>
</template>