import { useEffect } from "react";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function parseValue(raw) {
  const text = (raw || "").trim();
  if (!text) return { type: "empty", value: "" };

  const numeric = text
    .replace(/\u00A0/g, " ")
    .replace(/[%,$€₺£]/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  if (/^-?\d+(\.\d+)?$/.test(numeric)) {
    return { type: "number", value: Number(numeric) };
  }

  const ts = Date.parse(text);
  if (!Number.isNaN(ts)) {
    return { type: "date", value: ts };
  }

  return { type: "text", value: text.toLowerCase() };
}

function compareValues(a, b) {
  if (a.type === "empty" && b.type === "empty") return 0;
  if (a.type === "empty") return 1;
  if (b.type === "empty") return -1;
  if (a.type === b.type && (a.type === "number" || a.type === "date")) return a.value - b.value;
  return collator.compare(String(a.value), String(b.value));
}

function hasCustomSorting(table) {
  if (table.hasAttribute("data-disable-global-sort")) return true;
  if (table.querySelector("th[aria-sort]")) return true;
  if (table.querySelector("th.sortable, th.sortable-col, th[data-sortable='true']")) return true;
  if (table.querySelector("th[style*='cursor: pointer'], th[style*='cursor:pointer']")) return true;
  return false;
}

export function useGlobalTableSort(rootSelector = ".admin-content") {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return undefined;

    const cleanupFns = [];

    const setupTable = (table) => {
      if (!table || table.dataset.globalSortReady === "1") return;
      if (hasCustomSorting(table)) return;

      const thead = table.querySelector("thead");
      const tbody = table.querySelector("tbody");
      if (!thead || !tbody) return;

      const headers = Array.from(thead.querySelectorAll("th"));
      if (headers.length < 2) return;

      const state = { col: -1, dir: "none", originalRows: null };
      table.dataset.globalSortReady = "1";

      const updateHeaderState = () => {
        headers.forEach((th, i) => {
          let ariaSort = "none";
          if (state.col === i && state.dir === "asc") ariaSort = "ascending";
          if (state.col === i && state.dir === "desc") ariaSort = "descending";
          th.setAttribute("aria-sort", ariaSort);
          th.classList.toggle("sorted", state.col === i && state.dir !== "none");

          const indicator = th.querySelector(".sort-icon");
          if (!indicator) return;
          if (state.col === i && state.dir === "asc") {
            indicator.textContent = "▲";
            indicator.classList.add("sort-icon-active");
            indicator.classList.remove("sort-icon-inactive");
          } else if (state.col === i && state.dir === "desc") {
            indicator.textContent = "▼";
            indicator.classList.add("sort-icon-active");
            indicator.classList.remove("sort-icon-inactive");
          } else {
            indicator.textContent = "▲";
            indicator.classList.remove("sort-icon-active");
            indicator.classList.add("sort-icon-inactive");
          }
        });
      };

      const restoreOriginalRows = () => {
        if (!Array.isArray(state.originalRows)) return;
        const frag = document.createDocumentFragment();
        state.originalRows.forEach((tr) => frag.appendChild(tr));
        tbody.appendChild(frag);
      };

      const applySort = (index) => {
        if (!state.originalRows) {
          state.originalRows = Array.from(tbody.querySelectorAll("tr"));
        }

        if (state.col !== index) {
          state.col = index;
          state.dir = "asc";
        } else if (state.dir === "asc") {
          state.dir = "desc";
        } else if (state.dir === "desc") {
          state.dir = "none";
        } else {
          state.dir = "asc";
        }

        if (state.dir === "none") {
          state.col = -1;
          restoreOriginalRows();
          updateHeaderState();
          return;
        }

        const rows = Array.from(tbody.querySelectorAll("tr"));
        rows.sort((rowA, rowB) => {
          const cellA = rowA.children[index];
          const cellB = rowB.children[index];
          const valA = parseValue(cellA?.textContent || "");
          const valB = parseValue(cellB?.textContent || "");
          const cmp = compareValues(valA, valB);
          return state.dir === "asc" ? cmp : -cmp;
        });
        const frag = document.createDocumentFragment();
        rows.forEach((tr) => frag.appendChild(tr));
        tbody.appendChild(frag);
        updateHeaderState();
      };

      headers.forEach((th, index) => {
        if (Number(th.getAttribute("colspan") || "1") > 1) return;

        th.classList.add("sortable");
        th.setAttribute("tabindex", "0");
        th.setAttribute("aria-sort", "none");

        if (!th.querySelector(".sort-icon")) {
          const indicator = document.createElement("span");
          indicator.className = "sort-icon sort-icon-inactive";
          indicator.textContent = "▲";
          th.appendChild(indicator);
        }

        const onClick = () => applySort(index);
        const onKeyDown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            applySort(index);
          }
        };

        th.addEventListener("click", onClick);
        th.addEventListener("keydown", onKeyDown);
        cleanupFns.push(() => {
          th.removeEventListener("click", onClick);
          th.removeEventListener("keydown", onKeyDown);
        });
      });
    };

    const scan = () => {
      root.querySelectorAll("table").forEach(setupTable);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanupFns.forEach((fn) => fn());
    };
  }, [rootSelector]);
}
