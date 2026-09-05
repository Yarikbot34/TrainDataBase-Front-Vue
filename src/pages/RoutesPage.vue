<script setup>
import {
  computed,
  onMounted,
  ref
} from "vue";

import FilterCombobox from "../components/FilterCombobox.vue";
import PeriodModal from "../components/PeriodModal.vue";
import RecordDescriptionModal from
      "../components/RecordDescriptionModal.vue";

import {
  updateRecordDescription
} from "../api/importApi";

import {
  getFilteredRoutes,
  getRoutes,
  getTrains,
  getWrittenNumbers,
  getWrittenPeriods,
  getWrittenStations
} from "../api/routesApi";

import {
  useAuth
} from "../stores/auth";

const routes = ref([]);
const trains = ref([]);


const EMPTY_SUMMARY = Object.freeze({
  fullSum: 0,
  casualSum: 0,
  studentSum: 0,
  fedBenefitSum: 0,
  regBenefitSum: 0,
  another: 0
});

function createEmptySummary() {
  return {
    ...EMPTY_SUMMARY
  };
}

function setRoutesData(data) {
  routes.value = sortRoutes(
      Array.isArray(data?.routes)
          ? data.routes
          : []
  );

  routeTotals.value = {
    summCount: {
      ...EMPTY_SUMMARY,
      ...(data?.summCount ?? {})
    },
    summPayment: {
      ...EMPTY_SUMMARY,
      ...(data?.summPayment ?? {})
    },
    averWayLength: {
      ...EMPTY_SUMMARY,
      ...(data?.averWayLength ?? {})
    },
    summPaymentBySubj: {
      ...EMPTY_SUMMARY,
      ...(data?.summPaymentBySubj ?? {})
    }
  };
}

async function loadRoutes() {
  loading.value = true;
  error.value = "";

  try {
    const data = hasActiveFilters.value
        ? await getFilteredRoutes(
            buildFilterRequest()
        )
        : await getRoutes();

    /*
     * Важно: теперь API возвращает не массив,
     * а нормализованный объект с маршрутами
     * и суммарными значениями.
     */
    setRoutesData(data);

    showNotification(
        `Данные загружены. Записей: ${routes.value.length}`
    );
  } catch (exception) {
    console.error(
        "Ошибка загрузки маршрутов:",
        exception
    );

    error.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось загрузить маршруты.";

    setRoutesData(null);

    showNotification(
        "Не удалось загрузить маршруты.",
        "error"
    );
  } finally {
    loading.value = false;
    closeDetails();
  }
}

const routeTotals = ref({
  summCount: { ...EMPTY_SUMMARY },
  summPayment: { ...EMPTY_SUMMARY },
  averWayLength: { ...EMPTY_SUMMARY },
  summPaymentBySubj: { ...EMPTY_SUMMARY }
});

const loading = ref(false);
const trainsLoading = ref(false);

const error = ref("");
const trainsError = ref("");

const showPeriodModal = ref(false);
const availablePeriods = ref([]);
const selectedPeriod = ref([]);

const selectedRoute = ref(null);
const selectedRequestId = ref(0);

const searchQuery = ref("");

const selectedNumber = ref("");
const selectedStationFrom = ref("");
const selectedStationTo = ref("");

const numberOptions = ref([]);
const stationOptions = ref([]);

const notification = ref("");
const notificationType = ref("success");
const auth = useAuth();

const editedTrain = ref(null);
const editedTrainIndex = ref(-1);

const isSendingDescription = ref(false);
const descriptionError = ref("");

const canEditDescriptions = computed(() => {
  return auth.roles.value.some((role) => {
    const normalizedRole = String(role)
        .toLocaleLowerCase("ru");

    return normalizedRole === "admin" ||
        normalizedRole === "upload";
  });
});

let notificationTimer = null;

const monthOptions = Object.freeze([
  { value: 1, label: "Январь" },
  { value: 2, label: "Февраль" },
  { value: 3, label: "Март" },
  { value: 4, label: "Апрель" },
  { value: 5, label: "Май" },
  { value: 6, label: "Июнь" },
  { value: 7, label: "Июль" },
  { value: 8, label: "Август" },
  { value: 9, label: "Сентябрь" },
  { value: 10, label: "Октябрь" },
  { value: 11, label: "Ноябрь" },
  { value: 12, label: "Декабрь" }
]);

