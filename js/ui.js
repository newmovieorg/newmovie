export function showToast(msg, type = "ok") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
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

const FAV_KEY = "cinematak_favorites";

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
        ${m.rating ? `<span class="card-rating">★ ${m.rating}</span>` : ""}
        <span class="card-type-badge">${typeLabel}</span>
      </div>
      <div class="card-body">
        <p class="card-title">${m.title}</p>
        <p class="card-meta">${m.year || ""}${m.genre ? " · " + m.genre : ""}</p>
      </div>
    </a>
  `;
}
