<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref
} from "vue";

import ApexCharts from "apexcharts";

import {
  getPaymentStatistics,
  getPassengerStatistics,
  getWrittenYears
} from "../api/statisticsApi";

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек"
];

const KINDS = [
  "passengers",
  "payment"
];

const passengerChartElement = ref(null);
const paymentChartElement = ref(null);

const passengerChart = ref(null);
const paymentChart = ref(null);

const years = ref([]);

const loadingYears = ref(false);

const states = ref({
  passengers: {
    year: null,
    rows: [],
    loading: false,
    error: "",
    view: "both"
  },

  payment: {
    year: null,
    rows: [],
    loading: false,
    error: "",
    view: "both"
  }
});

const passengerState = computed(() => {
  return states.value.passengers;
});

const paymentState = computed(() => {
  return states.value.payment;
});

function unwrapArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.result,
    payload?.data,
    payload?.items,
    payload?.content,
    payload?.years
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function formatYear(year) {
  const numericYear = Number(year);

  if (!Number.isFinite(numericYear)) {
    return String(year ?? "");
  }

  return numericYear < 100
      ? String(2000 + numericYear)
      : String(numericYear);
}

function yearForApi(year) {
  return year;
}

function formatNumber(value, digits = 0) {
  if (
      value === null ||
      value === undefined ||
      Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatMonth(row) {
  const month = Number(row.month);

  if (!Number.isFinite(month)) {
    return "—";
  }

  return MONTHS_SHORT[month - 1] ?? String(month);
}

function formatMonthLabel(row) {
  return `${formatMonth(row)} ${formatYear(row.year)}`;
}

function percent(value) {
  return `${formatNumber(value, 2)}%`;
}

function extractRows(payload) {
  return unwrapArray(payload)
      .map((row) => ({
        ...row,
        year: Number(row.year),
        month: Number(row.month)
      }))
      .sort((first, second) => {
        return (
            first.year - second.year ||
            first.month - second.month
        );
      });
}

function currentDefaultYear() {
  return new Date().getFullYear() % 100;
}

function normalizedYears(items) {
  return items
      .map((year) => {
        if (typeof year === "object") {
          return year.value ??
              year.year ??
              year.period;
        }

        return year;
      })
      .filter((year) =>
          year !== null &&
          year !== undefined &&
          Number.isFinite(Number(year))
      )
      .map((year) => Number(year))
      .sort((first, second) => {
        return second - first;
      });
}

function getRows(kind) {
  return states.value[kind].rows;
}

function destroyChart(kind) {
  if (kind === "passengers" && passengerChart.value) {
    passengerChart.value.destroy();
    passengerChart.value = null;
  }

  if (kind === "payment" && paymentChart.value) {
    paymentChart.value.destroy();
    paymentChart.value = null;
  }
}

function getChartElement(kind) {
  return kind === "passengers"
      ? passengerChartElement.value
      : paymentChartElement.value;
}

function buildBaseChartOptions(rows, kind) {
  return {
    chart: {
      type: "line",
      height: 350,
      fontFamily:
          'Inter, "Segoe UI", Arial, sans-serif',
      zoom: {
        enabled: false
      },
      toolbar: {
        show: true,
        tools: {
          download: false,
          selection: false,
          pan: false,
          reset: false,
          zoom: false,
          zoomin: false,
          zoomout: false
        }
      }
    },

    colors: [
      "#1769e0",
      "#22a06b",
      "#e58a1f"
    ],

    stroke: {
      curve: "smooth",
      width: 2.5
    },

    markers: {
      size: 3,
      hover: {
        size: 5
      }
    },

    xaxis: {
      categories: rows.map(formatMonthLabel),
      labels: {
        rotate: -45
      }
    },

    grid: {
      borderColor: "#e4e9f0",
      strokeDashArray: 4
    },

    legend: {
      position: "top",
      horizontalAlign: "left",
      offsetY: -6
    },

    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => {
          return kind === "passengers"
              ? `${formatNumber(value)} чел.`
              : `${formatNumber(value, 2)} ₽`;
        }
      }
    }
  };
}

