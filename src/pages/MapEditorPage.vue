<template>
  <section class="map-page">
    <header class="page-heading">
      <div class="breadcrumbs">Главная / Конструктор схемы</div>
      <h1>Конструктор схемы связей станций</h1>
      <p>
        Добавляйте станции, соединяйте их линиями, задавайте нагрузку
        и сохраняйте схему на сервер.
      </p>
    </header>

    <div class="editor-fields">
      <label>
        <span>Название схемы</span>
        <input
            v-model="schemaName"
            type="text"
            maxlength="200"
            placeholder="Например, Центральный регион"
        />
      </label>

      <label>
        <span>Описание</span>
        <textarea
            v-model="description"
            rows="2"
            maxlength="1000"
            placeholder="Описание схемы"
        ></textarea>
      </label>

      <label>
        <span>Добавить станцию</span>
        <span class="station-controls">
          <select v-model="selectedStation" :disabled="!availableStations.length">
            <option
                v-for="station in availableStations"
                :key="station"
                :value="station"
            >
              {{ station }}
            </option>
            <option v-if="!availableStations.length" value="">
              {{ stationsLoading ? "Загрузка станций…" : "Все станции добавлены" }}
            </option>
          </select>
          <button
              type="button"
              :disabled="!selectedStation || stationsLoading"
              @click="addStation"
          >
            Добавить
          </button>
        </span>
      </label>
    </div>

    <div class="editor-toolbar">
      <div class="zoom-controls" aria-label="Управление масштабом схемы">
        <button type="button" title="Увеличить" @click="zoomIn">+</button>
        <button type="button" title="Уменьшить" @click="zoomOut">−</button>
        <button type="button" title="Вписать схему" @click="fitView">⛶</button>
        <button type="button" title="Сбросить масштаб" @click="resetView">
          1:1
        </button>
      </div>
    </div>

    <div ref="graphContainer" class="editor-canvas">
      <div
          class="graph-container"
          role="img"
          aria-label="Редактор схемы станций"
      ></div>

      <div
          v-if="edgePanel"
          class="edge-panel"
          :style="{ left: `${edgePanel.left}px`, top: `${edgePanel.top}px` }"
      >
        <strong>{{ edgePanel.label }}</strong>

        <label>
          Нагрузка
          <input
              v-model.number="edgeLoad"
              type="number"
              min="0"
              step="1"
              @input="updateEdgeLoad"
          />
        </label>

        <button type="button" class="danger-button" @click="removeActiveEdge">
          Удалить
        </button>
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

    <div class="editor-actions">
      <button
          type="button"
          class="primary-button"
          :disabled="saving"
          @click="saveSchema"
      >
        {{ saving ? "Сохранение…" : "Сохранить схему" }}
      </button>

      <button type="button" class="secondary-button" @click="clearCanvas">
        Очистить
      </button>
    </div>

    <p class="editor-help">
      Перетаскивайте узлы мышью. Чтобы создать связь, перетащите её от круглого
      порта одного узла к порту другого. Линия отображается во время
      перетаскивания и прокладывается под прямыми углами.<br />
      Клик по линии — настройка нагрузки. Клавиша Delete — удаление выбранного
      узла или связи.
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Graph } from "@antv/x6";
import { apiFetch, readJson } from "../api/httpClient.js";

const STATIONS_URL = "/api/v1/content/writedStations";
const SAVE_URL = "/api/v1/map/uploadSchema";

const NODE_WIDTH = 150;
const NODE_HEIGHT = 64;

const graphContainer = ref(null);
const schemaName = ref("");
const description = ref("");
const stations = ref([]);
const stationsLoading = ref(true);
const selectedStation = ref("");
const selectedNodeId = ref(null);
const selectedEdgeId = ref(null);
const edgePanel = ref(null);
const edgeLoad = ref(0);
const notice = ref(null);
const saving = ref(false);

let graph = null;
let nextId = 1;
let noticeTimer;

const placedStations = computed(
    () => new Set(graph?.getNodes().map((node) => node.getData()?.label) || [])
);

