import { db } from "./firebase-init.js";
import {
  collection, doc, getDocs, setDoc, deleteDoc, query, where, serverTimestamp,
  writeBatch, increment
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { currentVisitor, watchVisitor } from "./auth.js";

export const STAR_FILLED = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`;
export const STAR_OUTLINE = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`;
export const THUMB_OUTLINE = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
export const THUMB_FILLED = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
export const PLAY_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;

export function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

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

// Reuses the same .modal-overlay/.modal-box styling already shipped for the
// admin panel's delete confirmations, so no new CSS is needed.
export function confirmDialog(message, confirmLabel = "تایید", cancelLabel = "انصراف") {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <p>${escapeHTML(message)}</p>
        <div class="modal-actions">
          <button class="btn-small danger" id="confirmDialogYes">${escapeHTML(confirmLabel)}</button>
          <button class="btn-small" id="confirmDialogNo">${escapeHTML(cancelLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const finish = result => { overlay.remove(); resolve(result); };
    overlay.querySelector("#confirmDialogYes").onclick = () => finish(true);
    overlay.querySelector("#confirmDialogNo").onclick = () => finish(false);
    overlay.addEventListener("click", e => { if (e.target === overlay) finish(false); });
  });
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
  const nowFavorite = idx === -1;
  if (idx > -1) favs.splice(idx, 1);
  else favs.push(id);
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch {}

  // Local state updates instantly either way; for a logged-in visitor we also
  // mirror it to Firestore in the background so favorites follow them across devices.
  const user = currentVisitor();
  if (user) {
    const ref = doc(db, "favorites", `${user.uid}_${id}`);
    const op = nowFavorite
      ? setDoc(ref, { userId: user.uid, movieId: id, createdAt: serverTimestamp() })
      : deleteDoc(ref);
    op.catch(e => console.error("favorite sync failed", e));
  }
  return favs.includes(id);
}

// On login, merge whatever's already in the visitor's cloud favorites into
// this browser's local list, then push up any local-only favorites (e.g.
// ones added as a guest before signing in) so both sides end up in sync.
async function syncFavoritesFromCloud(user) {
  try {
    const snap = await getDocs(query(collection(db, "favorites"), where("userId", "==", user.uid)));
    const cloudIds = snap.docs.map(d => d.data().movieId);
    const local = getFavorites();
    const merged = Array.from(new Set([...local, ...cloudIds]));
    try { localStorage.setItem(FAV_KEY, JSON.stringify(merged)); } catch {}

    const missingInCloud = local.filter(id => !cloudIds.includes(id));
    await Promise.all(missingInCloud.map(id =>
      setDoc(doc(db, "favorites", `${user.uid}_${id}`), { userId: user.uid, movieId: id, createdAt: serverTimestamp() })
        .catch(e => console.error("favorite push failed", e))
    ));
  } catch (e) {
    console.error("favorites sync failed", e);
  }
}

let resolveFavoritesReady;
export const favoritesReady = new Promise(res => { resolveFavoritesReady = res; });

watchVisitor(async (user) => {
  if (user) await syncFavoritesFromCloud(user);
  resolveFavoritesReady();
});

export function shareItem(title, url) {
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast("لینک کپی شد"));
  }
}

// ---------- Likes ----------
// Same local-first pattern as favorites: instant local state for everyone,
// mirrored to Firestore for signed-in visitors. Unlike favorites, a
// logged-in visitor's like/unlike also atomically bumps movies/{id}.likesCount
// so "محبوب‌ترین‌ها" (popular) sections can be ranked by real likes.
const LIKE_KEY = "newmovie_likes";

export function getLikes() {
  try { return JSON.parse(localStorage.getItem(LIKE_KEY) || "[]"); }
  catch { return []; }
}

export function isLiked(id) {
  return getLikes().includes(id);
}