function buildPassengerChartOptions(rows) {
  return {
    ...buildBaseChartOptions(rows, "passengers"),

    series: [
      {
        name: "Всего пассажиров",
        data: rows.map((row) =>
            Number(row.sumPassengerCount ?? 0)
        )
      },

      {
        name: "Без льгот",
        data: rows.map((row) =>
            Number(row.casualCount ?? 0)
        )
      },

      {
        name: "С льготами",
        data: rows.map((row) =>
            Number(row.sumBenefitCount ?? 0)
        )
      }
    ],

    yaxis: {
      labels: {
        formatter: (value) =>
            formatNumber(value)
      }
    }
  };
}

function buildPaymentChartOptions(rows) {
  return {
    ...buildBaseChartOptions(rows, "payment"),

    series: [
      {
        name: "Общий доход",
        data: rows.map((row) =>
            Number(row.summPayment ?? 0)
        )
      },

      {
        name: "Без льгот",
        data: rows.map((row) =>
            Number(row.casualPayment ?? 0)
        )
      },

      {
        name: "С льготами",
        data: rows.map((row) =>
            Number(row.summPayment ?? 0) -
            Number(row.casualPayment ?? 0)
        )
      }
    ],

    yaxis: {
      labels: {
        formatter: (value) =>
            formatNumber(value, 0)
      }
    }
  };
}

async function renderChart(kind) {
  const state = states.value[kind];

  destroyChart(kind);

  if (
      state.view === "table" ||
      state.rows.length === 0
  ) {
    return;
  }

  await nextTick();

  const element = getChartElement(kind);

  if (!element) {
    return;
  }

  const options = kind === "passengers"
      ? buildPassengerChartOptions(state.rows)
      : buildPaymentChartOptions(state.rows);

  options.chart.height =
      state.view === "chart"
          ? 430
          : 350;

  const chart = new ApexCharts(
      element,
      options
  );

  await chart.render();

  if (kind === "passengers") {
    passengerChart.value = chart;
  } else {
    paymentChart.value = chart;
  }
}

async function loadStatistics(kind) {
  const state = states.value[kind];

  if (state.year === null) {
    return;
  }

  state.loading = true;
  state.error = "";

  destroyChart(kind);

  try {
    const payload = kind === "passengers"
        ? await getPassengerStatistics(
            yearForApi(state.year)
        )
        : await getPaymentStatistics(
            yearForApi(state.year)
        );

    state.rows = extractRows(payload);

    // Сначала показываем контейнер графика
    state.loading = false;

    // Затем ждём его появления в DOM
    await nextTick();

    await renderChart(kind);
  } catch (exception) {
    console.error(
        `Ошибка загрузки статистики ${kind}:`,
        exception
    );

    state.rows = [];
    state.error = exception instanceof Error
        ? exception.message
        : "Не удалось загрузить данные.";

    state.loading = false;
  }
}

function setYear(kind, value) {
  const state = states.value[kind];

  state.year = Number(value);
  loadStatistics(kind);
}

function setView(kind, view) {
  states.value[kind].view = view;
  renderChart(kind);
}

function retry(kind) {
  loadStatistics(kind);
}

function passengerCompactColumns() {
  return [
    {
      title: "Год",
      value: (row) => formatYear(row.year)
    },

    {
      title: "Месяц",
      value: (row) => formatMonth(row)
    },

    {
      title: "Общее кол-во",
      numeric: true,
      value: (row) =>
          formatNumber(row.sumPassengerCount)
    },

    {
      title: "Без льгот",
      numeric: true,
      value: (row) =>
          formatNumber(row.casualCount)
    },

    {
      title: "С льготами",
      numeric: true,
      value: (row) =>
          formatNumber(row.sumBenefitCount)
    },

    {
      title: "% льготников",
      numeric: true,
      value: (row) =>
          percent(row.sumBenefitPercent)
    }
  ];
}