const availableStations = computed(() =>
    stations.value.filter((station) => !placedStations.value.has(station))
);

function makeId(prefix) {
  return `${prefix}-${nextId++}`;
}

function notify(text, error = false) {
  clearTimeout(noticeTimer);
  notice.value = { text, error };

  noticeTimer = setTimeout(() => {
    notice.value = null;
  }, 4000);
}

function createGraph() {
  if (!graphContainer.value) return;

  graph = new Graph({
    container: graphContainer.value.querySelector(".graph-container"),
    autoResize: false,
    grid: {
      visible: true,
      size: 12,
      type: "dot",
      args: {
        color: "#c3cede",
        thickness: 1,
      },
    },
    panning: {
      enabled: true,
    },
    mousewheel: {
      enabled: true,
      minScale: 0.4,
      maxScale: 2.5,
      modifiers: ["ctrl", "meta"],
    },
    connecting: {
      allowBlank: false,
      allowLoop: false,
      allowMulti: false,
      snap: {
        radius: 20,
      },
      router: {
        name: "manhattan",
        args: {
          padding: 12,
        },
      },
      connector: {
        name: "rounded",
        args: {
          radius: 8,
        },
      },
      highlight: true,
      createEdge() {
        return graph.createEdge({
          shape: "edge",
          attrs: {
            line: {
              stroke: "#1769e0",
              strokeWidth: 3,
              targetMarker: null,
            },
          },
          data: {
            load: 0,
          },
        });
      },
      validateConnection({
                           sourceCell,
                           targetCell,
                           sourcePort,
                           targetPort,
                         }) {
        if (!sourceCell || !targetCell || sourceCell.id === targetCell.id) {
          return false;
        }

        if (!sourcePort || !targetPort) return false;

        const duplicate = graph.getEdges().some((edge) => {
          const source = edge.getSource();
          const target = edge.getTarget();

          return (
              source.cell === sourceCell.id &&
              target.cell === targetCell.id &&
              source.port === sourcePort &&
              target.port === targetPort
          );
        });

        return !duplicate;
      },
    },
    highlighting: {
      magnetAvailable: {
        name: "stroke",
        args: {
          attrs: {
            fill: "#fff",
            stroke: "#1769e0",
            strokeWidth: 3,
          },
        },
      },
    },
  });

  graph.on("node:click", ({ node }) => {
    selectedNodeId.value = node.id;
    selectedEdgeId.value = null;
    edgePanel.value = null;

    for (const item of graph.getNodes()) {
      item.attr(
          "body/stroke",
          item.id === node.id ? "#1769e0" : "#16306e"
      );
      item.attr(
          "body/strokeWidth",
          item.id === node.id ? 3 : 1
      );
    }
  });

  graph.on("edge:click", ({ edge, e }) => {
    showEdgePanel(edge, e);
  });

  graph.on("blank:click", () => {
    selectedNodeId.value = null;
    selectedEdgeId.value = null;
    edgePanel.value = null;

    for (const node of graph.getNodes()) {
      node.attr("body/stroke", "#16306e");
      node.attr("body/strokeWidth", 1);
    }
  });

  graph.on("edge:connected", ({ edge }) => {
    edge.setRouter({
      name: "manhattan",
      args: { padding: 12 },
    });
    edge.setConnector({
      name: "rounded",
      args: { radius: 8 },
    });

    const data = edge.getData() || {};
    edge.setData({ ...data, load: Number(data.load) || 0 });
  });
}

function createPorts() {
  const portAttrs = {
    circle: {
      r: 6,
      magnet: true,
      stroke: "#1769e0",
      strokeWidth: 2,
      fill: "#fff",
    },
  };

  return {
    groups: {
      top: {
        position: "top",
        attrs: portAttrs,
      },
      right: {
        position: "right",
        attrs: portAttrs,
      },
      bottom: {
        position: "bottom",
        attrs: portAttrs,
      },
      left: {
        position: "left",
        attrs: portAttrs,
      },
    },
    items: [
      { id: "top", group: "top" },
      { id: "right", group: "right" },
      { id: "bottom", group: "bottom" },
      { id: "left", group: "left" },
    ],
  };
}

