import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { cacheGet, cacheSet } from "./cache.js";
import { skeletonCards, movieCardHTML } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

export async function initListPage(pageType) {
  const grid = document.getElementById("resultsGrid");
  grid.innerHTML = skeletonCards(12);

  let all;
  try {
    const cached = cacheGet("movies_all");
    if (cached) {
      all = cached;
    } else {
      const snap = await getDocs(query(collection(db, "movies"), orderBy("createdAt", "desc")));
      all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.active !== false);
      cacheSet("movies_all", all);
    }
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<p class="error-note">خطا در اتصال به دیتابیس.</p>`;
    return;
  }

  const items = all.filter(m => pageType === "series" ? m.type === "series" : m.type !== "series");

  const genreSelect = document.getElementById("filterGenre");
  const yearSelect = document.getElementById("filterYear");
  const sortSelect = document.getElementById("filterSort");
  const searchInput = document.getElementById("pageSearchInput");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  [...new Set(items.map(m => m.genre).filter(Boolean))].sort().forEach(g => {
    const o = document.createElement("option"); o.value = g; o.textContent = g; genreSelect.appendChild(o);
  });
  [...new Set(items.map(m => m.year).filter(Boolean))].sort((a, b) => b - a).forEach(y => {
    const o = document.createElement("option"); o.value = y; o.textContent = y; yearSelect.appendChild(o);
  });

  const params = new URLSearchParams(location.search);
  if (params.get("q")) searchInput.value = params.get("q");
  if (params.get("genre")) genreSelect.value = params.get("genre");

  const pageSize = 18;
  let shown = 0;
  let filtered = [];

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const g = genreSelect.value;
    const y = yearSelect.value;
    const sort = sortSelect.value;

    filtered = items.filter(m => {
      if (q && !(m.title || "").toLowerCase().includes(q)) return false;
      if (g && m.genre !== g) return false;
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
    grid.insertAdjacentHTML("beforeend", chunk.map(movieCardHTML).join(""));
    shown += chunk.length;
    loadMoreBtn.style.display = shown < filtered.length ? "inline-flex" : "none";
    if (!filtered.length) grid.innerHTML = `<p class="empty-note">چیزی با این فیلتر پیدا نشد.</p>`;
  }

  loadMoreBtn.addEventListener("click", renderMore);
  [searchInput].forEach(el => el.addEventListener("input", applyFilters));
  [genreSelect, yearSelect, sortSelect].forEach(el => el.addEventListener("change", applyFilters));

  applyFilters();
}
