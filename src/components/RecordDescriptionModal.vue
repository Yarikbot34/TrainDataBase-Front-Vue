<script setup>
import {
  nextTick,
  ref,
  watch
} from "vue";

const props = defineProps({
  record: {
    type: Object,
    default: null
  },

  currentIndex: {
    type: Number,
    required: true
  },

  totalRecords: {
    type: Number,
    required: true
  },

  isSending: {
    type: Boolean,
    default: false
  },

  error: {
    type: String,
    default: ""
  }
});

const emit = defineEmits([
  "close",
  "skip",
  "save"
]);

const description = ref("");
const descriptionInput = ref(null);
const clipboardError = ref("");

watch(
    () => props.record,
    async (record) => {
      description.value = record?.description ?? "";
      clipboardError.value = "";

      if (record) {
        await nextTick();
        descriptionInput.value?.focus();
      }
    },
    {
      immediate: true
    }
);

function getTrainNumber(record) {
  return record?.number ??
      record?.trainNumber ??
      record?.train ??
      "—";
}

function getRowInFile(record) {
  const rowInFile = record?.rowInFile;

  return rowInFile === undefined || rowInFile === null
      ? "—"
      : rowInFile;
}

function getRoute(record) {
  const stations = [
    record?.stationFrom,
    record?.stationMiddle,
    record?.stationTo
  ].filter((station) => {
    return typeof station === "string" &&
        station.trim() !== "";
  });

  return stations.length > 0
      ? stations.join(" — ")
      : record?.route ??
      record?.routeName ??
      "—";
}

async function pasteDescription() {
  clipboardError.value = "";

  try {
    if (!navigator.clipboard?.readText) {
      throw new Error(
          "Браузер не разрешил доступ к буферу обмена."
      );
    }

    description.value = await navigator.clipboard.readText();

    await nextTick();
    descriptionInput.value?.focus();
  } catch (exception) {
    clipboardError.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось прочитать буфер обмена.";
  }
}

function saveDescription() {
  if (!props.isSending) {
    emit("save", description.value);
  }
}

function closeModal() {
  if (!props.isSending) {
    emit("close");
  }
}

function skipRecord() {
  if (!props.isSending) {
    emit("skip");
  }
}

function handleKeydown(event) {
  if (
      event.key === "Escape" &&
      !props.isSending
  ) {
    closeModal();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
        v-if="record"
        class="description-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="description-modal-title"
        @keydown="handleKeydown"
    >
      <div
          class="description-modal__backdrop"
          @click="closeModal"
      ></div>

      <section class="description-modal__dialog">
        <header class="description-modal__header">
          <div>
            <span class="description-modal__caption">
              Добавление описания
            </span>

            <h2 id="description-modal-title">
              Описание маршрутной записи
            </h2>

            <p>
              Запись {{ currentIndex + 1 }} из {{ totalRecords }}
            </p>
          </div>

          <button
              class="description-modal__close"
              type="button"
              aria-label="Закрыть"
              :disabled="isSending"
              @click="closeModal"
          >
            ×
          </button>
        </header>

        <div class="description-modal__body">
          <dl class="description-record-info">
            <div>
              <dt>Номер поезда</dt>
              <dd>{{ getTrainNumber(record) }}</dd>
            </div>

            <div>
              <dt>Строка в файле</dt>
              <dd>{{ getRowInFile(record) }}</dd>
            </div>

            <div>
              <dt>Маршрут</dt>
              <dd>{{ getRoute(record) }}</dd>
            </div>
          </dl>

          <div class="form-field">
            <label for="description-input">
              Описание
            </label>

            <textarea
                id="description-input"
                ref="descriptionInput"
                v-model="description"
                rows="5"
                placeholder="Введите описание"
                :disabled="isSending"
                @keydown.ctrl.enter="saveDescription"
            ></textarea>
          </div>

          <div
              v-if="error || clipboardError"
              class="description-modal__error"
          >
            {{ error || clipboardError }}
          </div>

          <p class="form-field__description">
            Для отправки используется исходная запись.
            Изменяется только поле «Описание».
          </p>
        </div>

        <footer class="description-modal__actions">
          <button
              class="clipboard-button"
              type="button"
              :disabled="isSending"
              @click="pasteDescription"
          >
            Вставить из буфера обмена
          </button>

          <div class="description-modal__main-actions">
            <button
                class="skip-button"
                type="button"
                :disabled="isSending"
                @click="skipRecord"
            >
              Пропустить
            </button>

            <button
                class="submit-description-button"
                type="button"
                :disabled="isSending"
                :class="{ 'is-loading': isSending }"
                @click="saveDescription"
            >
              <span v-if="!isSending">
                Отправить
              </span>

              <span
                  v-else
                  class="submit-description-button__loading"
              >
                <span class="spinner"></span>
                Отправка…
              </span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.description-modal {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
}

.description-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgb(15 23 42 / 55%);
}

.description-modal__dialog {
  position: relative;
  z-index: 1;
  width: min(100%, 680px);
  overflow: hidden;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgb(15 23 42 / 30%);
  font-size: 18.67px;
}

.description-modal__header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.description-modal__caption {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 15.67px;
  font-weight: 600;
  text-transform: uppercase;
}

.description-modal__header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 26.67px;
}

.description-modal__header p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 18.67px;
}

.description-modal__close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 30.67px;
  line-height: 1;
}

.description-modal__close:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

.description-modal__body {
  padding: 24px;
}

.description-record-info {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 24px;
}

.description-record-info > div {
  min-width: 0;
  padding: 14px;
  border-radius: 10px;
  background: #f8fafc;
}

.description-record-info dt {
  margin-bottom: 6px;
  color: #64748b;
  font-size: 15.67px;
}

.description-record-info dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: #0f172a;
  font-size: 18.67px;
  font-weight: 600;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field label {
  color: #0f172a;
  font-size: 18.67px;
  font-weight: 600;
}

.form-field textarea {
  min-height: 120px;
  box-sizing: border-box;
  width: 100%;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 12px;
  color: #0f172a;
  font: inherit;
}

.form-field textarea:focus {
  border-color: #2563eb;
  outline: 3px solid rgb(37 99 235 / 15%);
}

.form-field__description {
  margin: 12px 0 0;
  color: #64748b;
  font-size: 16.67px;
}

.description-modal__error {
  margin-top: 12px;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 16.67px;
}

.description-modal__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
}

.description-modal__main-actions {
  display: flex;
  gap: 12px;
}

.clipboard-button,
.skip-button,
.submit-description-button {
  border-radius: 8px;
  padding: 10px 16px;
  font: inherit;
  font-size: 18.67px;
  font-weight: 600;
  cursor: pointer;
}

.clipboard-button,
.skip-button {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.submit-description-button {
  min-width: 132px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.clipboard-button:hover:not(:disabled),
.skip-button:hover:not(:disabled) {
  background: #f8fafc;
}

.submit-description-button:hover:not(:disabled) {
  background: #1d4ed8;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.submit-description-button__loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgb(255 255 255 / 45%);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .description-modal {
    align-items: end;
    padding: 0;
  }

  .description-modal__dialog {
    width: 100%;
    max-height: 92vh;
    overflow-y: auto;
    border-radius: 16px 16px 0 0;
  }

  .description-record-info {
    grid-template-columns: 1fr;
  }

  .description-modal__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .description-modal__main-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .clipboard-button {
    width: 100%;
  }
}
</style>