const filteredRoutes = computed(() => {
  const query = searchQuery.value
      .trim()
      .toLocaleLowerCase("ru");

  if (!query) {
    return routes.value;
  }

  return routes.value.filter((route) => {
    const routeNumber = String(
        route.routeNumber ??
        route.number ??
        ""
    ).toLocaleLowerCase("ru");

    return routeNumber.includes(query);
  });
});

const hasActiveFilters = computed(() => {
  return Boolean(
      selectedNumber.value ||
      selectedStationFrom.value ||
      selectedStationTo.value ||
      selectedPeriod.value.length > 0
  );
});

const periodButtonText = computed(() => {
  if (selectedPeriod.value.length === 0) {
    return "Весь период";
  }

  const monthCount = selectedPeriod.value.reduce(
      (total, item) => {
        return total + (item.months?.length ?? 0);
      },
      0
  );

  return `Выбрано месяцев: ${monthCount}`;
});

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

function apiYear(value) {
  return String(value ?? "");
}

function apiMonth(value) {
  return String(toNumber(value));
}

function formatInteger(value) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function formatDecimal(value) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(toNumber(value));
}

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toNumber(value));
}

function formatMetricValue(metric, value) {
  if (metric.formatter === "integer") {
    return formatInteger(value);
  }

  if (metric.formatter === "money") {
    return formatMoney(value);
  }

  return formatDecimal(value);
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  return String(value).slice(0, 5);
}

function getRouteMetric(route, categoryKey, metricKey) {
  return route?.[categoryKey]?.[metricKey] ?? 0;
}

function getGroupFullSum(metric) {
  return routeTotals.value?.[metric.summaryKey]
      ?.fullSum ?? 0;
}

function getCategoryTotal(metric, category) {
  return routeTotals.value?.[metric.summaryKey]
      ?.[category.totalKey] ?? 0;
}

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

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  return [];
}

function sortRoutes(items) {
  return [...items].sort((first, second) => {
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

    return String(
        first.routeNumber ?? ""
    ).localeCompare(
        String(second.routeNumber ?? ""),
        "ru",
        {
          numeric: true,
          sensitivity: "base"
        }
    );
  });
}

function buildFilterRequest() {
  return {
    period:
        selectedPeriod.value.length > 0
            ? selectedPeriod.value.map((item) => ({
              year: Number(item.year),
              months: [...item.months]
            }))
            : null,

    number: selectedNumber.value
        ? String(selectedNumber.value)
        : null,

    stationFrom: selectedStationFrom.value
        ? String(selectedStationFrom.value)
        : null,

    stationTo: selectedStationTo.value
        ? String(selectedStationTo.value)
        : null
  };
}

function showNotification(
    message,
    type = "success"
) {
  notification.value = message;
  notificationType.value = type;

  window.clearTimeout(notificationTimer);

  notificationTimer = window.setTimeout(() => {
    notification.value = "";
  }, 3200);
}

function applyPeriod(period) {
  selectedPeriod.value = period;
  loadRoutes();
}

async function loadFilterOptions() {
  try {
    const [
      numbersPayload,
      stationsPayload,
      periodsPayload
    ] = await Promise.all([
      getWrittenNumbers(),
      getWrittenStations(),
      getWrittenPeriods()
    ]);

    numberOptions.value =
        extractItems(numbersPayload);

    stationOptions.value =
        extractItems(stationsPayload);

    availablePeriods.value =
        normalizePeriods(periodsPayload);
  } catch (exception) {
    console.error(
        "Ошибка загрузки фильтров:",
        exception
    );

    availablePeriods.value = [];
  }
}

function normalizePeriods(payload) {
  const items = extractItems(payload);

  return items
      .map((item) => {
        if (typeof item === "number") {
          return {
            year: item,
            months: monthOptions.map(
                (month) => month.value
            )
          };
        }

        const year = Number(
            item.year ??
            item.value ??
            item.period
        );

        const months = Array.isArray(item.months)
            ? item.months.map(Number)
            : monthOptions.map(
                (month) => month.value
            );

        return {
          year,
          months
        };
      })
      .filter((item) => {
        return Number.isFinite(item.year);
      });
}

