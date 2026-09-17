export const STAR_FILLED = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`;
export const STAR_OUTLINE = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`;

// Toggles a real loading state (spinner + disabled) on any button running
// an async action, instead of leaving it clickable while work is in flight.
export function setButtonLoading(btn, loading, loadingLabel) {
  if (!btn) return;
  if (loading) {
    if (btn.dataset.originalHtml === undefined) btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add("btn-loading");
    btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${loadingLabel ? `<span>${loadingLabel}</span>` : ""}`;
  } else {
    btn.disabled = false;
    btn.classList.remove("btn-loading");
    if (btn.dataset.originalHtml !== undefined) {
      btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
    }
  }
}

export function showToast(msg, type = "ok") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");
    document.body.appendChild(wrap);
  }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export function skeletonCards(n = 10) {
  return Array.from({ length: n }).map(() => `
    <div class="card">
      <div class="skel skel-card"></div>
      <div class="card-body">
        <div class="skel skel-line w80"></div>
        <div class="skel skel-line w40"></div>
      </div>
    </div>
  `).join("");
}

export function skeletonHero() {
  return `<div class="skel skel-hero"></div>`;
}

const FAV_KEY = "newmovie_favorites";

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
  catch { return []; }
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}

export function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx > -1) favs.splice(idx, 1);
  else favs.push(id);
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch {}
  return favs.includes(id);
}

export function shareItem(title, url) {
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast("لینک کپی شد"));
  }
}

export function movieCardHTML(m) {
  const typeLabel = m.type === "series" ? "سریال" : "فیلم";
  return `
    <a class="card" href="movie.html?id=${m.id}">
      <div class="card-poster" style="background-image:url('${m.posterUrl || ""}')">
        ${m.rating ? `<span class="card-rating">${STAR_FILLED}${m.rating}</span>` : ""}
        <span class="card-type-badge">${typeLabel}</span>
      </div>
      <div class="card-body">
        <p class="card-title">${m.title}</p>
        <p class="card-meta">${m.year || ""}${m.genre ? " · " + m.genre : ""}</p>
      </div>
    </a>
  `;
}
