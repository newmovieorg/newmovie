import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { cacheGet, cacheSet } from "./cache.js";
import { movieCardHTML, isFavorite, toggleFavorite, shareItem, skeletonCards } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

const params = new URLSearchParams(location.search);
const id = params.get("id");

function setMeta(m) {
  document.title = `${m.title} | سینماتک`;
  const desc = (m.synopsis || "").slice(0, 155);
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) { metaDesc = document.createElement("meta"); metaDesc.name = "description"; document.head.appendChild(metaDesc); }
  metaDesc.content = desc;

  const ogTags = { "og:title": m.title, "og:description": desc, "og:image": m.posterUrl || "", "og:type": "video.movie" };
  Object.entries(ogTags).forEach(([prop, content]) => {
    let tag = document.querySelector(`meta[property="${prop}"]`);
    if (!tag) { tag = document.createElement("meta"); tag.setAttribute("property", prop); document.head.appendChild(tag); }
    tag.setAttribute("content", content);
  });

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
  canonical.href = location.href;

  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": m.type === "series" ? "TVSeries" : "Movie",
    name: m.title,
    description: m.synopsis || "",
    image: m.posterUrl || "",
    genre: m.genre || undefined
  });
  document.head.appendChild(ld);
}

function renderFavoriteBtn(m) {
  const btn = document.getElementById("favBtn");
  const sync = () => {
    const active = isFavorite(m.id);
    btn.textContent = active ? "★ در علاقه‌مندی‌ها" : "☆ افزودن به علاقه‌مندی‌ها";
    btn.classList.toggle("btn-primary", active);
    btn.classList.toggle("btn-ghost", !active);
  };
  sync();
  btn.onclick = () => { toggleFavorite(m.id); sync(); };
}

function render(m, allMovies) {
  setMeta(m);

  document.getElementById("detailHero").style.backgroundImage = `url('${m.backdropUrl || m.posterUrl || ""}')`;
  document.getElementById("detailPoster").style.backgroundImage = `url('${m.posterUrl || ""}')`;
  document.getElementById("detailTitle").textContent = m.title || "";

  const tags = [];
  if (m.year) tags.push(m.year);
  if (m.genre) tags.push(m.genre);
  if (m.runtime) tags.push(`${m.runtime} دقیقه`);
  if (m.rating) tags.push(`★ ${m.rating}${m.votes ? ` (${m.votes} رأی)` : ""}`);
  document.getElementById("detailTags").innerHTML = tags.map(t => `<span>${t}</span>`).join("");

  document.getElementById("detailSynopsis").textContent = m.synopsis || "";

  const meta = [];
  if (m.originalTitle) meta.push(["عنوان اصلی", m.originalTitle]);
  if (m.country) meta.push(["کشور", m.country]);
  if (m.language) meta.push(["زبان", m.language]);
  if (m.director) meta.push(["کارگردان", m.director]);
  const metaBox = document.getElementById("metaGrid");
  metaBox.innerHTML = meta.map(([k, v]) => `<div class="meta-item"><span>${k}</span><strong>${v}</strong></div>`).join("");
  document.getElementById("metaSection").style.display = meta.length ? "" : "none";

  const castSection = document.getElementById("castSection");
  if (m.cast) {
    const names = m.cast.split(",").map(s => s.trim()).filter(Boolean);
    document.getElementById("castRow").innerHTML = names.map(n => `<span class="cast-chip">${n}</span>`).join("");
    castSection.style.display = "";
  } else {
    castSection.style.display = "none";
  }

  const trailerBtn = document.getElementById("trailerLink");
  if (m.trailerUrl) { trailerBtn.href = m.trailerUrl; trailerBtn.style.display = "inline-flex"; }

  document.getElementById("shareBtn").onclick = () => shareItem(m.title, location.href);
  renderFavoriteBtn(m);

  const similar = allMovies.filter(x => x.id !== m.id && x.genre === m.genre).slice(0, 12);
  const similarSection = document.getElementById("similarSection");
  if (similar.length) {
    document.getElementById("similarGrid").innerHTML = similar.map(movieCardHTML).join("");
    similarSection.style.display = "";
  } else {
    similarSection.style.display = "none";
  }
}

async function init() {
  if (!id) {
    document.getElementById("detailTitle").textContent = "موردی مشخص نشده";
    return;
  }

  document.getElementById("similarGrid").innerHTML = skeletonCards(6);

  let all;
  try {
    const cached = cacheGet("movies_all");
    if (cached) {
      all = cached;
    } else {
      const snap = await getDocs(query(collection(db, "movies"), orderBy("createdAt", "desc")));
      all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.active !== false);
      cacheSet("movies_all", all);
    }
  } catch (e) {
    document.getElementById("detailTitle").textContent = "خطا در بارگذاری";
    return;
  }

  const m = all.find(x => x.id === id);
  if (!m) {
    document.getElementById("detailTitle").textContent = "این مورد پیدا نشد";
    return;
  }

  render(m, all);
}

init();
