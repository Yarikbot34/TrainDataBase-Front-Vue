<script setup>
import { computed, onMounted, ref } from "vue";
import {
  getRoutes,
  getTrains
} from "../api/routesApi";

const routes = ref([]);
const trains = ref([]);

const loading = ref(false);
const trainsLoading = ref(false);
const error = ref("");
const trainsError = ref("");

const selectedRoute = ref(null);
const searchQuery = ref("");

const filteredRoutes = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  if (!query) {
    return routes.value;
  }

  return routes.value.filter((route) => {
    const routeNumber = String(
        route.routeNumber ??
        route.number ??
        ""
    ).toLowerCase();

    return routeNumber.includes(query);
  });
});

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
        Number(second.year ?? 0) -
        Number(first.year ?? 0);

    if (yearDifference !== 0) {
      return yearDifference;
    }

    const monthDifference =
        Number(second.month ?? 0) -
        Number(first.month ?? 0);

    if (monthDifference !== 0) {
      return monthDifference;
    }

    return String(
        first.routeNumber ?? ""
    ).localeCompare(
        String(second.routeNumber ?? ""),
        "ru",
        {
          numeric: true
        }
    );
  });
}

async function loadRoutes() {
  loading.value = true;
  error.value = "";

  try {
    const payload = await getRoutes();

    routes.value = sortRoutes(
        extractItems(payload)
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
  } finally {
    loading.value = false;
  }
}

async function openRoute(route) {
  selectedRoute.value = route;
  trains.value = [];
  trainsError.value = "";
  trainsLoading.value = true;

  try {
    const payload = await getTrains(
        route.year,
        route.month,
        route.routeNumber
    );

    trains.value = extractItems(payload);
  } catch (exception) {
    console.error(
        "Ошибка загрузки поездов:",
        exception
    );

    trainsError.value =
        exception instanceof Error
            ? exception.message
            : "Не удалось загрузить поезда.";
  } finally {
    trainsLoading.value = false;
  }
}

function closeDetails() {
  selectedRoute.value = null;
  trains.value = [];
  trainsError.value = "";
}

onMounted(loadRoutes);
</script>

<template>
  <main class="routes-page">
    <header class="page-header">
      <div>
        <div class="breadcrumbs">
          Главная
          <strong>/ Маршруты</strong>
        </div>

        <h1>Маршруты</h1>
        <p>Список маршрутов и данные по поездам</p>
      </div>

      <button
          class="refresh-button"
          type="button"
          :disabled="loading"
          @click="loadRoutes">
        {{ loading ? "Загрузка…" : "Обновить" }}
      </button>
    </header>

    <section
        class="workspace"
        :class="{ 'is-split': selectedRoute }">
      <div class="workspace__main">
        <div class="table-card">
          <div class="table-card__toolbar">
            <div>
              <h2>Маршруты</h2>

              <p>
                Всего записей:
                {{ filteredRoutes.length }}
              </p>
            </div>

            <label class="search-field">
              <input
                  v-model="searchQuery"
                  type="search"
                  placeholder="Поиск по номеру маршрута" />
            </label>
          </div>

          <div class="table-container">
            <div
                v-if="loading"
                class="state-cell">
              <div class="loading-state">
                <span class="spinner"></span>
                Загрузка маршрутов…
              </div>
            </div>

            <div
                v-else-if="error"
                class="state-cell">
              <div class="error-state">
                <strong>Ошибка</strong>
                <span>{{ error }}</span>

                <button
                    type="button"
                    @click="loadRoutes">
                  Повторить
                </button>
              </div>
            </div>

            <div
                v-else-if="filteredRoutes.length === 0"
                class="state-cell">
              Маршруты не найдены
            </div>

            <table
                v-else
                class="routes-table">
              <thead>
              <tr>
                <th>Год</th>
                <th>Месяц</th>
                <th>Маршрут</th>
                <th>Пассажиры</th>
                <th>Доход</th>
              </tr>
              </thead>

              <tbody>
              <tr
                  v-for="(route, index) in filteredRoutes"
                  :key="
                                        route.id ??
                                        `${route.year}-${route.month}-${route.routeNumber}-${index}`
                                    ">
                <td>
                  {{ route.year }}
                </td>

                <td>
                  {{ route.month }}
                </td>

                <td class="route-cell">
                  <button
                      class="route-link"
                      type="button"
                      @click="openRoute(route)">
                    {{
                      route.routeNumber ??
                      route.number ??
                      "—"
                    }}
                  </button>
                </td>

                <td class="numeric-cell">
                  {{
                    route.summary?.count ??
                    route.count ??
                    "—"
                  }}
                </td>

                <td class="numeric-cell">
                  {{
                    route.summary?.payment ??
                    route.payment ??
                    "—"
                  }}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside class="workspace__details">
        <div class="details-panel__header">
          <div>
                        <span class="details-panel__caption">
                            Выбранный маршрут
                        </span>

            <h2>
              Маршрут
              {{
                selectedRoute?.routeNumber ??
                selectedRoute?.number ??
                "—"
              }}
            </h2>

            <p class="details-panel__counter">
              Найдено поездов:
              {{ trains.length }}
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
          <div
              v-if="trainsLoading"
              class="trains-state-cell">
            <div class="loading-state">
              <span class="spinner"></span>
              Загрузка поездов…
            </div>
          </div>

          <div
              v-else-if="trainsError"
              class="trains-state-cell">
            {{ trainsError }}
          </div>

          <div
              v-else-if="trains.length === 0"
              class="trains-state-cell">
            Поезда не найдены
          </div>

          <table
              v-else
              class="trains-table">
            <thead>
            <tr>
              <th>Номер</th>
              <th>Станции</th>
              <th>Время</th>
              <th>Расстояние</th>
              <th>Вагоны</th>
              <th>Описание</th>
            </tr>
            </thead>

            <tbody>
            <tr
                v-for="(train, index) in trains"
                :key="train.id ?? index">
              <td class="train-number-cell">
                {{ train.number ?? "—" }}
              </td>

              <td class="train-stations-cell">
                {{
                  train.stationFrom ??
                  "—"
                }}
              </td>

              <td class="train-time-cell">
                {{
                  train.timeFrom ??
                  "—"
                }}
              </td>

              <td class="numeric-cell">
                {{
                  train.distance ??
                  "—"
                }}
              </td>

              <td class="numeric-cell">
                {{
                  train.railcarCount ??
                  "—"
                }}
              </td>

              <td class="train-stations-cell">
                {{
                  train.description ??
                  "—"
                }}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </aside>
    </section>
  </main>
</template>