export async function toggleLike(id) {
  const likes = getLikes();
  const idx = likes.indexOf(id);
  const nowLiked = idx === -1;
  if (idx > -1) likes.splice(idx, 1);
  else likes.push(id);
  try { localStorage.setItem(LIKE_KEY, JSON.stringify(likes)); } catch {}

  const user = currentVisitor();
  if (user) {
    const likeRef = doc(db, "likes", `${user.uid}_${id}`);
    const movieRef = doc(db, "movies", id);
    try {
      const batch = writeBatch(db);
      if (nowLiked) {
        batch.set(likeRef, { userId: user.uid, movieId: id, createdAt: serverTimestamp() });
        batch.update(movieRef, { likesCount: increment(1) });
      } else {
        batch.delete(likeRef);
        batch.update(movieRef, { likesCount: increment(-1) });
      }
      await batch.commit();
    } catch (e) {
      console.error("like sync failed", e);
    }
  }
  return nowLiked;
}

async function syncLikesFromCloud(user) {
  try {
    const snap = await getDocs(query(collection(db, "likes"), where("userId", "==", user.uid)));
    const cloudIds = snap.docs.map(d => d.data().movieId);
    const local = getLikes();
    const merged = Array.from(new Set([...local, ...cloudIds]));
    try { localStorage.setItem(LIKE_KEY, JSON.stringify(merged)); } catch {}

    // Local-only likes made as a guest, before this login, never bumped the
    // shared counter yet — push those up now that we have a uid to attach them to.
    const missingInCloud = local.filter(id => !cloudIds.includes(id));
    await Promise.all(missingInCloud.map(async id => {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, "likes", `${user.uid}_${id}`), { userId: user.uid, movieId: id, createdAt: serverTimestamp() });
        batch.update(doc(db, "movies", id), { likesCount: increment(1) });
        await batch.commit();
      } catch (e) { console.error("like push failed", e); }
    }));
  } catch (e) {
    console.error("likes sync failed", e);
  }
}

watchVisitor(async (user) => {
  if (user) await syncLikesFromCloud(user);
});


const NEW_BADGE_DAYS = 3;

export function movieCardHTML(m) {
  const typeLabel = m.type === "series" ? "سریال" : "فیلم";
  const title = escapeHTML(m.title);
  const posterUrl = escapeHTML(m.posterUrl || "");
  const posterClass = posterUrl ? "card-poster" : "card-poster poster-missing";
  const categoryNames = Array.isArray(m.categoryNames) ? m.categoryNames.filter(Boolean) : [];
  const metaLabel = categoryNames.length ? categoryNames.join("، ") : (m.genre || "");
  const createdSeconds = m.createdAt?.seconds;
  const isNew = createdSeconds && (Date.now() / 1000 - createdSeconds) < NEW_BADGE_DAYS * 86400;
  return `
    <a class="card" href="movie.html?id=${m.id}">
      <div class="${posterClass}">
        ${posterUrl ? `<img class="card-poster-img" src="${posterUrl}" alt="${title}" loading="lazy" decoding="async" onerror="this.hidden=true;this.parentElement.classList.add('poster-missing')">` : ""}
        ${m.rating ? `<span class="card-rating">${STAR_FILLED}${m.rating}</span>` : ""}
        <span class="card-type-badge">${typeLabel}</span>
        ${isNew ? `<span class="card-new-badge">جدید</span>` : ""}
      </div>
      <div class="card-body">
        <p class="card-title">${title}</p>
        <p class="card-meta">${escapeHTML(m.year || "")}${metaLabel ? " · " + escapeHTML(metaLabel) : ""}</p>
      </div>
    </a>
  `;
}

// حالت خالی یکدست برای همه‌ی جاهایی که یک گرید کامل چیزی برای نشان‌دادن ندارد
// (فیلتر بی‌نتیجه، علاقه‌مندی‌های خالی و...) — به‌جای یک خط متن ساده.
export function emptyStateHTML(title, subtitle = "") {
  return `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 8v13H3V8"/>
        <path d="M1 3h22v5H1z"/>
        <path d="M10 12h4"/>
      </svg>
      <p class="empty-state-title">${escapeHTML(title)}</p>
      ${subtitle ? `<p class="empty-state-sub">${escapeHTML(subtitle)}</p>` : ""}
    </div>`;
}
