import { watchMovies, watchHeroes, watchCategories, watchActors } from "./data.js";
import { skeletonCards, movieCardHTML, escapeHTML } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

const state = { movies: null, categories: null };
let heroIndex = 0;
let heroTimer = null;

document.getElementById("heroCarousel").innerHTML = `<div class="skel skel-hero"></div>`;
document.querySelectorAll(".hscroll").forEach(el => el.innerHTML = skeletonCards(6));

function renderHero(heroes) {
  const box = document.getElementById("heroCarousel");
  if (!heroes.length) {
    box.innerHTML = `<div class="wrap"><div class="hero-inner"><p class="hero-desc">هنوز محتوایی برای نمایش در هیرو ثبت نشده. از پنل ادمین یک هیرو اضافه کن.</p></div></div>`;
    return;
  }
  heroIndex = Math.min(heroIndex, heroes.length - 1);
  box.innerHTML = heroes.map((h, i) => `
    <div class="hero-slide ${i === heroIndex ? "active" : ""}" data-i="${i}">
      <div class="hero-slide-bg" style="background-image:url('${escapeHTML(h.backdropUrl || "")}');background-position:${escapeHTML(h.backdropPosition || "center")}"></div>
      <div class="hero-slide-fg" style="background-image:url('${escapeHTML(h.backdropUrl || "")}');background-position:${escapeHTML(h.backdropPosition || "center")}"></div>
      <div class="hero-slide-overlay"></div>
      <div class="wrap">
        <div class="hero-inner">
          <div class="hero-badges">
            ${h.kicker ? `<span class="hero-badge">${escapeHTML(h.kicker)}</span>` : ""}
            ${h.year ? `<span class="hero-badge outline">${escapeHTML(h.year)}</span>` : ""}
            ${h.genre ? `<span class="hero-badge outline">${escapeHTML(h.genre)}</span>` : ""}
          </div>
          <h1 class="hero-title">${escapeHTML(h.title || "")}</h1>
          <p class="hero-desc">${escapeHTML(h.description || "")}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="${h.movieId ? `movie.html?id=${encodeURIComponent(h.movieId)}` : "#movies"}">مشاهده جزئیات</a>
          </div>
        </div>
      </div>
    </div>
  `).join("") + (heroes.length > 1 ? `
    <button class="hero-nav-btn hero-prev" id="heroPrev" aria-label="قبلی">‹</button>
    <button class="hero-nav-btn hero-next" id="heroNext" aria-label="بعدی">›</button>
    <div class="hero-indicators">${heroes.map((_, i) => `<button class="hero-dot ${i === heroIndex ? "active" : ""}" data-i="${i}"><span class="hero-dot-fill ${i === heroIndex ? "filling" : ""}"></span></button>`).join("")}</div>
  ` : "");

  if (heroes.length > 1) {
    document.getElementById("heroPrev").onclick = () => goHero(heroIndex - 1, heroes);
    document.getElementById("heroNext").onclick = () => goHero(heroIndex + 1, heroes);
    box.querySelectorAll(".hero-dot").forEach(d => d.onclick = () => goHero(+d.dataset.i, heroes));
    let startX = 0;
    box.addEventListener("touchstart", e => startX = e.touches[0].clientX, { passive: true });
    box.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 50) goHero(heroIndex - 1, heroes);
      else if (dx < -50) goHero(heroIndex + 1, heroes);
    }, { passive: true });
    startAutoSlide(heroes);
  }
}

function goHero(i, heroes) {
  heroIndex = (i + heroes.length) % heroes.length;
  document.querySelectorAll(".hero-slide").forEach((s, idx) => s.classList.toggle("active", idx === heroIndex));
  document.querySelectorAll(".hero-dot").forEach((d, idx) => {
    const active = idx === heroIndex;
    d.classList.toggle("active", active);
    const fill = d.querySelector(".hero-dot-fill");
    fill.classList.remove("filling");
    fill.style.width = "0";
    if (active) {
      // Force a reflow so the browser registers width:0 before the
      // transition class goes back on — otherwise it just snaps to 100%.
      void fill.offsetWidth;
      fill.classList.add("filling");
    }
  });
  startAutoSlide(heroes);
}

