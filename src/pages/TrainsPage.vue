<script setup>
import {
    onMounted,
    ref
} from "vue";

import {
    getTrains
} from "../api/trainsApi";

const trains = ref([]);
const totals = ref(null);
const loading = ref(false);
const error = ref("");

const columnsCount = 11;

function formatInteger(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    return Number(value).toLocaleString("ru-RU");
}

function formatDecimal(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    return Number(value).toLocaleString("ru-RU", {
        maximumFractionDigits: 2
    });
}

function formatStations(train) {
    return [
        train.stationFrom,
        train.stationMiddle,
        train.stationTo
    ]
        .filter(Boolean)
        .join(" — ") || "—";
}

function formatTrainTimes(train) {
    if (!train.timeFrom && !train.timeTo) {
        return "—";
    }

    function formatTime(value) {
        if (!value) {
            return "—";
        }

        const time = String(value).match(/^(\d{1,2}:\d{2})/);
        return time ? time[1] : value;
    }

    return `${formatTime(train.timeFrom)} — ${formatTime(train.timeTo)}`;
}

async function loadTrains() {
    loading.value = true;
    error.value = "";

    try {
        const result = await getTrains();
        trains.value = result.trains;
        totals.value = result.totals;
    } catch (exception) {
        console.error("Ошибка загрузки поездов:", exception);
        error.value = exception instanceof Error
            ? exception.message
            : "Не удалось загрузить поезда.";
        trains.value = [];
        totals.value = null;
    } finally {
        loading.value = false;
    }
}

function openRoutePlaceholder() {
    // Связанный маршрут будет подключён на следующем этапе.
}

onMounted(loadTrains);
</script>

<template>
  <main class="routes-page">
    <header class="page-header">
      <div>
        <div class="breadcrumbs">
          <span>База данных маршрутов</span>
          <span>/</span>
          <strong>Просмотр поездов</strong>
        </div>

        <h1>Просмотр поездов</h1>

        <p class="page-record-count">
          {{ loading ? "Загрузка данных…" : `Записей: ${trains.length}` }}
        </p>
      </div>

      <button
          class="refresh-button"
          type="button"
          :disabled="loading"
          :class="{ 'is-loading': loading }"
          @click="loadTrains">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
              d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-4.9 6H5.02A7 7 0 1 0 17.65 6.35Z" />
        </svg>
        <span>{{ loading ? "Загрузка…" : "Обновить" }}</span>
      </button>
    </header>

    <section class="workspace">
      <div class="workspace__main">
        <div class="table-card">
          <div class="table-card__toolbar">
          </div>

          <div class="table-container big-trains-table-container">
            <table class="trains-table big-trains-table">
              <thead>
              <tr>
                <th>Год</th>
                <th>Месяц</th>
                <th>№ поезда</th>
                <th>Маршрут</th>
                <th>Время отправления-прибытия</th>
                <th>Расстояние между станциями, км</th>
                <th>Количество вагонов, ед.</th>
                <th>Вагоно-километры в сутки</th>
                <th>Дней курсирования</th>
                <th>Вагоно-километры в месяц</th>
                <th>Доп. данные</th>
              </tr>
              <tr class="full-sum-header trains-total-row">
                <th colspan="5">Итого</th>
                <th class="numeric-cell">{{ formatDecimal(totals?.distance) }}</th>
                <th class="numeric-cell">{{ formatDecimal(totals?.railCarCount) }}</th>
                <th class="numeric-cell">{{ formatDecimal(totals?.rangePerDay) }}</th>
                <th class="numeric-cell">{{ formatDecimal(totals?.dayInRaise) }}</th>
                <th class="numeric-cell">{{ formatDecimal(totals?.rangePerMounth) }}</th>
                <th>—</th>
              </tr>
              </thead>

              <tbody>
              <tr v-if="loading">
                <td class="trains-state-cell" :colspan="columnsCount">
                  <div class="loading-state">
                    <span class="spinner"></span>
                    Загрузка данных по поездам…
                  </div>
                </td>
              </tr>

              <tr v-else-if="error">
                <td class="trains-state-cell" :colspan="columnsCount">
                  <div class="error-state">
                    <strong>Ошибка загрузки</strong>
                    <span>{{ error }}</span>
                    <button type="button" @click="loadTrains">Повторить</button>
                  </div>
                </td>
              </tr>

              <tr v-else-if="trains.length === 0">
                <td class="trains-state-cell" :colspan="columnsCount">
                  Поезда не найдены.
                </td>
              </tr>

              <template v-else>
                <tr
                    v-for="(train, index) in trains"
                    :key="train.id ?? index"
                    :title="`Строка в файле: ${train.rowInFile ?? '—'}`">
                  <td>{{ train.year ?? "—" }}</td>
                  <td>{{ train.month ?? "—" }}</td>
                  <td class="train-number-cell">
                    <button
                        class="route-link"
                        type="button"
                        title="Открыть связанный маршрут"
                        @click="openRoutePlaceholder">
                      {{ train.number ?? "—" }}
                    </button>
                  </td>
                  <td class="train-stations-cell">{{ formatStations(train) }}</td>
                  <td class="train-time-cell">{{ formatTrainTimes(train) }}</td>
                  <td class="numeric-cell">{{ formatDecimal(train.distance) }}</td>
                  <td class="numeric-cell">{{ formatInteger(train.railcarCount) }}</td>
                  <td class="numeric-cell">{{ formatInteger(train.rangePerDay) }}</td>
                  <td class="numeric-cell">{{ formatInteger(train.dayInRaise) }}</td>
                  <td class="numeric-cell">{{ formatInteger(train.rangePerMonth) }}</td>
                  <td>{{ train.description ?? "—" }}</td>
                </tr>
              </template>
              </tbody>
            </table>
          </div>

          <div class="table-information">
            <span class="table-information__accent"></span>
            <span>Для просмотра связанного маршрута нажмите на номер поезда.</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
