<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
  label: { type: String, default: "" },
  allText: { type: String, default: "Все" },
  searchable: { type: Boolean, default: true }
});

const emit = defineEmits(["update:modelValue", "change"]);
const isOpen = ref(false);
const search = ref("");
const rootElement = ref(null);

const normalizedOptions = computed(() => props.options.map((option) => {
  if (typeof option === "string" || typeof option === "number") {
    return { value: String(option), label: String(option) };
  }

  return {
    value: String(option.value ?? option.id ?? option.number ?? option.name ?? ""),
    label: String(option.label ?? option.name ?? option.title ?? option.number ?? option.value ?? "")
  };
}).filter((option) => option.value));

const filteredOptions = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("ru");
  return query
      ? normalizedOptions.value.filter((option) => option.label.toLocaleLowerCase("ru").includes(query))
      : normalizedOptions.value;
});

const selectedValues = computed(() => new Set((props.modelValue || []).map(String)));
const selectedText = computed(() => {
  const selected = normalizedOptions.value.filter((option) => selectedValues.value.has(option.value));
  if (!selected.length) return props.allText;
  if (selected.length === 1) return selected[0].label;
  return `Выбрано: ${selected.length}`;
});

function toggle() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    document.dispatchEvent(new CustomEvent("filter-combobox-v2-open", { detail: rootElement.value }));
    search.value = "";
  }
}

function close() {
  isOpen.value = false;
  search.value = "";
}

function update(values) {
  emit("update:modelValue", values);
  emit("change", values);
}

function toggleOption(value) {
  const values = new Set(selectedValues.value);
  if (values.has(value)) values.delete(value);
  else values.add(value);
  update([...values]);
}

function reset() {
  update([]);
}

function handleDocumentClick(event) {
  if (rootElement.value && !rootElement.value.contains(event.target)) close();
}

function handleAnotherOpen(event) {
  if (event.detail !== rootElement.value) close();
}

function handleKeydown(event) {
  if (isOpen.value && event.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("filter-combobox-v2-open", handleAnotherOpen);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleKeydown);
  document.removeEventListener("filter-combobox-v2-open", handleAnotherOpen);
});
</script>

<template>
  <div ref="rootElement" class="filter-combobox filter-combobox-v2" :class="{ 'is-open': isOpen }" @click.stop>
    <span class="filter-combobox__label">{{ label }}</span>
    <div class="filter-combobox__control">
      <button class="filter-combobox__button" type="button" :aria-expanded="isOpen" @click="toggle">
        <span class="filter-combobox__value" :class="{ 'is-placeholder': !selectedValues.size }">{{ selectedText }}</span>
        <svg class="filter-combobox__caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5-1.4-1.4L12 11.2 8.4 7.6 7 9Z" /></svg>
      </button>
      <div v-if="isOpen" class="filter-combobox__dropdown">
        <div v-if="searchable" class="filter-combobox__search-wrap">
          <input v-model="search" class="filter-combobox__search" type="search" autocomplete="off" placeholder="Поиск..." @click.stop />
        </div>
        <ul class="filter-combobox__list">
          <li class="filter-combobox__option filter-combobox__option--all" :class="{ 'is-selected': !selectedValues.size }" @click="reset">{{ allText }}</li>
          <li v-for="option in filteredOptions" :key="option.value" class="filter-combobox__option" :class="{ 'is-selected': selectedValues.has(option.value) }" @click="toggleOption(option.value)">
            <span class="filter-combobox-v2__checkbox" :class="{ 'is-checked': selectedValues.has(option.value) }" aria-hidden="true">✓</span>
            {{ option.label }}
          </li>
          <li v-if="filteredOptions.length === 0" class="filter-combobox__empty">Ничего не найдено</li>
        </ul>
      </div>
    </div>
  </div>
</template>
