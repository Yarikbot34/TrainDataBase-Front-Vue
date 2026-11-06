<script setup>
import {
    computed,
    onMounted,
    ref
} from "vue";

import FilterComboboxV2 from "../components/FilterComboboxV2.vue";
import PeriodModal from "../components/PeriodModal.vue";

import {
    getFilteredTrains,
    getTrains
} from "../api/trainsApi";

import {
    getWrittenNumbers,
    getWrittenPeriods,
    getWrittenStations
} from "../api/routesApi";

const trains = ref([]);
const totals = ref(null);
const loading = ref(false);
const error = ref("");
const showPeriodModal = ref(false);
const availablePeriods = ref([]);
const selectedPeriod = ref([]);
const selectedNumbers = ref([]);
const selectedStationsFrom = ref([]);
const selectedStationsTo = ref([]);
const numberOptions = ref([]);
const stationOptions = ref([]);

const columnsCount = 11;

const hasActiveFilters = computed(() => {
    return selectedPeriod.value.length > 0 ||
        selectedNumbers.value.length > 0 ||
        selectedStationsFrom.value.length > 0 ||
        selectedStationsTo.value.length > 0;
});

const periodButtonText = computed(() => {
    if (!selectedPeriod.value.length) return "Весь период";
    const count = selectedPeriod.value.reduce(
        (total, item) => total + (item.months?.length ?? 0),
        0
    );
    return `Выбрано месяцев: ${count}`;
});

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
        const result = hasActiveFilters.value
            ? await getFilteredTrains(buildFilterRequest())
            : await getTrains();
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

function extractItems(payload) {
    if (Array.isArray(payload)) return payload;

    for (const collection of [
        payload?.result,
        payload?.data,
        payload?.items,
        payload?.content,
        payload?.periods,
        payload?.years
    ]) {
        if (Array.isArray(collection)) return collection;
    }

    return [];
}

function normalizePeriods(payload) {
    return extractItems(payload)
        .map((item) => {
            if (typeof item === "number" || typeof item === "string") {
                return { year: Number(item), months: Array.from({ length: 12 }, (_, index) => index + 1) };
            }

            return {
                year: Number(item?.year ?? item?.value ?? item?.period),
                months: Array.isArray(item?.months)
                    ? item.months.map(Number)
                    : Array.from({ length: 12 }, (_, index) => index + 1)
            };
        })
        .filter((item) => Number.isFinite(item.year));
}

function buildFilterRequest() {
    return {
        period: selectedPeriod.value.map((item) => ({
            year: Number(item.year),
            months: [...item.months].map(Number)
        })),
        numbers: selectedNumbers.value.map(String),
        stationsFrom: selectedStationsFrom.value.map(String),
        stationsTo: selectedStationsTo.value.map(String)
    };
}

function applyPeriod(period) {
    selectedPeriod.value = period;
    loadTrains();
}

function resetFilters() {
    selectedPeriod.value = [];
    selectedNumbers.value = [];
    selectedStationsFrom.value = [];
    selectedStationsTo.value = [];
    loadTrains();
}

async function loadFilterOptions() {
    try {
        const [numbers, stations, periods] = await Promise.all([
            getWrittenNumbers(),
            getWrittenStations(),
            getWrittenPeriods()
        ]);

        numberOptions.value = extractItems(numbers);
        stationOptions.value = extractItems(stations);
        availablePeriods.value = normalizePeriods(periods);
    } catch (exception) {
        console.error("Ошибка загрузки фильтров поездов:", exception);
        numberOptions.value = [];
        stationOptions.value = [];
        availablePeriods.value = [];
    }
}

function openRoutePlaceholder() {
    // Связанный маршрут будет подключён на следующем этапе.
}

onMounted(async () => {
    await Promise.all([loadFilterOptions(), loadTrains()]);
});
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
           <div class="table-card__toolbar routes-toolbar routes-filters trains-filters">
             <div class="filter-combobox period-filter">
               <span class="filter-combobox__label">Период</span>
               <button class="filter-combobox__button period-filter__button" type="button" @click="showPeriodModal = true">
                 <span class="filter-combobox__value">{{ periodButtonText }}</span>
                 <svg class="filter-combobox__caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5-1.4-1.4L12 11.2 8.4 7.6 7 9Z" /></svg>
               </button>
             </div>

             <FilterComboboxV2
                 v-model="selectedNumbers"
                 :options="numberOptions"
                 label="№ поезда"
                 all-text="Все поезда"
                 @change="loadTrains" />

             <FilterComboboxV2
                 v-model="selectedStationsFrom"
                 :options="stationOptions"
                 label="Станция отправления"
                 all-text="Все станции"
                 @change="loadTrains" />

             <FilterComboboxV2
                 v-model="selectedStationsTo"
                 :options="stationOptions"
                 label="Станция прибытия"
                 all-text="Все станции"
                 @change="loadTrains" />

             <div class="filters-actions">
               <button class="filters-reset-button" type="button" :class="{ 'is-active': hasActiveFilters }" @click="resetFilters">
                 Сбросить фильтры
               </button>
             </div>
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

    <PeriodModal
        v-model="showPeriodModal"
        :periods="availablePeriods"
        :selected-period="selectedPeriod"
        caption="Фильтр поездов"
        @apply="applyPeriod" />
  </main>
</template>
