<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },

  periods: {
    type: Array,
    default: () => []
  },

  selectedPeriod: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  "update:modelValue",
  "apply"
]);

const months = [
  { value: 1, label: "Янв" },
  { value: 2, label: "Фев" },
  { value: 3, label: "Мар" },
  { value: 4, label: "Апр" },
  { value: 5, label: "Май" },
  { value: 6, label: "Июн" },
  { value: 7, label: "Июл" },
  { value: 8, label: "Авг" },
  { value: 9, label: "Сен" },
  { value: 10, label: "Окт" },
  { value: 11, label: "Ноя" },
  { value: 12, label: "Дек" }
];

const draftPeriod = ref([]);

function extractPeriodItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const possibleCollections = [
    payload?.periods,
    payload?.years,
    payload?.items,
    payload?.result,
    payload?.data,
    payload?.content,
    payload?.data?.periods,
    payload?.data?.years,
    payload?.data?.items
  ];

  for (const collection of possibleCollections) {
    if (Array.isArray(collection)) {
      return collection;
    }
  }

  return [];
}

const normalizedPeriods = computed(() => {
  const items = extractPeriodItems(props.periods);

  return items
      .map((item) => {
        if (typeof item === "number") {
          return {
            year: item,
            months: months.map(
                (month) => month.value
            )
          };
        }

        if (typeof item === "string") {
          const year = Number(item);

          return {
            year,
            months: months.map(
                (month) => month.value
            )
          };
        }

        const year = Number(
            item?.year ??
            item?.value ??
            item?.period ??
            item?.yearNumber
        );

        const availableMonths =
            item?.months ??
            item?.monthNumbers ??
            item?.availableMonths;

        const itemMonths = Array.isArray(availableMonths)
            ? availableMonths
                .map(Number)
                .filter((month) =>
                    month >= 1 && month <= 12
                )
            : months.map(
                (month) => month.value
            );

        return {
          year,
          months: itemMonths
        };
      })
      .filter((item) =>
          Number.isFinite(item.year) &&
          item.months.length > 0
      )
      .sort((first, second) =>
          Number(second.year) -
          Number(first.year)
      );
});

const years = computed(() => {
  return normalizedPeriods.value;
});

function yearLabel(year) {
  const value = Number(year);

  return value < 100
      ? String(2000 + value)
      : String(value);
}

function periodForYear(year) {
  return years.value.find(
      (item) => Number(item.year) === Number(year)
  );
}

function isSelected(year, month) {
  const selectedYear = draftPeriod.value.find(
      (item) => Number(item.year) === Number(year)
  );

  return selectedYear?.months.includes(Number(month)) ?? false;
}

function isYearSelected(year) {
  const period = periodForYear(year);
  const selected = draftPeriod.value.find(
      (item) => Number(item.year) === Number(year)
  );

  if (!selected || !period) {
    return false;
  }

  return period.months.every((month) =>
      selected.months.includes(Number(month))
  );
}

function isYearPartial(year) {
  const selected = draftPeriod.value.find(
      (item) => Number(item.year) === Number(year)
  );

  return Boolean(
      selected &&
      selected.months.length > 0 &&
      !isYearSelected(year)
  );
}

function toggleMonth(year, month) {
  const period = periodForYear(year);

  if (!period?.months.includes(Number(month))) {
    return;
  }

  const yearIndex = draftPeriod.value.findIndex(
      (item) => Number(item.year) === Number(year)
  );

  if (yearIndex === -1) {
    draftPeriod.value.push({
      year: Number(year),
      months: [Number(month)]
    });

    return;
  }

  const selectedYear = draftPeriod.value[yearIndex];
  const monthIndex = selectedYear.months.indexOf(
      Number(month)
  );

  if (monthIndex === -1) {
    selectedYear.months.push(Number(month));
    selectedYear.months.sort((a, b) => a - b);
  } else {
    selectedYear.months.splice(monthIndex, 1);
  }

  if (selectedYear.months.length === 0) {
    draftPeriod.value.splice(yearIndex, 1);
  }
}

