import { ref } from "vue";

/**
 * Сортировка таблицы по клику на заголовок столбца.
 * Цикл: первый клик — убывание, второй — возрастание,
 * третий — сброс сортировки.
 *
 * Возвращает:
 *  - sortKey, sortDirection — состояние сортировки;
 *  - toggleSort — переключение цикла;
 *  - headerSortClass — классы заголовка для подсветки;
 *  - headerAriaSort — ARIA-атрибут направления;
 *  - sortIndicator — стрелка направления сортировки.
 */
export function useColumnSort() {
    const sortKey = ref("");
    const sortDirection = ref(""); // "desc" | "asc" | ""

    function toggleSort(columnKey) {
        if (sortKey.value !== columnKey) {
            sortKey.value = columnKey;
            sortDirection.value = "desc";
            return;
        }

        if (sortDirection.value === "desc") {
            sortDirection.value = "asc";
            return;
        }

        if (sortDirection.value === "asc") {
            sortKey.value = "";
            sortDirection.value = "";
        }
    }

    function headerSortClass(columnKey) {
        return {
            "is-sortable": true,
            "sorted-asc":
                sortKey.value === columnKey &&
                sortDirection.value === "asc",
            "sorted-desc":
                sortKey.value === columnKey &&
                sortDirection.value === "desc"
        };
    }

    function headerAriaSort(columnKey) {
        if (sortKey.value !== columnKey) {
            return "none";
        }

        return sortDirection.value === "asc"
            ? "ascending"
            : "descending";
    }

    function sortIndicator(columnKey) {
        if (sortKey.value !== columnKey) {
            return "";
        }

        return sortDirection.value === "asc" ? "▲" : "▼";
    }

    return {
        sortKey,
        sortDirection,
        toggleSort,
        headerSortClass,
        headerAriaSort,
        sortIndicator
    };
}
