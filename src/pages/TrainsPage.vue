<script setup>
import {
    computed,
    onMounted,
    ref
} from "vue";

import FilterComboboxV2 from "../components/FilterComboboxV2.vue";
import PeriodModal from "../components/PeriodModal.vue";
import { useColumnSort } from "../composables/useColumnSort";

import {
    getFilteredTrains,
    getTrains
} from "../api/trainsApi";

import {
    getWrittenNumbers,
    getWrittenPeriods,
    getWrittenStations,
    getTrainRoute
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
const selectedRoute = ref(null);
const routeLoading = ref(false);
const routeError = ref("");
const selectedRouteRequestId = ref(0);

const columnsCount = 11;

const {
    sortKey,
    sortDirection,
    toggleSort,
    headerSortClass,
    headerAriaSort,
    sortIndicator
} = useColumnSort();

const textSortColumns = new Set([
    "number",
    "route",
    "time"
]);

const sortColumnValueById = {
    year: (train) => Number(train.year ?? 0),
    month: (train) => Number(train.month ?? 0),
    number: (train) => train.number ?? "",
    route: (train) => formatStations(train),
    time: (train) => formatTrainTimes(train),
    distance: (train) => Number(train.distance ?? 0),
    railcarCount: (train) => Number(train.railcarCount ?? 0),
    rangePerDay: (train) => Number(train.rangePerDay ?? 0),
    dayInRaise: (train) => Number(train.dayInRaise ?? 0),
    rangePerMonth: (train) => Number(train.rangePerMonth ?? 0)
};

const sortedTrains = computed(() => {
    if (!sortKey.value || !sortDirection.value) {
        return trains.value;
    }

    const multiplier = sortDirection.value === "asc" ? 1 : -1;
    const getValue = sortColumnValueById[sortKey.value];
    const useTextCompare = textSortColumns.has(sortKey.value);

    return [...trains.value].sort((first, second) => {
        const firstValue = getValue(first);
        const secondValue = getValue(second);

        if (useTextCompare) {
            return String(firstValue ?? "").localeCompare(
                String(secondValue ?? ""),
                "ru",
                { numeric: true, sensitivity: "base" }
            ) * multiplier;
        }

        const difference =
            Number(firstValue ?? 0) -
            Number(secondValue ?? 0);

        return difference * multiplier;
    });
});

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

async function openRoute(train) {
    selectedRoute.value = null;
    routeError.value = "";

    const requestId = ++selectedRouteRequestId.value;
    routeLoading.value = true;

    try {
        const route = await getTrainRoute(
            train.year,
            train.month,
            train.number
        );

        if (requestId === selectedRouteRequestId.value) {
            selectedRoute.value = route;
        }
    } catch (exception) {
        if (requestId !== selectedRouteRequestId.value) return;

        console.error("Ошибка загрузки связанного маршрута:", exception);
        routeError.value = exception?.status === 404
            ? "Связанный маршрут не найден."
            : exception instanceof Error
                ? exception.message
                : "Не удалось загрузить связанный маршрут.";
    } finally {
        if (requestId === selectedRouteRequestId.value) {
            routeLoading.value = false;
        }
    }
}

function closeRoute() {
    selectedRouteRequestId.value += 1;
    selectedRoute.value = null;
    routeError.value = "";
    routeLoading.value = false;
}

onMounted(async () => {
    await Promise.all([loadFilterOptions(), loadTrains()]);
});
</script>

<template>
  <main class="routes-page trains-page">
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

    <section class="workspace" :class="{ 'is-split': routeLoading || selectedRoute || routeError }">
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
                <th
                    class="is-sortable"
                    :class="headerSortClass('year')"
                    :aria-sort="headerAriaSort('year')"
                    @click="toggleSort('year')">
                  Год
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('year') }}</span>
                </th>
                <th
                    class="is-sortable"
                    :class="headerSortClass('month')"
                    :aria-sort="headerAriaSort('month')"
                    @click="toggleSort('month')">
                  Месяц
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('month') }}</span>
                </th>
                <th
                    class="is-sortable"
                    :class="headerSortClass('number')"
                    :aria-sort="headerAriaSort('number')"
                    @click="toggleSort('number')">
                  № поезда
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('number') }}</span>
                </th>
                <th
                    class="is-sortable"
                    :class="headerSortClass('route')"
                    :aria-sort="headerAriaSort('route')"
                    @click="toggleSort('route')">
                  Маршрут
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('route') }}</span>
                </th>
                <th
                    class="is-sortable"
                    :class="headerSortClass('time')"
                    :aria-sort="headerAriaSort('time')"
                    @click="toggleSort('time')">
                  Время отправления-прибытия
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('time') }}</span>
                </th>
                <th
                    class="is-sortable"
                    :class="headerSortClass('distance')"
                    :aria-sort="headerAriaSort('distance')"
                    @click="toggleSort('distance')">
                  Расстояние между станциями, км
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('distance') }}</span>
                </th>
                <th
                    class="is-sortable"
                    :class="headerSortClass('railcarCount')"
                    :aria-sort="headerAriaSort('railcarCount')"
                    @click="toggleSort('railcarCount')">
                  Количество вагонов, ед.
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('railcarCount') }}</span>
                </th>
                <th
                    class="is-sortable"
                    :class="headerSortClass('rangePerDay')"
                    :aria-sort="headerAriaSort('rangePerDay')"
                    @click="toggleSort('rangePerDay')">
                  Вагоно-километры в сутки
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('rangePerDay') }}</span>
                </th>
                <th
                    class="is-sortable"
                    :class="headerSortClass('dayInRaise')"
                    :aria-sort="headerAriaSort('dayInRaise')"
                    @click="toggleSort('dayInRaise')">
                  Дней курсирования
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('dayInRaise') }}</span>
                </th>
                <th
                    class="is-sortable"
                    :class="headerSortClass('rangePerMonth')"
                    :aria-sort="headerAriaSort('rangePerMonth')"
                    @click="toggleSort('rangePerMonth')">
                  Вагоно-километры в месяц
                  <span class="sort-indicator" aria-hidden="true">{{ sortIndicator('rangePerMonth') }}</span>
                </th>
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
                    v-for="(train, index) in sortedTrains"
                    :key="train.id ?? index"
                    :title="`Строка в файле: ${train.rowInFile ?? '—'}`">
                  <td>{{ train.year ?? "—" }}</td>
                  <td>{{ train.month ?? "—" }}</td>
                  <td class="train-number-cell">
                    <button
                        class="route-link"
                        type="button"
                        title="Открыть связанный маршрут"
                         @click="openRoute(train)">
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

         <aside v-if="routeLoading || selectedRoute || routeError" class="workspace__details">
           <div class="details-panel__header details-panel__header--compact">
             <span class="details-panel__caption">Связанный маршрут</span>
             <button
                 class="icon-button"
                 type="button"
                 aria-label="Закрыть"
                 @click="closeRoute">
               ×
             </button>
           </div>

           <div class="trains-table-container">
             <table class="routes-table routes-table-small">
               <thead>
               <tr>
                 <th>Год</th>
                 <th>Месяц</th>
                 <th>№ маршрута</th>
                 <th>Количество пассажиров, чел.</th>
                 <th>Средняя дальность поездки, км</th>
                 <th>Доходы от перевозки пассажиров, руб.</th>
                 <th>Доходы от субъектов, руб.</th>
               </tr>
               </thead>
               <tbody>
               <tr v-if="routeLoading">
                 <td class="trains-state-cell" colspan="7">
                   <div class="loading-state">
                     <span class="spinner"></span>
                     Загрузка данных…
                   </div>
                 </td>
               </tr>
               <tr v-else-if="routeError">
                 <td class="trains-state-cell" colspan="7">{{ routeError }}</td>
               </tr>
               <tr v-else>
                 <td>{{ selectedRoute?.year ?? "—" }}</td>
                 <td>{{ selectedRoute?.month ?? "—" }}</td>
                 <td>{{ selectedRoute?.routeNumber ?? "—" }}</td>
                 <td class="numeric-cell">{{ formatInteger(selectedRoute?.summary?.count) }}</td>
                 <td class="numeric-cell">{{ formatDecimal(selectedRoute?.summary?.wayLength) }}</td>
                 <td class="numeric-cell">{{ formatInteger(selectedRoute?.summary?.payment) }}</td>
                 <td class="numeric-cell">{{ formatInteger(selectedRoute?.summary?.paymentBySubject) }}</td>
               </tr>
               </tbody>
             </table>
           </div>
         </aside>
       </section>

    <PeriodModal
        v-model="showPeriodModal"
        :periods="availablePeriods"
        :selected-period="selectedPeriod"
        caption="Фильтр поездов"
        @apply="applyPeriod" />
  </main>
</template>