function addStation() {
  const label = selectedStation.value;
  if (!graph || !label || placedStations.value.has(label)) return;

  const index = graph.getNodes().length;

  graph.addNode({
    id: makeId("node"),
    shape: "rect",
    x: 80 + (index % 4) * 210,
    y: 70 + Math.floor(index / 4) * 120,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    attrs: {
      body: {
        fill: "#1e3a8a",
        stroke: "#16306e",
        strokeWidth: 1,
        rx: 4,
        ry: 4,
      },
      label: {
        text: label,
        fill: "#fff",
        fontSize: 13,
        fontWeight: 600,
      },
    },
    ports: createPorts(),
    data: {
      label,
      load: 0,
    },
  });

  selectedStation.value =
      availableStations.value.find((station) => station !== label) || "";
}

async function loadStations() {
  try {
    const payload = await readJson(await apiFetch(STATIONS_URL));
    const list = Array.isArray(payload)
        ? payload
        : payload?.items || payload?.stations || [];

    stations.value = [
      ...new Set(
          list
              .map((item) => {
                if (typeof item === "string") return item.trim();
                return String(
                    item?.name ?? item?.stationName ?? item?.title ?? ""
                ).trim();
              })
              .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "ru"));

    selectedStation.value = availableStations.value[0] || "";
  } catch (error) {
    notify(`Не удалось загрузить список станций: ${error.message}`, true);
  } finally {
    stationsLoading.value = false;
  }
}

function showEdgePanel(edge, event) {
  if (!graphContainer.value) return;

  const source = edge.getSource();
  const target = edge.getTarget();
  const sourceLabel =
      graph.getCellById(source.cell)?.getData()?.label || "Станция";
  const targetLabel =
      graph.getCellById(target.cell)?.getData()?.label || "Станция";

  selectedEdgeId.value = edge.id;
  selectedNodeId.value = null;
  edgeLoad.value = Number(edge.getData()?.load) || 0;

  const bounds = graphContainer.value.getBoundingClientRect();
  const clientX = event?.clientX ?? bounds.left + 16;
  const clientY = event?.clientY ?? bounds.top + 16;

  edgePanel.value = {
    label: `${sourceLabel} — ${targetLabel}`,
    left: Math.max(
        8,
        Math.min(clientX - bounds.left + 12, bounds.width - 300)
    ),
    top: Math.max(
        8,
        Math.min(clientY - bounds.top + 12, bounds.height - 110)
    ),
  };
}

function updateEdgeLoad() {
  if (!graph || !selectedEdgeId.value) return;

  const edge = graph.getCellById(selectedEdgeId.value);
  if (!edge || !edge.isEdge()) return;

  const data = edge.getData() || {};
  edge.setData({
    ...data,
    load: Math.max(0, Number(edgeLoad.value) || 0),
  });
}

function removeActiveEdge() {
  if (!graph || !selectedEdgeId.value) return;

  const edge = graph.getCellById(selectedEdgeId.value);
  edge?.remove();

  selectedEdgeId.value = null;
  edgePanel.value = null;
}

function removeSelectedNode() {
  if (!graph || !selectedNodeId.value) return;

  const nodeId = selectedNodeId.value;

  for (const edge of graph.getEdges()) {
    const source = edge.getSource();
    const target = edge.getTarget();

    if (source.cell === nodeId || target.cell === nodeId) {
      edge.remove();
    }
  }

  graph.getCellById(nodeId)?.remove();
  selectedNodeId.value = null;
}

function clearCanvas() {
  if (!graph || graph.getCells().length === 0) return;

  if (!window.confirm("Очистить схему? Все узлы и связи будут удалены.")) {
    return;
  }

  graph.clearCells();
  selectedNodeId.value = null;
  selectedEdgeId.value = null;
  edgePanel.value = null;
  selectedStation.value = availableStations.value[0] || "";
}

function zoomIn() {
  graph?.zoom(0.2);
}

function zoomOut() {
  graph?.zoom(-0.2);
}

