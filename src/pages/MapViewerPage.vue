<template>
  <section class="map-page">
    <header class="page-heading">
      <div class="breadcrumbs">Главная / Статистика схемы</div>
      <h1>Нагруженность схемы связей станций</h1>
      <p>
        Наведите курсор на узел или линию, чтобы увидеть количество поездов.
        Кликните — откроется таблица поездов.
      </p>
    </header>

    <div class="viewer-filters">
      <label>
        Схема
        <select v-model="selectedSchema" @change="loadSchema">
          <option value="" disabled>— выберите схему —</option>
          <option v-for="schema in schemas" :key="schema" :value="schema">
            {{ schema }}
          </option>
        </select>
      </label>

      <label>
        Год
        <select v-model="selectedYear" @change="loadSchema">
          <option value="" disabled>— год —</option>
          <option v-for="year in years" :key="year" :value="String(year)">
            {{ year }}
          </option>
        </select>
      </label>

      <label>
        Месяц
        <select v-model="selectedMonth" @change="loadSchema">
          <option value="" disabled>— месяц —</option>
          <option v-for="month in months" :key="month" :value="String(month)">
            {{ MONTH_NAMES[Number(month) - 1] || month }}
          </option>
        </select>
      </label>
    </div>

    <div class="viewer-workspace" :class="{ 'is-split': panelOpen }">
      <main class="viewer-main">
        <div class="legend-card">
          <div class="legend-header">
            <h2>Уровни нагрузки</h2>
            <button type="button" @click="legendEditorOpen = !legendEditorOpen">
              {{ legendEditorOpen ? "Скрыть" : "Редактировать" }}
            </button>
          </div>

          <div class="legend-list">
            <div
                v-for="(level, index) in LEVELS"
                :key="level"
                class="legend-item"
            >
              <span
                  class="legend-swatch"
                  :style="{ backgroundColor: COLORS[index] }"
              />
              <span>{{ level }}: {{ legendRanges[index] }}</span>
            </div>
          </div>

          <div v-if="legendEditorOpen" class="legend-editor">
            <label v-for="(value, index) in thresholds" :key="index">
              Граница {{ index + 1 }}
              <input v-model.number="thresholds[index]" type="number" min="0" />
            </label>
            <div class="legend-editor-actions">
              <button type="button" @click="applyThresholds">Применить</button>
              <button type="button" @click="resetThresholds">Сбросить</button>
            </div>
          </div>

          <p class="legend-note">
            Максимальная нагрузка на карте: {{ maxLoad }}.
          </p>
          <p class="legend-note">
            По умолчанию критический уровень — свыше 80% от максимальной
            нагрузки на карте. Границы можно задать вручную.
          </p>
        </div>

        <div class="viewer-canvas">
          <svg
              class="graph-svg"
              :viewBox="viewBox"
              role="img"
              aria-label="Схема загруженности станций"
          >
            <g v-for="edge in graphEdges" :key="edge.id">
              <path
                  :d="edge.path"
                  fill="none"
                  :stroke="COLORS[levelIndex(edge.load)]"
                  :stroke-width="2 + levelIndex(edge.load) * 1.2"
                  class="viewer-cell"
                  @mouseenter="showTooltip(edge.label, edge.load, $event)"
                  @mousemove="moveTooltip"
                  @mouseleave="hideTooltip"
                  @click="openTrainsPanel(edge)"
              />
            </g>

            <g
                v-for="node in graphNodes"
                :key="node.id"
                :transform="`translate(${node.x} ${node.y})`"
                class="viewer-cell viewer-node"
                @mouseenter="showTooltip(node.label, node.load, $event)"
                @mousemove="moveTooltip"
                @mouseleave="hideTooltip"
                @click="openTrainsPanel(node)"
            >
              <rect
                  :width="NODE_WIDTH"
                  :height="NODE_HEIGHT"
                  rx="4"
                  fill="#1e3a8a"
                  :stroke="COLORS[levelIndex(node.load)]"
                  :stroke-width="2 + levelIndex(node.load)"
              />
              <text
                  :x="NODE_WIDTH / 2"
                  :y="NODE_HEIGHT / 2 + 5"
                  text-anchor="middle"
                  fill="#fff"
                  font-size="13"
                  font-weight="600"
                  pointer-events="none"
              >
                {{ node.label }}
              </text>
            </g>
          </svg>

          <div
              v-if="tooltip.visible"
              class="graph-tooltip"
              :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
          >
            <strong>{{ tooltip.label }}</strong>
            <span>{{ tooltip.load }} поездов в месяц</span>
          </div>

          <div
              v-if="notice"
              class="map-notification"
              :class="{ 'is-error': notice.error }"
              role="status"
          >
            {{ notice.text }}
          </div>
        </div>
      </main>

      <aside v-if="panelOpen" class="trains-panel">
        <div class="trains-panel-header">
          <div>
            <h2>{{ selectedRouteTitle }}</h2>
            <p>{{ trainsCounter }}</p>
          </div>
          <button type="button" aria-label="Закрыть" @click="closeTrainsPanel">
            ×
          </button>
        </div>

        <div class="trains-table-wrap">
          <table class="trains-table">
            <thead>
            <tr>
              <th>№ поезда</th>
              <th>Станция отправления — станция назначения</th>
              <th>Время отправления и прибытия</th>
              <th>Расстояние, км</th>
              <th>Количество вагонов</th>
              <th>Вагоно-километры в сутки</th>
              <th>Количество дней курсирования</th>
              <th>Вагоно-километры в месяц</th>
              <th>Доп. данные</th>
            </tr>
            </thead>
            <tbody>
            <tr v-if="trainsLoading">
              <td colspan="9" class="trains-state-cell">Загрузка данных…</td>
            </tr>
            <tr v-else-if="!trains.length">
              <td colspan="9" class="trains-state-cell">
                По выбранному элементу схемы данные не найдены.
              </td>
            </tr>
            <tr v-for="(train, index) in trains" v-else :key="`${train.number}-${index}`">
              <td>{{ train.number ?? "—" }}</td>
              <td>{{ stationsText(train) }}</td>
              <td>{{ timeText(train) }}</td>
              <td class="numeric-cell">{{ numberText(train.distance, 2) }}</td>
              <td class="numeric-cell">{{ numberText(train.railcarCount) }}</td>
              <td class="numeric-cell">{{ numberText(train.rangePerDay) }}</td>
              <td class="numeric-cell">{{ numberText(train.dayInRaise) }}</td>
              <td class="numeric-cell">{{ numberText(train.rangePerMonth) }}</td>
              <td>{{ train.description || "—" }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { apiFetch, readJson } from "../api/httpClient.js";

const API = {
  schemas: "/api/v1/content/writedSchemas",
  years: "/api/v1/content/writedYears",
  months: "/api/v1/content/writedMonths",
  schema: "/api/v1/map/getSchema",
  trains: "/api/v1/TableView/trains",
};

const NODE_WIDTH = 150;
const NODE_HEIGHT = 64;
const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const COLORS = ["#22c55e", "#eab308", "#f97316", "#dc2626", "#7f1d1d"];
const LEVELS = ["низкая", "умеренная", "средняя", "высокая", "критическая"];

const schemas = ref([]);
const years = ref([]);
const months = ref([]);
const selectedSchema = ref("");
const selectedYear = ref("");
const selectedMonth = ref("");

const graphNodes = ref([]);
const graphEdges = ref([]);
const maxLoad = ref(0);
const thresholds = ref([0, 0, 0, 0]);
const thresholdsEdited = ref(false);
const legendEditorOpen = ref(false);

const panelOpen = ref(false);
const selectedRouteTitle = ref("Поезда не выбраны");
const trainsCounter = ref("Кликните по узлу или линии на схеме");
const trains = ref([]);
const trainsLoading = ref(false);
const tooltip = ref({ visible: false, label: "", load: 0, x: 0, y: 0 });
const notice = ref(null);

let noticeTimer;
let requestId = 0;
let currentCell = null;

const viewBox = computed(() => {
  const nodes = graphNodes.value;
  const minX = Math.min(0, ...nodes.map((node) => node.x - 60));
  const minY = Math.min(0, ...nodes.map((node) => node.y - 60));
  const maxX = Math.max(1200, ...nodes.map((node) => node.x + NODE_WIDTH + 60));
  const maxY = Math.max(700, ...nodes.map((node) => node.y + NODE_HEIGHT + 60));
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
});

const legendRanges = computed(() => [
  `до ${thresholds.value[0]}`,
  `${thresholds.value[0]} – ${thresholds.value[1]}`,
  `${thresholds.value[1]} – ${thresholds.value[2]}`,
  `${thresholds.value[2]} – ${thresholds.value[3]}`,
  `более ${thresholds.value[3]}`,
]);

function notify(text, error = false) {
  clearTimeout(noticeTimer);
  notice.value = { text, error };
  noticeTimer = setTimeout(() => {
    notice.value = null;
  }, 4000);
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["result", "data", "items", "content"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function dataOf(item) {
  return item.Data || item.data || {};
}

function itemLoad(data) {
  return Number(data?.trainLoad ?? 0) || 0;
}

function setDefaultThresholds() {
  const values = [0.2, 0.4, 0.6, 0.8].map((part) =>
      Math.round(maxLoad.value * part)
  );
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] <= values[i - 1]) values[i] = values[i - 1] + 1;
  }
  thresholds.value = values;
}

