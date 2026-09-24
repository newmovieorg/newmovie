import { watchMovies, watchCategories } from "./data.js";
import { skeletonCards, movieCardHTML, emptyStateHTML } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

export function initListPage(pageType) {
  const grid = document.getElementById("resultsGrid");
  grid.innerHTML = skeletonCards(12);

  const genreSelect = document.getElementById("filterGenre");
  const yearSelect = document.getElementById("filterYear");
  const sortSelect = document.getElementById("filterSort");
  const searchInput = document.getElementById("pageSearchInput");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  const state = { all: null, categories: null };
  let optionsBuilt = false;
  const pageSize = 18;
  let shown = 0;
  let filtered = [];
  function decorate(items) {
    return items.map(m => ({
      ...m,
      categoryNames: (Array.isArray(m.categoryIds) ? m.categoryIds : [])
        .map(cid => state.categories.find(c => c.id === cid)?.name).filter(Boolean)
    }));
  }

  function buildOptionsOnce(items, categories) {
    if (optionsBuilt) return;
    optionsBuilt = true;

    categories.forEach(cat => {
      const o = document.createElement("option"); o.value = cat.id; o.textContent = cat.name; genreSelect.appendChild(o);
    });
    [...new Set(items.map(m => m.year).filter(Boolean))].sort((a, b) => b - a).forEach(y => {
      const o = document.createElement("option"); o.value = y; o.textContent = y; yearSelect.appendChild(o);
    });

    const params = new URLSearchParams(location.search);
    if (params.get("q")) searchInput.value = params.get("q");
    if (params.get("genre")) genreSelect.value = params.get("genre");
    if (location.hash === "#search") setTimeout(() => searchInput.focus(), 50);
  }

  function applyFilters() {
    const { all } = state;
    if (!all) return;
    const items = all.filter(m => pageType === "series" ? m.type === "series" : m.type !== "series");

    const q = searchInput.value.trim().toLowerCase();
    const catId = genreSelect.value;
    const y = yearSelect.value;
    const sort = sortSelect.value;

    filtered = items.filter(m => {
      if (q && !(m.title || "").toLowerCase().includes(q)) return false;
      if (catId && !(Array.isArray(m.categoryIds) && m.categoryIds.includes(catId))) return false;
      if (y && String(m.year) !== y) return false;
      return true;
    });

    if (sort === "rating") filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === "year") filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    else filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    shown = 0;
    grid.innerHTML = "";
    renderMore();
  }

  function renderMore() {
    const chunk = filtered.slice(shown, shown + pageSize);
    grid.insertAdjacentHTML("beforeend", decorate(chunk).map(movieCardHTML).join(""));
    shown += chunk.length;
    loadMoreBtn.style.display = shown < filtered.length ? "inline-flex" : "none";
    if (!filtered.length) grid.innerHTML = emptyStateHTML("چیزی با این فیلتر پیدا نشد", "فیلترها را تغییر بده یا دوباره امتحان کن.");
  }

  function tryInit() {
    const { all, categories } = state;
    if (all === null || categories === null) return;
    const items = all.filter(m => pageType === "series" ? m.type === "series" : m.type !== "series");
    buildOptionsOnce(items, categories);
    applyFilters();
  }

  function showError() {
    grid.innerHTML = `<p class="error-note">خطا در اتصال به دیتابیس.</p>`;
  }

  watchMovies(movies => { state.all = movies; tryInit(); }, showError);
  watchCategories(categories => { state.categories = categories; tryInit(); }, showError);

  loadMoreBtn.addEventListener("click", renderMore);
  [searchInput].forEach(el => el.addEventListener("input", applyFilters));
  [genreSelect, yearSelect, sortSelect].forEach(el => el.addEventListener("change", applyFilters));
}