function passengerFullColumns() {
  return [
    {
      title: "Год",
      value: (row) => formatYear(row.year)
    },

    {
      title: "Месяц",
      value: (row) => formatMonth(row)
    },

    {
      title: "Без льгот",
      numeric: true,
      value: (row) =>
          formatNumber(row.casualCount)
    },

    {
      title: "Без льгот %",
      numeric: true,
      value: (row) =>
          percent(row.casualPercent)
    },

    {
      title: "Студенты",
      numeric: true,
      value: (row) =>
          formatNumber(row.studentCount)
    },

    {
      title: "Студенты %",
      numeric: true,
      value: (row) =>
          percent(row.studentPercent)
    },

    {
      title: "Фед. льготы",
      numeric: true,
      value: (row) =>
          formatNumber(row.fedBenefitCount)
    },

    {
      title: "Фед. льготы %",
      numeric: true,
      value: (row) =>
          percent(row.fedBenefitPercent)
    },

    {
      title: "Рег. льготы",
      numeric: true,
      value: (row) =>
          formatNumber(row.regBenefitCount)
    },

    {
      title: "Рег. льготы %",
      numeric: true,
      value: (row) =>
          percent(row.regBenefitPercent)
    },

    {
      title: "Прочие льготы",
      numeric: true,
      value: (row) =>
          formatNumber(row.anotherBenefitCount)
    },

    {
      title: "Прочие льготы %",
      numeric: true,
      value: (row) =>
          percent(row.anotherBenefitPercent)
    },

    {
      title: "Всего с льготами",
      numeric: true,
      value: (row) =>
          formatNumber(row.sumBenefitCount)
    },

    {
      title: "Всего с льготами %",
      numeric: true,
      value: (row) =>
          percent(row.sumBenefitPercent)
    },

    {
      title: "Всего пассажиров",
      numeric: true,
      value: (row) =>
          formatNumber(row.sumPassengerCount)
    }
  ];
}

function paymentCompactColumns() {
  return [
    {
      title: "Год",
      value: (row) => formatYear(row.year)
    },

    {
      title: "Месяц",
      value: (row) => formatMonth(row)
    },

    {
      title: "Общий доход",
      numeric: true,
      value: (row) =>
          formatNumber(row.summPayment)
    },

    {
      title: "Доход без льгот",
      numeric: true,
      value: (row) =>
          formatNumber(row.casualPayment)
    },

    {
      title: "Доход льготников",
      numeric: true,
      value: (row) =>
          formatNumber(
              Number(row.summPayment ?? 0) -
              Number(row.casualPayment ?? 0)
          )
    },

    {
      title: "Вагоно-км",
      numeric: true,
      value: (row) =>
          formatNumber(row.trainKmPerMonth)
    }
  ];
}

function paymentFullColumns() {
  return [
    {
      title: "Год",
      value: (row) => formatYear(row.year)
    },

    {
      title: "Месяц",
      value: (row) => formatMonth(row)
    },

    {
      title: "Без льгот",
      numeric: true,
      value: (row) =>
          formatNumber(row.casualPayment)
    },

    {
      title: "Студенты",
      numeric: true,
      value: (row) =>
          formatNumber(row.studentPayment)
    },

    {
      title: "Фед. льготы",
      numeric: true,
      value: (row) =>
          formatNumber(row.fedBenefitPayment)
    },

    {
      title: "Рег. льготы",
      numeric: true,
      value: (row) =>
          formatNumber(row.regBenefitPayment)
    },

    {
      title: "Прочие",
      numeric: true,
      value: (row) =>
          formatNumber(row.anotherPayment)
    },

    {
      title: "Общий доход",
      numeric: true,
      value: (row) =>
          formatNumber(row.summPayment)
    },

    {
      title: "Вагоно-км",
      numeric: true,
      value: (row) =>
          formatNumber(row.trainKmPerMonth)
    }
  ];
}

const passengerColumns = computed(() => {
  return passengerState.value.view === "table"
      ? passengerFullColumns()
      : passengerCompactColumns();
});