function levelIndex(load) {
  const index = thresholds.value.findIndex((threshold) => load <= threshold);
  return index === -1 ? 4 : index;
}

function portPoint(node, port) {
  if (port === "top") return { x: node.x + NODE_WIDTH / 2, y: node.y };
  if (port === "right") {
    return { x: node.x + NODE_WIDTH, y: node.y + NODE_HEIGHT / 2 };
  }
  if (port === "bottom") {
    return { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT };
  }
  if (port === "left") return { x: node.x, y: node.y + NODE_HEIGHT / 2 };
  return { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT / 2 };
}

function edgePath(edge) {
  const source = graphNodes.value.find((node) => node.id === edge.source);
  const target = graphNodes.value.find((node) => node.id === edge.target);
  if (!source || !target) return "";

  const start = portPoint(source, edge.sourcePort);
  const end = portPoint(target, edge.targetPort);
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

async function loadFilters() {
  try {
    const [schemaData, yearData, monthData] = await Promise.all([
      readJson(await apiFetch(API.schemas)),
      readJson(await apiFetch(API.years)),
      readJson(await apiFetch(API.months)),
    ]);

    schemas.value = Array.isArray(schemaData) ? schemaData : [];
    years.value = Array.isArray(yearData)
        ? yearData.slice().sort((a, b) => Number(a) - Number(b))
        : [];
    months.value = Array.isArray(monthData)
        ? monthData.slice().sort((a, b) => Number(a) - Number(b))
        : [];

    selectedSchema.value = String(schemas.value[0] ?? "");
    selectedYear.value = String(years.value[0] ?? "");
    selectedMonth.value = String(months.value[0] ?? "");

    await loadSchema();
  } catch (error) {
    notify(`Не удалось загрузить списки фильтров: ${error.message}`, true);
  }
}

async function loadSchema() {
  if (!selectedSchema.value || !selectedYear.value || !selectedMonth.value) return;

  try {
    const body = await readJson(
        await apiFetch(API.schema, {
          method: "POST",
          body: JSON.stringify({
            years: [Number(selectedYear.value)],
            months: [Number(selectedMonth.value)],
            schemaName: selectedSchema.value,
          }),
        })
    );

    const cells = Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body)
            ? body
            : [];

    const nodeItems = cells.filter(
        (item) => item.shape !== "edge" && !(item.source && item.target)
    );
    const edgeItems = cells.filter(
        (item) => item.shape === "edge" || (item.source && item.target)
    );

    const labelsById = new Map(
        nodeItems.map((item) => [item.id, dataOf(item).label ?? ""])
    );

    graphNodes.value = nodeItems.map((item, index) => {
      const data = dataOf(item);
      return {
        id: item.id,
        label: data.label ?? "",
        load: itemLoad(data),
        trains: data.trains ?? [],
        x: Number(item.position?.x) || 60 + (index % 4) * 210,
        y: Number(item.position?.y) || 60 + Math.floor(index / 4) * 120,
      };
    });

    graphEdges.value = edgeItems
        .filter(
            (item) =>
                labelsById.has(item.source?.cell) &&
                labelsById.has(item.target?.cell)
        )
        .map((item) => {
          const data = dataOf(item);
          return {
            id: item.id,
            source: item.source.cell,
            target: item.target.cell,
            sourcePort: item.source.port,
            targetPort: item.target.port,
            load: itemLoad(data),
            trains: data.trains ?? [],
            label: `${labelsById.get(item.source.cell)} — ${labelsById.get(item.target.cell)}`,
          };
        });

    maxLoad.value = Math.max(
        0,
        ...graphNodes.value.map((node) => node.load),
        ...graphEdges.value.map((edge) => edge.load)
    );

    if (!thresholdsEdited.value) setDefaultThresholds();
    closeTrainsPanel();
  } catch (error) {
    notify(`Не удалось загрузить схему: ${error.message}`, true);
  }
}