function resetFilters() {
  selectedNumber.value = "";
  selectedStationFrom.value = "";
  selectedStationTo.value = "";
  selectedPeriod.value = [];
  searchQuery.value = "";

  loadRoutes();
}

function getStationName(station) {
  if (!station) {
    return null;
  }

  if (typeof station === "string") {
    return station;
  }

  return (
      station.name ??
      station.stationName ??
      station.title ??
      station.fullName ??
      null
  );
}

function formatStations(train) {
  const from = getStationName(
      train.stationFrom
  );

  const middle = getStationName(
      train.stationMiddle
  );

  const to = getStationName(
      train.stationTo
  );

  if (from && middle && to) {
    return `${from} — ${middle} — ${to}`;
  }

  if (from && to) {
    return `${from} — ${to}`;
  }

  if (from) {
    return `${from} — станция назначения не указана`;
  }

  if (to) {
    return `Станция отправления не указана — ${to}`;
  }

  return "Станции не указаны";
}

function formatTrainTimes(train) {
  const from = formatTime(train.timeFrom);
  const to = formatTime(train.timeTo);

  if (from === "—" && to === "—") {
    return "Время не указано";
  }

  return `${from} — ${to}`;
}

async function openDetails(route) {
  selectedRoute.value = route;
  trains.value = [];
  trainsError.value = "";

  const requestId =
      ++selectedRequestId.value;

  trainsLoading.value = true;

  try {
    const payload = await getTrains(
        apiYear(route.year),
        apiMonth(route.month),
        route.routeNumber
    );

    if (
        requestId !== selectedRequestId.value
    ) {
      return;
    }

    trains.value = extractItems(payload);
  } catch (exception) {
    if (
        requestId !== selectedRequestId.value
    ) {
      return;
    }

    console.error(
        "Ошибка загрузки поездов:",
        exception
    );

    trainsError.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось загрузить данные по поездам.";

    showNotification(
        "Не удалось загрузить данные по поездам.",
        "error"
    );
  } finally {
    if (
        requestId === selectedRequestId.value
    ) {
      trainsLoading.value = false;
    }
  }
}

function closeDetails() {
  closeDescriptionEditor();

  selectedRequestId.value += 1;
  selectedRoute.value = null;
  trains.value = [];
  trainsError.value = "";
  trainsLoading.value = false;
}

function openDescriptionEditor(train, index) {
  if (
      !canEditDescriptions.value ||
      isSendingDescription.value
  ) {
    return;
  }

  editedTrain.value = train;
  editedTrainIndex.value = index;
  descriptionError.value = "";
}

function closeDescriptionEditor() {
  if (isSendingDescription.value) {
    return;
  }

  editedTrain.value = null;
  editedTrainIndex.value = -1;
  descriptionError.value = "";
}

async function saveTrainDescription(description) {
  const train = editedTrain.value;
  const trainIndex = editedTrainIndex.value;

  if (
      !train ||
      trainIndex < 0 ||
      isSendingDescription.value
  ) {
    return;
  }

  if (
      train.id === undefined ||
      train.id === null
  ) {
    descriptionError.value =
        "Не удалось сохранить описание: отсутствует идентификатор поезда.";

    return;
  }

  isSendingDescription.value = true;
  descriptionError.value = "";

  try {
    await updateRecordDescription(
        train.id,
        train,
        description
    );

    trains.value[trainIndex] = {
      ...train,
      description
    };

    editedTrain.value = trains.value[trainIndex];

    showNotification(
        "Описание поезда успешно сохранено."
    );

    closeDescriptionEditor();
  } catch (exception) {
    console.error(
        "Ошибка сохранения описания поезда:",
        exception
    );

    descriptionError.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось сохранить описание поезда.";
  } finally {
    isSendingDescription.value = false;
  }
}


onMounted(async () => {
  await Promise.all([
    loadFilterOptions(),
    loadRoutes()
  ]);
});
const categories = Object.freeze([
  {
    key: "casual",
    totalKey: "casualSum",
    label: "Без льгот"
  },
  {
    key: "student",
    totalKey: "studentSum",
    label: "Обучающиеся"
  },
  {
    key: "fedBenefit",
    totalKey: "fedBenefitSum",
    label: "Федеральные льготники"
  },
  {
    key: "regBenefit",
    totalKey: "regBenefitSum",
    label: "Региональные льготники"
  },
  {
    key: "another",
    totalKey: "another",
    label: "Иные пассажиры"
  }
]);