const paymentColumns = computed(() => {
  return paymentState.value.view === "table"
      ? paymentFullColumns()
      : paymentCompactColumns();
});

async function loadYears() {
  loadingYears.value = true;

  try {
    const payload = await getWrittenYears();

    years.value = normalizedYears(
        unwrapArray(payload)
    );

    if (years.value.length === 0) {
      years.value = [currentDefaultYear()];
    }
  } catch (exception) {
    console.error(
        "Ошибка загрузки доступных годов:",
        exception
    );

    years.value = [currentDefaultYear()];
  } finally {
    loadingYears.value = false;
  }
}

function initializeYears() {
  const defaultYear = years.value.includes(
      currentDefaultYear()
  )
      ? currentDefaultYear()
      : years.value[0];

  states.value.passengers.year = defaultYear;
  states.value.payment.year = defaultYear;
}

onMounted(async () => {
  await loadYears();
  initializeYears();

  await Promise.all([
    loadStatistics("passengers"),
    loadStatistics("payment")
  ]);
});

onBeforeUnmount(() => {
  destroyChart("passengers");
  destroyChart("payment");
});
</script>

<template>
  <main class="stats-page">
    <header class="page-header">
      <div>
        <h1>Быстрая статистика</h1>
        <p>
          Пассажиропоток и доходы по месяцам
          за выбранный год.
        </p>
      </div>
    </header>

    <section class="stats-card">
      <header class="stats-card__header">
        <div>
          <h2>Пассажиропоток</h2>

          <p>
            Пассажиры в год по месяцам
          </p>
        </div>
      </header>

      <div class="stats-card__toolbar">
        <div class="stats-year-field">
          <label for="passenger-year">
            Год
          </label>

          <select
              id="passenger-year"
              class="stats-year-select"
              :value="passengerState.year"
              :disabled="
                            loadingYears ||
                            passengerState.loading
                        "
              @change="
                            setYear(
                                'passengers',
                                $event.target.value
                            )
                        ">
            <option
                v-for="year in years"
                :key="year"
                :value="year">
              {{ formatYear(year) }}
            </option>
          </select>
        </div>

        <div class="stats-view-switch">
          <button
              class="stats-view-btn"
              :class="{
                            'is-active':
                                passengerState.view === 'both'
                        }"
              type="button"
              @click="
                            setView('passengers', 'both')
                        ">
            График + Таблица
          </button>

          <button
              class="stats-view-btn"
              :class="{
                            'is-active':
                                passengerState.view === 'table'
                        }"
              type="button"
              @click="
                            setView('passengers', 'table')
                        ">
            Таблица
          </button>

          <button
              class="stats-view-btn"
              :class="{
                            'is-active':
                                passengerState.view === 'chart'
                        }"
              type="button"
              @click="
                            setView('passengers', 'chart')
                        ">
            График
          </button>
        </div>
      </div>

      <div
          class="stats-card__content"
          :class="`view-${passengerState.view}`">
        <div class="stats-card__chart">
          <div
              v-if="passengerState.loading"
              class="stats-state">
            <span class="spinner"></span>
            Загрузка графика…
          </div>

          <div
              v-else-if="passengerState.error"
              class="stats-state stats-state--error">
            <strong>
              Не удалось загрузить данные
            </strong>

            <span>
                            {{ passengerState.error }}
                        </span>

            <button
                class="reset-button"
                type="button"
                @click="
                                retry('passengers')
                            ">
              Повторить
            </button>
          </div>

          <div
              v-else-if="
                            passengerState.rows.length === 0
                        "
              class="stats-state">
            Нет данных за выбранный период
          </div>

          <div
              v-else
              ref="passengerChartElement"
              class="stats-chart">
          </div>
        </div>

        <div class="stats-card__table">
          <div
              v-if="
                            passengerState.loading
                        "
              class="stats-state">
            Загрузка таблицы…
          </div>

          <div
              v-else-if="
                            passengerState.rows.length === 0
                        "
              class="stats-state">
            Нет данных
          </div>

          <div
              v-else
              class="stats-table-container">
            <table class="stats-table">
              <thead>
              <tr>
                <th
                    v-for="
                                            column in passengerColumns
                                        "
                    :key="column.title">
                  {{ column.title }}
                </th>
              </tr>
              </thead>

              <tbody>
              <tr
                  v-for="
                                        (row, index) in passengerState.rows
                                    "
                  :key="
                                        `${row.year}-${row.month}-${index}`
                                    ">
                <td
                    v-for="
                                            column in passengerColumns
                                        "
                    :key="column.title"
                    :class="{
                                            'numeric-cell':
                                                column.numeric
                                        }">
                  {{ column.value(row) }}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <section class="stats-card">
      <header class="stats-card__header">
        <div>
          <h2>Доходы</h2>

          <p>
            Доходы за год по месяцам
          </p>
        </div>
      </header>

      <div class="stats-card__toolbar">
        <div class="stats-year-field">
          <label for="payment-year">
            Год
          </label>

          <select
              id="payment-year"
              class="stats-year-select"
              :value="paymentState.year"
              :disabled="
                            loadingYears ||
                            paymentState.loading
                        "
              @change="
                            setYear(
                                'payment',
                                $event.target.value
                            )
                        ">
            <option
                v-for="year in years"
                :key="year"
                :value="year">
              {{ formatYear(year) }}
            </option>
          </select>
        </div>

        <div class="stats-view-switch">
          <button
              class="stats-view-btn"
              :class="{
                            'is-active':
                                paymentState.view === 'both'
                        }"
              type="button"
              @click="
                            setView('payment', 'both')
                        ">
            График + Таблица
          </button>

          <button
              class="stats-view-btn"
              :class="{
                            'is-active':
                                paymentState.view === 'table'
                        }"
              type="button"
              @click="
                            setView('payment', 'table')
                        ">
            Таблица
          </button>

          <button
              class="stats-view-btn"
              :class="{
                            'is-active':
                                paymentState.view === 'chart'
                        }"
              type="button"
              @click="
                            setView('payment', 'chart')
                        ">
            График
          </button>
        </div>
      </div>

      <div
          class="stats-card__content"
          :class="`view-${paymentState.view}`">
        <div class="stats-card__chart">
          <div
              v-if="paymentState.loading"
              class="stats-state">
            <span class="spinner"></span>
            Загрузка графика…
          </div>

          <div
              v-else-if="paymentState.error"
              class="stats-state stats-state--error">
            <strong>
              Не удалось загрузить данные
            </strong>

            <span>
                            {{ paymentState.error }}
                        </span>

            <button
                class="reset-button"
                type="button"
                @click="
                                retry('payment')
                            ">
              Повторить
            </button>
          </div>

          <div
              v-else-if="
                            paymentState.rows.length === 0
                        "
              class="stats-state">
            Нет данных за выбранный период
          </div>

          <div
              v-else
              ref="paymentChartElement"
              class="stats-chart">
          </div>
        </div>

        <div class="stats-card__table">
          <div
              v-if="paymentState.loading"
              class="stats-state">
            Загрузка таблицы…
          </div>

          <div
              v-else-if="
                            paymentState.rows.length === 0
                        "
              class="stats-state">
            Нет данных
          </div>

          <div
              v-else
              class="stats-table-container">
            <table class="stats-table">
              <thead>
              <tr>
                <th
                    v-for="
                                            column in paymentColumns
                                        "
                    :key="column.title">
                  {{ column.title }}
                </th>
              </tr>
              </thead>

              <tbody>
              <tr
                  v-for="
                                        (row, index) in paymentState.rows
                                    "
                  :key="
                                        `${row.year}-${row.month}-${index}`
                                    ">
                <td
                    v-for="
                                            column in paymentColumns
                                        "
                    :key="column.title"
                    :class="{
                                            'numeric-cell':
                                                column.numeric
                                        }">
                  {{ column.value(row) }}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>