function showTooltip(label, load, event) {
  tooltip.value = {
    visible: true,
    label: label || "—",
    load,
    x: event.clientX + 14,
    y: event.clientY + 14,
  };
  moveTooltip(event);
}

function moveTooltip(event) {
  if (!tooltip.value.visible) return;

  const width = 240;
  const height = 58;
  let x = event.clientX + 14;
  let y = event.clientY + 14;

  if (x + width > window.innerWidth - 8) x = event.clientX - width - 14;
  if (y + height > window.innerHeight - 8) y = event.clientY - height - 14;

  tooltip.value.x = x;
  tooltip.value.y = y;
}

function hideTooltip() {
  tooltip.value.visible = false;
}

function formatMonth(month) {
  return String(Number(month) || 0).padStart(2, "0");
}

function formatYear(year) {
  const value = Number(year) || 0;
  return value >= 0 && value < 100 ? String(2000 + value) : String(value);
}

function openTrainsPanel(model) {
  currentCell = model;
  const period = `${formatMonth(selectedMonth.value)}.${formatYear(selectedYear.value)}`;
  selectedRouteTitle.value = model.source
      ? `Поезда: ${model.label} за ${period}`
      : `Поезда станции ${model.label} за ${period}`;

  panelOpen.value = true;
  loadTrains(model);
}