const metricGroups = Object.freeze([
  {
    key: "count",
    summaryKey: "summCount",
    title:
        "Количество перевезённых пассажиров, чел.",
    formatter: "integer"
  },
  {
    key: "wayLength",
    summaryKey: "averWayLength",
    title:
        "Средняя дальность поездки, км",
    formatter: "decimal"
  },
  {
    key: "payment",
    summaryKey: "summPayment",
    title:
        "Доходы от перевозки пассажиров, руб.",
    formatter: "money"
  },
  {
    key: "paymentBySubject",
    summaryKey: "summPaymentBySubj",
    title:
        "Доходы от субъектов, установивших льготы, руб.",
    formatter: "money"
  }
]);
</script>

<template>
  <main class="routes-page">
    <header class="page-header">
      <div>
        <div class="breadcrumbs">
          <span>База данных маршрутов</span>
          <span>/</span>
          <strong>Просмотр маршрутов</strong>
        </div>

        <h1>Просмотр маршрутов</h1>

        <p>
          Сводные данные по перевозкам пассажиров
          и доходам
        </p>
      </div>

      <button
          class="refresh-button"
          type="button"
          :disabled="loading"
          :class="{ 'is-loading': loading }"
          @click="loadRoutes">
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true">
          <path
              d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-4.9 6H5.02A7 7 0 1 0 17.65 6.35Z" />
        </svg>

        <span>
          {{ loading ? "Загрузка…" : "Обновить" }}
        </span>
      </button>
    </header>

    <section
        class="workspace"
        :class="{ 'is-split': selectedRoute }">
      <div class="workspace__main">
        <div class="table-card">
          <div
              class="table-card__toolbar routes-toolbar">
            <div>
              <h2>Маршруты</h2>

              <p>
                {{
                  loading
                      ? "Загрузка данных…"
                      : `Записей: ${filteredRoutes.length}`
                }}
              </p>
            </div>

            <label class="search-field">
              <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                <path
                    d="m21 19.6-4.7-4.7a7 7 0 1 0-1.4 1.4l4.7 4.7 1.4-1.4ZM5 10a5 5 0 1 1 10 0A5 5 0 0 1 5 10Z" />
              </svg>

              <input
                  v-model="searchQuery"
                  type="search"
                  placeholder="Поиск по номеру маршрута" />
            </label>
          </div>

          <div class="filters-bar routes-filters">
            <div class="filter-combobox period-filter">
    <span class="filter-combobox__label">
      Период
    </span>

              <button
                  class="
        filter-combobox__button
        period-filter__button
      "
                  type="button"
                  @click="showPeriodModal = true">
      <span class="filter-combobox__value">
        {{ periodButtonText }}
      </span>

                <svg
                    class="filter-combobox__caret"
                    viewBox="0 0 24 24"
                    aria-hidden="true">
                  <path
                      d="
 m7 9
            5 5
            5-5
            -1.4-1.4
            L12 11.2
            8.4 7.6
            7 9Z
          " />
                </svg>
              </button>
            </div>

            <FilterCombobox
                v-model="selectedNumber"
                :options="numberOptions"
                label="Номер маршрута"
                all-text="Все номера"
                placeholder="Поиск номера маршрута"
                @change="loadRoutes" />

            <FilterCombobox
                v-model="selectedStationFrom"
                :options="stationOptions"
                label="Станция отправления"
                all-text="Все станции"
                placeholder="Поиск станции отправления"
                @change="loadRoutes" />

            <FilterCombobox
                v-model="selectedStationTo"
                :options="stationOptions"
                label="Станция прибытия"
                all-text="Все станции"
                placeholder="Поиск станции прибытия"
                @change="loadRoutes" />

            <button
                class="filters-reset-button"
                type="button"
                :class="{
      'is-active': hasActiveFilters
    }"
                @click="resetFilters">
              Сбросить фильтры
            </button>
          </div>

          <div class="table-container">
            <table class="routes-table">
              <thead>
              <tr class="group-header">
                <th
                    class="sticky-column sticky-column--year"
                    rowspan="3">
                  Год
                </th>

                <th
                    class="sticky-column sticky-column--month"
                    rowspan="3">
                  Месяц
                </th>

                <th
                    class="sticky-column sticky-column--route"
                    rowspan="3">
                  № поезда
                </th>

                <th
                    v-for="metric in metricGroups"
                    :key="metric.key"
                    colspan="5">
                  {{ metric.title }}
                </th>
              </tr>

              <!-- Отдельный класс вместо column-header -->
              <tr class="full-sum-header">
                <th
                    v-for="metric in metricGroups"
                    :key="`full-${metric.key}`"
                    colspan="5">
                  Итого:
                  {{
                    formatMetricValue(
                        metric,
                        getGroupFullSum(metric)
                    )
                  }}
                </th>
              </tr>

              <tr class="column-header">
                <template
                    v-for="metric in metricGroups"
                    :key="`categories-${metric.key}`">
                  <th
                      v-for="category in categories"
                      :key="
            `${metric.key}-${category.key}`
          ">
          <span>
            {{ category.label }}
          </span>
                  </th>
                </template>
              </tr>
              </thead>

              <tbody>
              <tr v-if="loading">
                <td
                    class="state-cell"
                    colspan="23">
                  <div class="loading-state">
                    <span class="spinner"></span>
                    Загрузка маршрутов…
                  </div>
                </td>
              </tr>

              <tr v-else-if="error">
                <td
                    class="state-cell"
                    colspan="23">
                  <div class="error-state">
                    <strong>
                      Ошибка загрузки
                    </strong>

                    <span>{{ error }}</span>

                    <button
                        type="button"
                        @click="loadRoutes">
                      Повторить
                    </button>
                  </div>
                </td>
              </tr>

              <tr
                  v-else-if="
        filteredRoutes.length === 0
      ">
                <td
                    class="state-cell"
                    colspan="23">
                  Маршруты не найдены
                </td>
              </tr>

              <template v-else>
                <!--
                  Суммарная строка находится перед маршрутами,
                  поэтому её всегда видно сразу после заголовка.
                -->
                <tr class="routes-total-row">
                  <th
                      class="routes-total-row__label"
                      colspan="3">
                    Итого
                  </th>

                  <template
                      v-for="metric in metricGroups"
                      :key="`total-${metric.key}`">
                    <td
                        v-for="category in categories"
                        :key="
              `total-${metric.key}-${category.key}`
            "
                        class="numeric-cell">
                      {{
                        formatMetricValue(
                            metric,
                            getCategoryTotal(
                                metric,
                                category
                            )
                        )
                      }}
                    </td>
                  </template>
                </tr>

                <tr
                    v-for="(route, index) in filteredRoutes"
                    :key="
          route.id ??
          `${route.year}-${route.month}-${route.routeNumber}-${index}`
        ">
                  <td
                      class="sticky-column sticky-column--year">
                    {{ formatYear(route.year) }}
                  </td>

                  <td
                      class="sticky-column sticky-column--month">
                    {{ formatMonth(route.month) }}
                  </td>

                  <td
                      class="
            sticky-column
            sticky-column--route
            route-cell
          ">
                    <button
                        class="route-link"
                        type="button"
                        title="Открыть данные по поездам"
                        @click="openDetails(route)">
                      {{
                        route.routeNumber ??
                        route.number ??
                        "—"
                      }}
                    </button>
                  </td>

                  <template
                      v-for="metric in metricGroups"
                      :key="
            `route-${index}-${metric.key}`
          ">
                    <td
                        v-for="category in categories"
                        :key="
              `${index}-${metric.key}-${category.key}`
            "
                        class="numeric-cell">
                      {{
                        formatMetricValue(
                            metric,
                            getRouteMetric(
                                route,
                                category.key,
                                metric.key
                            )
                        )
                      }}
                    </td>
                  </template>
                </tr>
              </template>
              </tbody>
            </table>
          </div>

          <div class="table-information">
            <span
                class="table-information__accent">
            </span>

            <span>
              Для просмотра поездов нажмите на номер
              маршрута.
            </span>
          </div>
        </div>
      </div>

      <aside class="workspace__details">
        <div class="details-panel__header">
          <div>
            <span class="details-panel__caption">
              Данные по поездам
            </span>

            <h2>
              {{
                selectedRoute
                    ? `Поезда маршрута ${selectedRoute.routeNumber} за ${formatMonth(selectedRoute.month)}.${formatYear(selectedRoute.year)}`
                    : "Поезда не выбраны"
              }}
            </h2>

            <p class="details-panel__counter">
              {{
                selectedRoute
                    ? `Найдено поездов: ${trains.length}`
                    : "Выберите номер маршрута в таблице"
              }}
            </p>
          </div>

          <button
              class="icon-button"
              type="button"
              aria-label="Закрыть"
              @click="closeDetails">
            ×
          </button>
        </div>

        <div class="trains-table-container">
          <table class="trains-table">
            <thead>
            <tr>
              <th>№ поезда</th>

              <th>
                Станция отправления —
                станция назначения
              </th>

              <th>
                Время отправления-прибытия
              </th>

              <th>
                Расстояние между станциями, км
              </th>

              <th>
                Количество вагонов, ед.
              </th>

              <th>
                Вагоно-километры в сутки
              </th>

              <th>
                Количество дней курсирования
              </th>

              <th>
                Вагоно-километры в месяц
              </th>

              <th>Доп. данные</th>

              <th class="train-row-in-file-column">
                № строки в файле
              </th>
            </tr>
            </thead>

            <tbody>
            <tr v-if="trainsLoading">
              <td
                  class="trains-state-cell"
                  colspan="10">
                <div class="loading-state">
                  <span class="spinner"></span>
                  Загрузка данных по поездам…
                </div>
              </td>
            </tr>

            <tr v-else-if="trainsError">
              <td
                  class="trains-state-cell"
                  colspan="10">
                {{ trainsError }}
              </td>
            </tr>

            <tr
                v-else-if="
                  selectedRoute &&
                  trains.length === 0
                ">
              <td
                  class="trains-state-cell"
                  colspan="10">
                По выбранному маршруту данные
                не найдены.
              </td>
            </tr>

            <tr v-else-if="!selectedRoute">
              <td
                  class="trains-state-cell"
                  colspan="10">
                Выберите номер маршрута в верхней
                таблице.
              </td>
            </tr>

            <tr
                v-for="(train, index) in trains"
                v-else
                :key="train.id ?? index">
              <td class="train-number-cell">
                {{ train.number ?? "—" }}
              </td>

              <td class="train-stations-cell">
                {{ formatStations(train) }}
              </td>

              <td class="train-time-cell">
                {{ formatTrainTimes(train) }}
              </td>

              <td class="numeric-cell">
                {{
                  formatDecimal(train.distance)
                }}
              </td>

              <td class="numeric-cell">
                {{
                  formatInteger(
                      train.railcarCount
                  )
                }}
              </td>

              <td class="numeric-cell">
                {{
                  formatInteger(
                      train.rangePerDay
                  )
                }}
              </td>

              <td class="numeric-cell">
                {{
                  formatInteger(
                      train.dayInRaise
                  )
                }}
              </td>

              <td class="numeric-cell">
                {{
                  formatInteger(
                      train.rangePerMonth
                  )
                }}
              </td>

              <td
                  @dblclick="openDescriptionEditor(train, index)"
              >
                {{ train.description ?? "—" }}
              </td>

              <td class="train-row-in-file-column">
                {{ train.rowInFile ?? "—" }}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </aside>
    </section>

    <div
        v-if="notification"
        class="notification is-visible"
        :class="{
        'is-error':
          notificationType === 'error'
      }">
      {{ notification }}
    </div>

    <PeriodModal
        v-model="showPeriodModal"
        :periods="availablePeriods"
        :selected-period="selectedPeriod"
        @apply="applyPeriod" />
  </main>

  <RecordDescriptionModal
      v-if="editedTrain"
      :record="editedTrain"
      :current-index="0"
      :total-records="1"
      :is-sending="isSendingDescription"
      :error="descriptionError"
      @close="closeDescriptionEditor"
      @skip="closeDescriptionEditor"
      @save="saveTrainDescription"
  />
</template>