function fitView() {
  if (!graph || graph.getCells().length === 0) return;

  graph.zoomToFit({
    padding: 32,
    maxScale: 1.5,
  });
}

function resetView() {
  if (!graph) return;

  graph.zoomTo(1);
  graph.centerContent();
}

function serialize() {
  const name = schemaName.value.trim();
  const cells = graph.toJSON().cells || [];

  return {
    id: 0,
    name,
    description: description.value.trim(),
    cells: cells.map((cell) => ({
      ...cell,
      schemaId: 0,
      schema: name,
      data: {
        ...(cell.data || {}),
        ...(cell.shape === "edge"
            ? { load: Number(cell.data?.load) || 0 }
            : {}),
      },
    })),
  };
}

async function saveSchema() {
  if (!schemaName.value.trim()) {
    notify("Введите название схемы", true);
    return;
  }

  if (!graph || graph.getNodes().length === 0) {
    notify("Схема пуста — добавьте станции", true);
    return;
  }

  saving.value = true;

  try {
    await readJson(
        await apiFetch(SAVE_URL, {
          method: "POST",
          body: JSON.stringify(serialize()),
        })
    );
    notify("Схема сохранена");
  } catch (error) {
    notify(`Не удалось сохранить схему: ${error.message}`, true);
  } finally {
    saving.value = false;
  }
}

function onKeyDown(event) {
  if (event.key !== "Delete" && event.key !== "Backspace") return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName)) return;

  if (selectedEdgeId.value) {
    removeActiveEdge();
  } else if (selectedNodeId.value) {
    removeSelectedNode();
  }
}

onMounted(() => {
  createGraph();
  document.addEventListener("keydown", onKeyDown);
  loadStations();
});

onUnmounted(() => {
  clearTimeout(noticeTimer);
  document.removeEventListener("keydown", onKeyDown);
  graph?.dispose();
  graph = null;
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
.editor-help {
  color: #667085;
  line-height: 1.5;
}

.editor-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.editor-fields label,
.edge-panel label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
}

.editor-fields input,
.editor-fields textarea,
.editor-fields select,
.edge-panel input {
  box-sizing: border-box;
  width: 100%;
  min-height: 40px;
  padding: 9px 11px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #172033;
  font: inherit;
}

.editor-fields textarea {
  resize: vertical;
}

.station-controls,
.zoom-controls,
.editor-actions {
  display: flex;
  gap: 8px;
}

.station-controls select {
  min-width: 0;
}

.editor-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.zoom-controls button,
.editor-actions button,
.station-controls button,
.edge-panel button {
  min-height: 36px;
  padding: 7px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #172033;
  cursor: pointer;
}

.zoom-controls button:hover,
.editor-actions button:hover,
.station-controls button:hover,
.edge-panel button:hover {
  background: #f1f5f9;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.editor-canvas {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 560px;
  min-height: 0;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #f8faff;
}

.graph-container {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.edge-panel {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: end;
  gap: 10px;
  max-width: calc(100% - 16px);
  padding: 12px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px #17203322;
}

.edge-panel strong {
  align-self: center;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edge-panel label {
  min-width: 105px;
}

.danger-button {
  border-color: #fecaca !important;
  color: #b91c1c !important;
}

.editor-actions {
  margin-top: 14px;
}

.primary-button {
  border-color: #1e40af !important;
  background: #1e40af !important;
  color: #fff !important;
}

.primary-button:hover {
  background: #1e3a8a !important;
}

.editor-help {
  margin-top: 12px;
  font-size: 13px;
}

.map-notification {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 3;
  max-width: min(420px, calc(100% - 28px));
  padding: 10px 14px;
  border-radius: 7px;
  background: #166534;
  color: #fff;
  box-shadow: 0 6px 20px #17203322;
}

.map-notification.is-error {
  background: #b91c1c;
}

@media (max-width: 850px) {
  .editor-fields {
    grid-template-columns: 1fr;
  }

  .map-page {
    padding: 16px;
  }

  .edge-panel {
    flex-wrap: wrap;
  }
}
</style>