import { watchMovies, watchCategories } from "./data.js";
import { movieCardHTML, isFavorite, toggleFavorite, isLiked, toggleLike, shareItem, skeletonCards, STAR_FILLED, STAR_OUTLINE, THUMB_FILLED, THUMB_OUTLINE, PLAY_ICON, escapeHTML } from "./ui.js";
import { renderChrome } from "./chrome.js";
import {
  fetchComments, renderRatingSummary, renderComments, mountCommentWidget,
  fetchQuestions, renderQuestions, mountQuestionWidget
} from "./comments.js";

renderChrome();
initTrailerModal();
document.getElementById("trailerPlayIcon").innerHTML = PLAY_ICON;

// لینک ذخیره‌شده در m.trailerUrl می‌تواند youtube.com/watch?v=، youtu.be/،
// embed/ یا shorts/ باشد — همه را به یک آدرس embed قابل‌پخش تبدیل می‌کنیم تا
// تریلر همین‌جا توی سایت خودمان پخش شود، نه با رفتن به یوتیوب.
function getYouTubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    let videoId = null;
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    } else if (u.searchParams.get("v")) {
      videoId = u.searchParams.get("v");
    } else {
      const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
      const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
      videoId = (embedMatch && embedMatch[1]) || (shortsMatch && shortsMatch[1]) || null;
    }
    if (!videoId) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  } catch {
    return null;
  }
}

function initTrailerModal() {
  const overlay = document.getElementById("trailerModalOverlay");
  const frame = document.getElementById("trailerModalFrame");
  const closeBtn = document.getElementById("trailerModalClose");
  const close = () => { overlay.classList.remove("open"); frame.innerHTML = ""; };
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
}