function closeTrainsPanel() {
  requestId += 1;
  currentCell = null;
  panelOpen.value = false;
  trains.value = [];
  trainsLoading.value = false;
  selectedRouteTitle.value = "Поезда не выбраны";
  trainsCounter.value = "Кликните по узлу или линии на схеме";
}

async function loadTrains(model) {
  const numbers = [
    ...new Set(
        (model.trains || []).map((number) => String(number).trim()).filter(Boolean)
    ),
  ];

  if (!numbers.length) {
    trains.value = [];
    trainsCounter.value = "Найдено поездов: 0";
    return;
  }

  const thisRequest = ++requestId;
  trainsLoading.value = true;
  trainsCounter.value = "Загрузка данных…";

  const results = await Promise.all(
      numbers.map(async (number) => {
        const url =
            `${API.trains}/${encodeURIComponent(selectedYear.value)}/` +
            `${encodeURIComponent(selectedMonth.value)}/${encodeURIComponent(number)}`;

        try {
          return extractItems(await readJson(await apiFetch(url)));
        } catch (error) {
          console.error(`Ошибка загрузки поезда ${number}:`, error);
          return [];
        }
      })
  );

  if (thisRequest !== requestId || currentCell !== model) return;

  trains.value = results.flat();
  trainsLoading.value = false;
  trainsCounter.value = `Найдено поездов: ${trains.value.length}`;
}

function stationName(station) {
  if (!station) return null;
  if (typeof station === "string") return station;
  return station.name || station.stationName || station.title || station.fullName || null;
}

function stationsText(train) {
  const from = stationName(train.stationFrom);
  const middle = stationName(train.stationMiddle);
  const to = stationName(train.stationTo);

  if (from && middle && to) return `${from} — ${middle} — ${to}`;
  if (from && to) return `${from} — ${to}`;
  if (from) return `${from} — станция назначения не указана`;
  if (to) return `Станция отправления не указана — ${to}`;
  return "Станции не указаны";
}

function numberText(value, digits = 0) {
  const number = Number(value);
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: digits,
  }).format(Number.isFinite(number) ? number : 0);
}