function toggleYear(year) {
  const period = periodForYear(year);

  if (!period) {
    return;
  }

  const yearIndex = draftPeriod.value.findIndex(
      (item) => Number(item.year) === Number(year)
  );

  if (isYearSelected(year)) {
    if (yearIndex !== -1) {
      draftPeriod.value.splice(yearIndex, 1);
    }

    return;
  }

  const selectedMonths = [...period.months];

  if (yearIndex === -1) {
    draftPeriod.value.push({
      year: Number(year),
      months: selectedMonths
    });
  } else {
    draftPeriod.value[yearIndex].months = selectedMonths;
  }
}

function clearSelection() {
  draftPeriod.value = [];
}

function close() {
  emit("update:modelValue", false);
}

function apply() {
  const result = draftPeriod.value
      .filter((item) => item.months.length > 0)
      .map((item) => ({
        year: Number(item.year),
        months: [...item.months].sort((a, b) => a - b)
      }))
      .sort((a, b) => b.year - a.year);

  emit("apply", result);
  emit("update:modelValue", false);
}

function onKeydown(event) {
  if (event.key === "Escape") {
    close();
  }
}

watch(
    () => props.modelValue,
    (isOpen) => {
      if (isOpen) {
        draftPeriod.value = structuredClone(
            props.selectedPeriod ?? []
        );
      }
    }
);

watch(
    () => props.selectedPeriod,
    (value) => {
      if (!props.modelValue) {
        draftPeriod.value = structuredClone(value ?? []);
      }
    },
    { deep: true }
);
</script>

<template>
  <Teleport to="body">
    <div
        v-if="modelValue"
        class="period-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="period-modal-title"
        @keydown="onKeydown">
      <div
          class="period-modal__backdrop"
          @click="close">
      </div>

      <section class="period-modal__dialog">
        <header class="period-modal__header">
          <div>
                        <span class="period-modal__caption">
                            Фильтр маршрутов
                        </span>

            <h2 id="period-modal-title">
              Выбор периода
            </h2>
          </div>

          <button
              class="period-modal__close"
              type="button"
              aria-label="Закрыть"
              @click="close">
            ×
          </button>
        </header>

        <div class="period-modal__content">
          <div class="period-modal__legend">
                        <span>
                            Выберите один или несколько месяцев
                        </span>

            <button
                class="reset-button"
                type="button"
                @click="clearSelection">
              Очистить
            </button>
          </div>

          <div class="period-modal__grid">
            <div class="period-modal__months-header">
              <span>Год</span>

              <span
                  v-for="month in months"
                  :key="month.value">
                                {{ month.label }}
                            </span>
            </div>

            <div
                v-for="period in years"
                :key="period.year"
                class="period-modal__row">
              <button
                  class="period-modal__year-btn"
                  :class="{
                                    'is-selected':
                                        isYearSelected(period.year),
                                    'is-partial':
                                        isYearPartial(period.year)
                                }"
                  type="button"
                  @click="toggleYear(period.year)">
                {{ yearLabel(period.year) }}
              </button>

              <button
                  v-for="month in months"
                  :key="
                                    `${period.year}-${month.value}`
                                "
                  class="period-modal__month-btn"
                  :class="{
                                    'is-selected':
                                        isSelected(
                                            period.year,
                                            month.value
                                        ),
                                    'is-disabled':
                                        !period.months.includes(
                                            month.value
                                        )
                                }"
                  type="button"
                  :disabled="
                                    !period.months.includes(
                                        month.value
                                    )
                                "
                  @click="
                                    toggleMonth(
                                        period.year,
                                        month.value
                                    )
                                ">
                {{ month.label }}
              </button>
            </div>
          </div>
        </div>

        <footer class="period-modal__actions">
          <button
              class="reset-button"
              type="button"
              @click="close">
            Отмена
          </button>

          <button
              class="upload-button"
              type="button"
              @click="apply">
            Применить
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>