function startAutoSlide(heroes) {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => goHero(heroIndex + 1, heroes), 6000);
}

function renderSection(sectionElId, listElId, list) {
  const section = document.getElementById(sectionElId);
  const el = document.getElementById(listElId);
  if (!list.length) { section.style.display = "none"; return; }
  section.style.display = "";
  el.innerHTML = list.map(movieCardHTML).join("");
}

function renderSections() {
  const { movies, categories } = state;
  if (movies === null || categories === null) return; // wait for first snapshot of each

  const active = movies;
  const moviesOnly = active.filter(m => m.type !== "series");
  const series = active.filter(m => m.type === "series");
  const decorate = m => ({
    ...m,
    categoryNames: (Array.isArray(m.categoryIds) ? m.categoryIds : [])
      .map(cid => categories.find(c => c.id === cid)?.name).filter(Boolean)
  });

  renderSection("sec-latestMovies", "latestMovies", [...moviesOnly].slice(0, 12).map(decorate));
  renderSection("sec-popularMovies", "popularMovies", [...moviesOnly].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).slice(0, 12).map(decorate));
  renderSection("sec-topRated", "topRated", [...active].filter(m => m.rating).sort((a, b) => b.rating - a.rating).slice(0, 12).map(decorate));
  renderSection("sec-latestSeries", "latestSeries", [...series].slice(0, 12).map(decorate));
  renderSection("sec-popularSeries", "popularSeries", [...series].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).slice(0, 12).map(decorate));

  // Real, shared categories (admin-managed) — a movie belongs to a category
  // only if the admin actually assigned it there via categoryIds. This no
  // longer invents a one-off category per raw genre string.
  const genreBox = document.getElementById("genreSections");
  genreBox.innerHTML = categories.map(cat => {
    const items = active.filter(m => Array.isArray(m.categoryIds) && m.categoryIds.includes(cat.id)).slice(0, 12).map(decorate);
    if (!items.length) return "";
    return `
      <section class="section">
        <div class="section-head"><h2 class="section-title">${cat.name}</h2></div>
        <div class="hscroll">${items.map(movieCardHTML).join("")}</div>
      </section>`;
  }).join("");

  document.getElementById("emptyState").style.display = active.length ? "none" : "block";
}

function showError() {
  document.getElementById("heroCarousel").innerHTML = `<div class="wrap"><p class="error-note">خطا در اتصال به دیتابیس.</p></div>`;
}

function renderActorsSection(actors) {
  const section = document.getElementById("sec-actors");
  const row = document.getElementById("actorsRow");
  // فقط بازیگرهایی که خودِ ادمین با تیک «نمایش در صفحه اصلی» انتخابشون کرده،
  // نه هر بازیگری که فقط برای کست یک فیلم اضافه شده — وگرنه با اضافه‌شدن
  // فیلم‌های بیشتر، این ردیف بی‌نهایت بزرگ می‌شد.
  const featured = actors.filter(a => a.featured).slice(0, 20);
  if (!featured.length) { section.style.display = "none"; return; }
  section.style.display = "";
  row.innerHTML = featured.map(a => `
    <a class="actor-card" href="actor.html?id=${a.id}">
      <span class="actor-card-photo">${a.photoUrl ? `<img src="${escapeHTML(a.photoUrl)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>
      <span class="actor-card-name">${escapeHTML(a.name || "")}</span>
    </a>`).join("");
}

watchMovies(movies => { state.movies = movies; renderSections(); }, showError);
watchHeroes(heroes => renderHero(heroes), showError);
watchCategories(categories => { state.categories = categories; renderSections(); }, showError);
watchActors(renderActorsSection, () => renderActorsSection([]));