function timeText(train) {
  const from = train.timeFrom ? String(train.timeFrom).slice(0, 5) : "—";
  const to = train.timeTo ? String(train.timeTo).slice(0, 5) : "—";
  return from === "—" && to === "—" ? "Время не указано" : `${from} — ${to}`;
}

function applyThresholds() {
  const values = thresholds.value.map(Number);

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    notify("Границы должны быть неотрицательными числами", true);
    return;
  }
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] <= values[i - 1]) {
      notify("Границы должны строго возрастать", true);
      return;
    }
  }

  thresholds.value = values;
  thresholdsEdited.value = true;
  loadSchema();
}

function resetThresholds() {
  thresholdsEdited.value = false;
  setDefaultThresholds();
  loadSchema();
}

function onKeyDown(event) {
  if (event.key === "Escape" && panelOpen.value) closeTrainsPanel();
}

onMounted(() => {
  document.addEventListener("keydown", onKeyDown);
  loadFilters();
});

onUnmounted(() => {
  clearTimeout(noticeTimer);
  document.removeEventListener("keydown", onKeyDown);
});
</script>

<style scoped>
.map-page {
  padding: 24px;
  color: #172033;
}
.page-heading {
  margin-bottom: 20px;
}
.breadcrumbs {
  margin-bottom: 10px;
  color: #718096;
  font-size: 13px;
}
.page-heading h1 {
  margin: 0 0 8px;
  font-size: 26px;
}
.page-heading p,
.legend-note {
  color: #667085;
  line-height: 1.5;
}
.viewer-filters {
  display: grid;
  grid-template-columns: minmax(200px, 2fr) repeat(2, minmax(130px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.viewer-filters label,
.legend-editor label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
}
.viewer-filters select,
.legend-editor input {
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #172033;
  font: inherit;
}
.viewer-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.viewer-main {
  min-width: 0;
}
.legend-card {
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #fff;
}
.legend-header,
.trains-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.legend-header h2,
.trains-panel-header h2 {
  margin: 0;
  font-size: 17px;
}
.legend-header button,
.legend-editor button,
.trains-panel-header button {
  padding: 7px 11px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #172033;
  cursor: pointer;
}
.legend-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 12px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
}
.legend-swatch {
  width: 13px;
  height: 13px;
  border-radius: 50%;
}
.legend-editor {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.legend-editor-actions {
  display: flex;
  align-items: end;
  gap: 8px;
}
.legend-note {
  margin: 10px 0 0;
  font-size: 12px;
}
.viewer-canvas {
  position: relative;
  overflow: hidden;
  min-height: 420px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #f8faff;
}
.graph-svg {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 420px;
}
.viewer-cell {
  cursor: pointer;
}
.graph-tooltip {
  position: fixed;
  z-index: 10;
  pointer-events: none;
  padding: 9px 12px;
  border-radius: 7px;
  background: #172033;
  color: #fff;
  box-shadow: 0 5px 18px #17203333;
  font-size: 13px;
}
.graph-tooltip strong,
.graph-tooltip span {
  display: block;
}
.graph-tooltip span {
  margin-top: 4px;
  color: #dbeafe;
}
.map-notification {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 3;
  padding: 10px 14px;
  border-radius: 7px;
  background: #166534;
  color: #fff;
}
.map-notification.is-error {
  background: #b91c1c;
}
.trains-panel {
  min-width: 0;
  padding: 14px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #fff;
}
.trains-panel-header {
  align-items: flex-start;
  margin-bottom: 12px;
}
.trains-panel-header p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
}
.trains-panel-header button {
  font-size: 22px;
  line-height: 1;
}
.trains-table-wrap {
  overflow: auto;
  max-height: 420px;
}
.trains-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.trains-table th,
.trains-table td {
  padding: 9px 10px;
  border: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}
.trains-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f1f5f9;
}
.trains-state-cell {
  padding: 24px !important;
  color: #667085;
  text-align: center !important;
}
.numeric-cell {
  white-space: nowrap;
}
@media (max-width: 850px) {
  .map-page {
    padding: 16px;
  }
  .viewer-filters,
  .legend-editor {
    grid-template-columns: 1fr;
  }
}
</style>