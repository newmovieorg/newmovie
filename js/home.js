import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { cacheGet, cacheSet } from "./cache.js";
import { skeletonCards, movieCardHTML, showToast } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

let allMovies = [];
let heroes = [];
let heroIndex = 0;
let heroTimer = null;

async function fetchMovies() {
  const cached = cacheGet("movies_all");
  if (cached) { allMovies = cached; return; }
  const snap = await getDocs(query(collection(db, "movies"), orderBy("createdAt", "desc")));
  allMovies = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.active !== false);
  cacheSet("movies_all", allMovies);
}

async function fetchHeroes() {
  const cached = cacheGet("heroes_all");
  if (cached) { heroes = cached; return; }
  const snap = await getDocs(collection(db, "heroes"));
  heroes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(h => h.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  cacheSet("heroes_all", heroes);
}

function renderHero() {
  const box = document.getElementById("heroCarousel");
  if (!heroes.length) {
    box.innerHTML = `<div class="wrap"><div class="hero-inner"><p class="hero-desc">هنوز محتوایی برای نمایش در هیرو ثبت نشده. از پنل ادمین یک هیرو اضافه کن.</p></div></div>`;
    return;
  }
  box.innerHTML = heroes.map((h, i) => `
    <div class="hero-slide ${i === 0 ? "active" : ""}" data-i="${i}">
      <div class="hero-slide-bg" style="background-image:url('${h.backdropUrl || ""}')"></div>
      <div class="hero-slide-fg" style="background-image:url('${h.backdropUrl || ""}')"></div>
      <div class="hero-slide-overlay"></div>
      <div class="wrap">
        <div class="hero-inner">
          <div class="hero-badges">
            ${h.kicker ? `<span class="hero-badge">${h.kicker}</span>` : ""}
            ${h.year ? `<span class="hero-badge outline">${h.year}</span>` : ""}
            ${h.genre ? `<span class="hero-badge outline">${h.genre}</span>` : ""}
          </div>
          <h1 class="hero-title">${h.title || ""}</h1>
          <p class="hero-desc">${h.description || ""}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="${h.movieId ? `movie.html?id=${h.movieId}` : "#movies"}">مشاهده جزئیات</a>
          </div>
        </div>
      </div>
    </div>
  `).join("") + (heroes.length > 1 ? `
    <button class="hero-nav-btn hero-prev" id="heroPrev" aria-label="قبلی">‹</button>
    <button class="hero-nav-btn hero-next" id="heroNext" aria-label="بعدی">›</button>
    <div class="hero-indicators">${heroes.map((_, i) => `<button class="hero-dot ${i === 0 ? "active" : ""}" data-i="${i}"><span class="hero-dot-fill"></span></button>`).join("")}</div>
  ` : "");

  if (heroes.length > 1) {
    document.getElementById("heroPrev").onclick = () => goHero(heroIndex - 1);
    document.getElementById("heroNext").onclick = () => goHero(heroIndex + 1);
    box.querySelectorAll(".hero-dot").forEach(d => d.onclick = () => goHero(+d.dataset.i));
    let startX = 0;
    box.addEventListener("touchstart", e => startX = e.touches[0].clientX, { passive: true });
    box.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 50) goHero(heroIndex - 1);
      else if (dx < -50) goHero(heroIndex + 1);
    }, { passive: true });
    startAutoSlide();
  }
}

function goHero(i) {
  heroIndex = (i + heroes.length) % heroes.length;
  document.querySelectorAll(".hero-slide").forEach((s, idx) => s.classList.toggle("active", idx === heroIndex));
  document.querySelectorAll(".hero-dot").forEach((d, idx) => d.classList.toggle("active", idx === heroIndex));
  startAutoSlide();
}

function startAutoSlide() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => goHero(heroIndex + 1), 6000);
}

function renderSection(sectionElId, listElId, list) {
  const section = document.getElementById(sectionElId);
  const el = document.getElementById(listElId);
  if (!list.length) { section.style.display = "none"; return; }
  section.style.display = "";
  el.innerHTML = list.map(movieCardHTML).join("");
}

async function init() {
  document.getElementById("heroCarousel").innerHTML = `<div class="skel skel-hero"></div>`;
  document.querySelectorAll(".hscroll").forEach(el => el.innerHTML = skeletonCards(6));

  try {
    await Promise.all([fetchMovies(), fetchHeroes()]);
  } catch (e) {
    console.error(e);
    document.getElementById("heroCarousel").innerHTML = `<div class="wrap"><p class="error-note">خطا در اتصال به دیتابیس.</p></div>`;
    return;
  }

  renderHero();

  const movies = allMovies.filter(m => m.type !== "series");
  const series = allMovies.filter(m => m.type === "series");

  renderSection("sec-latestMovies", "latestMovies", [...movies].slice(0, 12));
  renderSection("sec-popularMovies", "popularMovies", [...movies].sort((a, b) => (b.popularity || b.rating || 0) - (a.popularity || a.rating || 0)).slice(0, 12));
  renderSection("sec-topRated", "topRated", [...allMovies].filter(m => m.rating).sort((a, b) => b.rating - a.rating).slice(0, 12));
  renderSection("sec-latestSeries", "latestSeries", [...series].slice(0, 12));
  renderSection("sec-popularSeries", "popularSeries", [...series].sort((a, b) => (b.popularity || b.rating || 0) - (a.popularity || a.rating || 0)).slice(0, 12));

  const genreMap = {};
  allMovies.forEach(m => { if (m.genre) (genreMap[m.genre] ||= []).push(m); });
  const genreBox = document.getElementById("genreSections");
  const genreEntries = Object.entries(genreMap);
  genreBox.innerHTML = genreEntries.length ? genreEntries.map(([g, items]) => `
    <section class="section">
      <div class="section-head"><h2 class="section-title">${g}</h2></div>
      <div class="hscroll">${items.slice(0, 12).map(movieCardHTML).join("")}</div>
    </section>
  `).join("") : "";

  if (!allMovies.length) {
    document.getElementById("emptyState").style.display = "block";
  }
}

init();
