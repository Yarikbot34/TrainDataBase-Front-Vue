<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref
} from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ""
  },

  options: {
    type: Array,
    default: () => []
  },

  label: {
    type: String,
    default: ""
  },

  placeholder: {
    type: String,
    default: "Выберите значение"
  },

  allText: {
    type: String,
    default: "Все"
  },

  searchable: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits([
  "update:modelValue",
  "change"
]);

const isOpen = ref(false);
const search = ref("");
const rootElement = ref(null);

const normalizedOptions = computed(() => {
  return props.options
      .map((option) => {
        if (
            typeof option === "string" ||
            typeof option === "number"
        ) {
          return {
            value: String(option),
            label: String(option)
          };
        }

        return {
          value: String(
              option.value ??
              option.id ??
              option.number ??
              option.name ??
              ""
          ),

          label: String(
              option.label ??
              option.name ??
              option.title ??
              option.number ??
              option.value ??
              ""
          )
        };
      })
      .filter((option) => option.value !== "");
});

const filteredOptions = computed(() => {
  const query = search.value
      .trim()
      .toLocaleLowerCase("ru");

  if (!query) {
    return normalizedOptions.value;
  }

  return normalizedOptions.value.filter((option) => {
    return option.label
        .toLocaleLowerCase("ru")
        .includes(query);
  });
});

const selectedOption = computed(() => {
  return normalizedOptions.value.find((option) => {
    return option.value === String(props.modelValue);
  });
});

const selectedText = computed(() => {
  return selectedOption.value?.label ?? props.allText;
});

function open() {
  document.dispatchEvent(
      new CustomEvent("filter-combobox-open", {
        detail: rootElement.value
      })
  );

  isOpen.value = true;
  search.value = "";
}

function close() {
  isOpen.value = false;
  search.value = "";
}

function toggle() {
  if (isOpen.value) {
    close();
  } else {
    open();
  }
}

function selectOption(value) {
  emit("update:modelValue", value);
  emit("change", value);
  close();
}

function handleAnotherComboboxOpen(event) {
  if (event.detail !== rootElement.value) {
    close();
  }
}

function reset() {
  selectOption("");
}

function handleDocumentClick(event) {
  if (
      rootElement.value &&
      !rootElement.value.contains(event.target)
  ) {
    close();
  }
}

function handleKeydown(event) {
  if (!isOpen.value) {
    return;
  }

  if (event.key === "Escape") {
    close();
  }
}

onMounted(() => {
  document.addEventListener(
      "click",
      handleDocumentClick
  );

  document.addEventListener(
      "keydown",
      handleKeydown
  );

  document.addEventListener(
      "filter-combobox-open",
      handleAnotherComboboxOpen
  );
});

onBeforeUnmount(() => {
  document.removeEventListener(
      "click",
      handleDocumentClick
  );

  document.removeEventListener(
      "keydown",
      handleKeydown
  );

  document.removeEventListener(
      "filter-combobox-open",
      handleAnotherComboboxOpen
  );
});


</script>

<template>
  <div
      ref="rootElement"
      class="filter-combobox"
      :class="{ 'is-open': isOpen }"
      @click.stop>
        <span class="filter-combobox__label">
            {{ label }}
        </span>

    <div class="filter-combobox__control">
      <button
          class="filter-combobox__button"
          type="button"
          :aria-expanded="isOpen"
          @click="toggle">
                <span
                    class="filter-combobox__value"
                    :class="{
                        'is-placeholder':
                            !selectedOption
                    }">
                    {{ selectedText }}
                </span>

        <svg
            class="filter-combobox__caret"
            viewBox="0 0 24 24"
            aria-hidden="true">
          <path
              d="m7 9 5 5 5-5-1.4-1.4L12 11.2 8.4 7.6 7 9Z" />
        </svg>
      </button>

      <div
          v-if="isOpen"
          class="filter-combobox__dropdown">
        <div
            v-if="searchable"
            class="filter-combobox__search-wrap">
          <svg
              viewBox="0 0 24 24"
              aria-hidden="true">
            <path
                d="m21 19.6-4.7-4.7a7 7 0 1 0-1.4 1.4l4.7 4.7 1.4-1.4ZM5 10a5 5 0 1 1 10 0A5 5 0 0 1 5 10Z" />
          </svg>

          <input
              v-model="search"
              class="filter-combobox__search"
              type="search"
              autocomplete="off"
              placeholder="Поиск..."
              @click.stop />
        </div>

        <ul class="filter-combobox__list">
          <li
              class="
                            filter-combobox__option
                            filter-combobox__option--all
                        "
              :class="{
                            'is-selected':
                                !props.modelValue
                        }"
              @click="reset">
            {{ allText }}
          </li>

          <li
              v-for="option in filteredOptions"
              :key="option.value"
              class="filter-combobox__option"
              :class="{
                            'is-selected':
                                option.value ===
                                String(props.modelValue)
                        }"
              @click="
                            selectOption(option.value)
                        ">
            {{ option.label }}
          </li>

          <li
              v-if="filteredOptions.length === 0"
              class="filter-combobox__empty">
            Ничего не найдено
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>