function openTrailerModal(embedUrl) {
  const overlay = document.getElementById("trailerModalOverlay");
  const frame = document.getElementById("trailerModalFrame");
  frame.innerHTML = `<iframe src="${embedUrl}" title="تریلر" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  overlay.classList.add("open");
}

const params = new URLSearchParams(location.search);
const id = params.get("id");

function setMeta(m) {
  document.title = `${m.title} | نیو مووی`;
  const desc = (m.synopsis || "").slice(0, 155);
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) { metaDesc = document.createElement("meta"); metaDesc.name = "description"; document.head.appendChild(metaDesc); }
  metaDesc.content = desc;

  const ogTags = { "og:title": m.title, "og:description": desc, "og:image": m.posterUrl || m.backdropUrl || "og-image.png", "og:type": "video.movie" };
  Object.entries(ogTags).forEach(([prop, content]) => {
    let tag = document.querySelector(`meta[property="${prop}"]`);
    if (!tag) { tag = document.createElement("meta"); tag.setAttribute("property", prop); document.head.appendChild(tag); }
    tag.setAttribute("content", content);
  });

  let twImg = document.querySelector('meta[name="twitter:image"]');
  if (twImg) twImg.setAttribute("content", m.posterUrl || m.backdropUrl || "og-image.png");

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
  canonical.href = location.href;

  // Firestore's realtime listeners can call render() several times as data
  // arrives, so reuse/replace the same tag instead of appending a new
  // <script type="application/ld+json"> on every update.
  let ld = document.getElementById("detailJsonLd");
  if (!ld) {
    ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = "detailJsonLd";
    document.head.appendChild(ld);
  }
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": m.type === "series" ? "TVSeries" : "Movie",
    name: m.title,
    description: m.synopsis || "",
    image: m.posterUrl || "",
    genre: m.genre || undefined
  });
}

function renderFavoriteBtn(m) {
  const btn = document.getElementById("favBtn");
  const sync = () => {
    const active = isFavorite(m.id);
    btn.innerHTML = active ? `${STAR_FILLED}<span>در علاقه‌مندی‌ها</span>` : `${STAR_OUTLINE}<span>افزودن به علاقه‌مندی‌ها</span>`;
    btn.classList.toggle("btn-primary", active);
    btn.classList.toggle("btn-ghost", !active);
  };
  sync();
  btn.onclick = () => { toggleFavorite(m.id); sync(); };
}

function renderLikeBtn(m) {
  const btn = document.getElementById("likeBtn");
  const iconEl = document.getElementById("likeIcon");
  const textEl = document.getElementById("likeText");
  const countEl = document.getElementById("likeCount");
  let count = Math.max(0, m.likesCount || 0);
  const sync = () => {
    const active = isLiked(m.id);
    btn.classList.toggle("liked", active);
    iconEl.innerHTML = active ? THUMB_FILLED : THUMB_OUTLINE;
    textEl.textContent = active ? "ناپسندیدن" : "پسندیدن";
    countEl.textContent = String(count);
  };
  sync();
  btn.onclick = async () => {
    const willLike = !isLiked(m.id);
    count = Math.max(0, count + (willLike ? 1 : -1)); // فوری، بدون انتظار برای پاسخ سرور
    sync();
    await toggleLike(m.id);
  };
}

function render(m, allMovies, categories) {
  document.getElementById("detailHero").hidden = false;
  document.querySelector(".detail-body").hidden = false;
  document.getElementById("detailErrorState").hidden = true;
  setMeta(m);

  const hero = document.getElementById("detailHero");
  const bg = m.backdropUrl || m.posterUrl || "";
  hero.classList.toggle("has-backdrop", Boolean(bg));
  const bgUrl = bg ? `url("${String(bg).replace(/"/g, '\\"')}")` : "";
  document.getElementById("detailHeroBg").style.backgroundImage = bgUrl;
  document.getElementById("detailHeroFg").style.backgroundImage = bgUrl;
  const posterEl = document.getElementById("detailPoster");
  const posterFrame = document.getElementById("detailPosterFrame");
  posterEl.hidden = !m.posterUrl;
  posterFrame.classList.toggle("poster-missing", !m.posterUrl);
  posterEl.onload = () => {
    posterEl.hidden = false;
    posterFrame.classList.remove("poster-missing");
  };
  posterEl.onerror = () => {
    posterEl.hidden = true;
    posterFrame.classList.add("poster-missing");
  };
  posterEl.src = m.posterUrl || "about:blank";
  posterEl.alt = m.title || "";
  document.getElementById("detailTitle").textContent = m.title || "";
  document.getElementById("detailBreadcrumb").textContent = m.title || "جزئیات عنوان";

  const catNames = (Array.isArray(m.categoryIds) ? m.categoryIds : [])
    .map(cid => categories.find(c => c.id === cid)?.name)
    .filter(Boolean);

  const tags = [];
  if (m.rating) tags.push({ html: `${STAR_FILLED}${escapeHTML(String(m.rating))}${m.votes ? ` (${escapeHTML(String(m.votes))} رأی)` : ""}`, isRating: true });
  if (m.year) tags.push({ html: escapeHTML(String(m.year)) });
  if (m.runtime) tags.push({ html: escapeHTML(`${m.runtime} دقیقه`) });
  document.getElementById("detailTags").innerHTML = tags.map(t => `<span class="${t.isRating ? "tag-rating" : ""}">${t.html}</span>`).join("");
  const genres = catNames.length
    ? catNames
    : (m.genre ? String(m.genre).split(/[،,]/).map(item => item.trim()).filter(Boolean) : []);
  document.getElementById("detailGenres").innerHTML = genres.length
    ? genres.map((name, index) => {
        const categoryId = Array.isArray(m.categoryIds) ? m.categoryIds[index] : "";
        const href = categoryId ? `movies.html?genre=${encodeURIComponent(categoryId)}` : "movies.html";
        return `<a href="${href}" class="genre-chip">${escapeHTML(name)}</a>`;
      }).join("")
    : `<span class="genre-empty">ژانر ثبت نشده</span>`;

  document.getElementById("detailSynopsis").textContent = m.synopsis || "";
  document.getElementById("detailLead").textContent = m.type === "series"
    ? "سریال · اطلاعات، امتیاز و جزئیات کامل"
    : "فیلم · اطلاعات، امتیاز و جزئیات کامل";

  const meta = [];
  if (m.originalTitle) meta.push(["عنوان اصلی", m.originalTitle]);
  if (m.country) meta.push(["کشور", m.country]);
  if (m.language) meta.push(["زبان", m.language]);
  if (m.director) meta.push(["کارگردان", m.director]);
  const metaBox = document.getElementById("metaGrid");
  metaBox.innerHTML = meta.map(([k, v]) => `<div class="meta-item"><span>${escapeHTML(k)}</span><strong>${escapeHTML(v)}</strong></div>`).join("");
  document.getElementById("metaSection").style.display = meta.length ? "" : "none";

  const castSection = document.getElementById("castSection");
  if (m.cast) {
    const names = m.cast.split(",").map(s => s.trim()).filter(Boolean);
    document.getElementById("castRow").innerHTML = names.map(n => `<span class="cast-chip">${escapeHTML(n)}</span>`).join("");
    castSection.style.display = "";
  } else {
    castSection.style.display = "none";
  }

  const trailerBtn = document.getElementById("trailerLink");
  if (m.trailerUrl) {
    const embedUrl = getYouTubeEmbedUrl(m.trailerUrl);
    trailerBtn.style.display = "inline-flex";
    trailerBtn.onclick = embedUrl
      ? () => openTrailerModal(embedUrl)
      : () => window.open(m.trailerUrl, "_blank", "noopener"); // لینک غیریوتیوبی/ناشناخته — باز کردن در تب جدید به‌جای پخش داخلی
  } else {
    trailerBtn.style.display = "none";
    trailerBtn.onclick = null;
  }

  const dlSection = document.getElementById("downloadSection");
  const links = Array.isArray(m.downloadLinks) ? m.downloadLinks.filter(l => l && l.url) : [];
  if (links.length) {
    document.getElementById("downloadList").innerHTML = links.map(l => `
      <a class="download-item" href="${escapeHTML(l.url)}" target="_blank" rel="noopener">
        <span class="download-info">
          <strong>${escapeHTML(l.label || "لینک دانلود")}</strong>
          ${l.size ? `<span>${escapeHTML(l.size)}</span>` : ""}
        </span>
        <span class="download-btn">دانلود</span>
      </a>
    `).join("");
  } else {
    document.getElementById("downloadList").innerHTML = `<p class="empty-note" style="padding:4px 0;text-align:right;">هنوز لینک دانلودی برای این عنوان ثبت نشده است.</p>`;
  }
  dlSection.style.display = "";

  document.getElementById("shareBtn").onclick = () => shareItem(m.title, location.href);
  document.getElementById("downloadJumpBtn").onclick = () => {
    document.getElementById("downloadSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  renderFavoriteBtn(m);
  renderLikeBtn(m);

  const similar = Array.isArray(m.categoryIds) && m.categoryIds.length
    ? allMovies.filter(x => x.id !== m.id && Array.isArray(x.categoryIds) && x.categoryIds.some(c => m.categoryIds.includes(c))).slice(0, 12)
    : (m.genre ? allMovies.filter(x => x.id !== m.id && x.genre === m.genre).slice(0, 12) : []);
  const similarSection = document.getElementById("similarSection");
  if (similar.length) {
    const withNames = similar.map(item => ({
      ...item,
      categoryNames: (Array.isArray(item.categoryIds) ? item.categoryIds : [])
        .map(cid => categories.find(c => c.id === cid)?.name).filter(Boolean)
    }));
    document.getElementById("similarGrid").innerHTML = withNames.map(movieCardHTML).join("");
    similarSection.style.display = "";
  } else {
    similarSection.style.display = "none";
  }
}

function showDetailError() {
  document.body.classList.remove("page-loading");
  document.getElementById("detailHero").hidden = true;
  document.querySelector(".detail-body").hidden = true;
  document.getElementById("detailErrorState").hidden = false;
}

function revealDetailPage() {
  document.body.classList.remove("page-loading");
}

async function loadCommentsSection(movieId) {
  try {
    const comments = await fetchComments(movieId);
    renderRatingSummary("ratingSummary", comments);
    renderComments("commentList", comments);
  } catch {
    document.getElementById("commentList").innerHTML = `<p class="error-note">خطا در بارگذاری نظرات.</p>`;
  }
}

async function loadQuestionsSection(movieId) {
  try {
    const questions = await fetchQuestions(movieId);
    renderQuestions("qnaList", questions);
  } catch {
    document.getElementById("qnaList").innerHTML = `<p class="error-note">خطا در بارگذاری سوالات.</p>`;
  }
}

function initReviews(movieId) {
  loadCommentsSection(movieId);
  loadQuestionsSection(movieId);

  mountCommentWidget("commentFormArea", movieId, () => loadCommentsSection(movieId));
  mountQuestionWidget("questionFormArea", movieId, () => loadQuestionsSection(movieId));
}

async function init() {
  if (!id) {
    showDetailError();
    return;
  }

  document.getElementById("similarGrid").innerHTML = skeletonCards(6);

  const state = { movies: null, categories: null };
  let reviewsStarted = false;
  let notFoundShown = false;

  function tryRender() {
    const { movies, categories } = state;
    if (movies === null || categories === null) return;

    const m = movies.find(x => x.id === id);
    if (!m) {
      if (!notFoundShown) {
        showDetailError();
        notFoundShown = true;
      }
      return;
    }
    notFoundShown = false;

    render(m, movies, categories);
    revealDetailPage();
    if (!reviewsStarted) {
      reviewsStarted = true;
      initReviews(m.id);
    }
  }

  function showError() {
    showDetailError();
  }

  watchMovies(movies => { state.movies = movies; tryRender(); }, showError);
  watchCategories(
    categories => { state.categories = categories; tryRender(); },
    () => { state.categories = []; tryRender(); }
  );
}

init();
