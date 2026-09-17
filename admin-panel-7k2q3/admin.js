import { db, auth } from "../js/firebase-init.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showToast, setButtonLoading } from "../js/ui.js";
import { cacheClear } from "../js/cache.js";

const onLoginPage = document.getElementById("loginBtn") !== null;
const onDashboard = document.getElementById("adminMovieList") !== null;

onAuthStateChanged(auth, (user) => {
  if (onLoginPage && user) location.href = "dashboard.html";
  if (onDashboard && !user) location.href = "index.html";
  if (onDashboard && user) initDashboard();
});

if (onLoginPage) {
  document.getElementById("loginBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    const errBox = document.getElementById("loginError");
    errBox.textContent = "";
    setButtonLoading(btn, true, "در حال ورود...");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will redirect on success; button stays disabled meanwhile.
    } catch (e) {
      errBox.textContent = "ایمیل یا رمز عبور اشتباه است.";
      setButtonLoading(btn, false);
    }
  });
}

if (onDashboard) {
  document.getElementById("logoutBtn").addEventListener("click", async (e) => {
    setButtonLoading(e.currentTarget, true);
    try { await signOut(auth); } catch { setButtonLoading(e.currentTarget, false); }
  });
}

// ---------- small shared helpers ----------

function confirmModal(message) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn-small danger" id="modalYes">حذف کن</button>
          <button class="btn-small" id="modalNo">انصراف</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#modalYes").onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector("#modalNo").onclick = () => { overlay.remove(); resolve(false); };
  });
}

function setStatus(elId, msg, ok = true) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.className = `status-msg ${ok ? "ok" : "err"}`;
  setTimeout(() => (el.textContent = ""), 3000);
}

let editingMovieId = null;
let editingHeroId = null;
let contentFilter = "all";
let allMoviesCache = [];
let allGenresCache = [];

async function initDashboard() {
  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-view").forEach(v => v.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`view-${tab.dataset.tab}`).classList.add("active");
    });
  });

  document.querySelectorAll("#view-content .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#view-content .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      contentFilter = chip.dataset.filter;
      renderMovieList();
    });
  });

  await loadGenres();
  await loadMovies();
  await loadHeroes();
  await loadFeedback();
  await loadVisitors();
  await loadBlockedIps();
  updateStats();

  document.getElementById("saveMovieBtn").addEventListener("click", saveMovie);
  document.getElementById("cancelEditBtn").addEventListener("click", resetMovieForm);
  document.getElementById("saveHeroBtn").addEventListener("click", saveHero);
  document.getElementById("cancelHeroEditBtn").addEventListener("click", resetHeroForm);
  document.getElementById("saveGenreBtn").addEventListener("click", saveGenre);
}

function updateStats() {
  document.getElementById("statMovies").textContent = allMoviesCache.filter(m => m.type !== "series").length;
  document.getElementById("statSeries").textContent = allMoviesCache.filter(m => m.type === "series").length;
  document.getElementById("statHeroes").textContent = document.querySelectorAll("#adminHeroList .admin-list-item").length;
  document.getElementById("statGenres").textContent = allGenresCache.length;
}

// ---------- Genres ----------

async function loadGenres() {
  const snap = await getDocs(collection(db, "genres"));
  allGenresCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const datalist = document.getElementById("genreOptions");
  datalist.innerHTML = allGenresCache.map(g => `<option value="${g.name}">`).join("");

  const listBox = document.getElementById("adminGenreList");
  listBox.innerHTML = allGenresCache.length
    ? allGenresCache.map(g => `
      <div class="admin-list-item" data-id="${g.id}">
        <div class="info"><strong>${g.name}</strong></div>
        <div class="actions"><button class="btn-small danger delete-genre-btn">حذف</button></div>
      </div>`).join("")
    : `<p class="empty-note">هنوز ژانری اضافه نشده.</p>`;

  listBox.querySelectorAll(".delete-genre-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      if (await confirmModal("این ژانر حذف شود؟")) {
        setButtonLoading(btn, true);
        try {
          await deleteDoc(doc(db, "genres", id));
          showToast("ژانر حذف شد");
          await loadGenres();
        } catch {
          showToast("خطا در حذف", "err");
          setButtonLoading(btn, false);
        }
      }
    });
  });
}

async function saveGenre() {
  const name = document.getElementById("genreName").value.trim();
  if (!name) { setStatus("genreStatus", "نام ژانر را وارد کن.", false); return; }
  const btn = document.getElementById("saveGenreBtn");
  setButtonLoading(btn, true);
  try {
    await addDoc(collection(db, "genres"), { name });
    document.getElementById("genreName").value = "";
    setStatus("genreStatus", "اضافه شد.");
    await loadGenres();
  } catch {
    setStatus("genreStatus", "خطا در ذخیره‌سازی.", false);
  } finally {
    setButtonLoading(btn, false);
  }
}

// ---------- Movies / Series ----------

async function loadMovies() {
  const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  allMoviesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  populateHeroMovieSelect();
  renderMovieList();
  updateStats();
}

function renderMovieList() {
  const listBox = document.getElementById("adminMovieList");
  const list = contentFilter === "all" ? allMoviesCache : allMoviesCache.filter(m => (m.type || "movie") === contentFilter);

  if (!list.length) {
    listBox.innerHTML = `<p class="empty-note">چیزی پیدا نشد.</p>`;
    return;
  }

  listBox.innerHTML = list.map(m => `
    <div class="admin-list-item" data-id="${m.id}">
      <img src="${m.posterUrl || ""}" alt="">
      <div class="info">
        <strong>${m.title}</strong>
        <span>${m.type === "series" ? "سریال" : "فیلم"}${m.year ? " · " + m.year : ""}${m.genre ? " · " + m.genre : ""}</span>
      </div>
      <span class="toggle-badge ${m.active !== false ? "on" : ""}">${m.active !== false ? "فعال" : "غیرفعال"}</span>
      <div class="actions">
        <button class="btn-small edit-btn">ویرایش</button>
        <button class="btn-small danger delete-btn">حذف</button>
      </div>
    </div>
  `).join("");

  listBox.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      fillMovieForm(allMoviesCache.find(x => x.id === id));
    });
  });
  listBox.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      if (await confirmModal("این مورد برای همیشه حذف شود؟")) {
        setButtonLoading(btn, true);
        try {
          await deleteDoc(doc(db, "movies", id));
          cacheClear("movies_all");
          showToast("حذف شد");
          await loadMovies();
        } catch {
          showToast("خطا در حذف", "err");
          setButtonLoading(btn, false);
        }
      }
    });
  });
}

// ---------- Download links (repeatable rows) ----------

function dlRowHTML(l = {}) {
  return `
    <div class="dl-row" data-row>
      <input type="text" class="dl-label" placeholder="کیفیت (مثلاً 1080p)" value="${l.label || ""}">
      <input type="text" class="dl-size" placeholder="حجم (مثلاً 1.8GB)" value="${l.size || ""}">
      <input type="text" class="dl-url" placeholder="لینک دانلود" value="${l.url || ""}">
      <button type="button" class="btn-small danger remove-dl-row">حذف</button>
    </div>`;
}

function addDlRow(data) {
  const box = document.getElementById("downloadLinksBox");
  box.insertAdjacentHTML("beforeend", dlRowHTML(data));
  const row = box.lastElementChild;
  row.querySelector(".remove-dl-row").addEventListener("click", () => row.remove());
}

function setDlRows(links) {
  document.getElementById("downloadLinksBox").innerHTML = "";
  (links || []).forEach(l => addDlRow(l));
}

function collectDlRows() {
  return [...document.querySelectorAll("#downloadLinksBox [data-row]")]
    .map(row => ({
      label: row.querySelector(".dl-label").value.trim(),
      size: row.querySelector(".dl-size").value.trim(),
      url: row.querySelector(".dl-url").value.trim(),
    }))
    .filter(l => l.url);
}

document.getElementById("addDlRowBtn")?.addEventListener("click", () => addDlRow());

function fillMovieForm(m) {
  editingMovieId = m.id;
  document.getElementById("movieFormTitle").textContent = `ویرایش: ${m.title}`;
  document.getElementById("mType").value = m.type || "movie";
  document.getElementById("mActive").value = String(m.active !== false);
  document.getElementById("mTitle").value = m.title || "";
  document.getElementById("mOriginalTitle").value = m.originalTitle || "";
  document.getElementById("mGenre").value = m.genre || "";
  document.getElementById("mYear").value = m.year || "";
  document.getElementById("mRuntime").value = m.runtime || "";
  document.getElementById("mRating").value = m.rating || "";
  document.getElementById("mVotes").value = m.votes || "";
  document.getElementById("mPopularity").value = m.popularity || "";
  document.getElementById("mCountry").value = m.country || "";
  document.getElementById("mLanguage").value = m.language || "";
  document.getElementById("mDirector").value = m.director || "";
  document.getElementById("mCast").value = m.cast || "";
  document.getElementById("mSynopsis").value = m.synopsis || "";
  document.getElementById("mPoster").value = m.posterUrl || "";
  document.getElementById("mBackdrop").value = m.backdropUrl || "";
  document.getElementById("mTrailer").value = m.trailerUrl || "";
  setDlRows(m.downloadLinks);
  document.getElementById("cancelEditBtn").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetMovieForm() {
  editingMovieId = null;
  document.getElementById("movieFormTitle").textContent = "افزودن فیلم/سریال جدید";
  ["mOriginalTitle","mTitle","mGenre","mYear","mRuntime","mRating","mVotes","mPopularity",
   "mCountry","mLanguage","mDirector","mCast","mSynopsis","mPoster","mBackdrop","mTrailer"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("mType").value = "movie";
  document.getElementById("mActive").value = "true";
  setDlRows([]);
  document.getElementById("cancelEditBtn").style.display = "none";
}

function toNumOrNull(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

async function saveMovie() {
  const title = document.getElementById("mTitle").value.trim();
  if (!title) { setStatus("movieStatus", "عنوان الزامی است.", false); return; }
  const btn = document.getElementById("saveMovieBtn");
  setButtonLoading(btn, true, "در حال ذخیره...");

  const data = {
    type: document.getElementById("mType").value,
    active: document.getElementById("mActive").value === "true",
    title,
    originalTitle: document.getElementById("mOriginalTitle").value.trim(),
    genre: document.getElementById("mGenre").value.trim(),
    year: document.getElementById("mYear").value.trim(),
    runtime: toNumOrNull(document.getElementById("mRuntime").value),
    rating: toNumOrNull(document.getElementById("mRating").value),
    votes: toNumOrNull(document.getElementById("mVotes").value),
    popularity: toNumOrNull(document.getElementById("mPopularity").value),
    country: document.getElementById("mCountry").value.trim(),
    language: document.getElementById("mLanguage").value.trim(),
    director: document.getElementById("mDirector").value.trim(),
    cast: document.getElementById("mCast").value.trim(),
    synopsis: document.getElementById("mSynopsis").value.trim(),
    posterUrl: document.getElementById("mPoster").value.trim(),
    backdropUrl: document.getElementById("mBackdrop").value.trim(),
    trailerUrl: document.getElementById("mTrailer").value.trim(),
    downloadLinks: collectDlRows(),
  };

  try {
    if (editingMovieId) {
      await updateDoc(doc(db, "movies", editingMovieId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "movies"), data);
    }
    cacheClear("movies_all");
    setStatus("movieStatus", "ذخیره شد.");
    showToast("با موفقیت ذخیره شد");
    resetMovieForm();
    await loadMovies();
  } catch (e) {
    setStatus("movieStatus", "خطا در ذخیره‌سازی.", false);
  } finally {
    setButtonLoading(btn, false);
  }
}

// ---------- Heroes ----------

async function loadHeroes() {
  const snap = await getDocs(collection(db, "heroes"));
  const heroes = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));

  const listBox = document.getElementById("adminHeroList");
  listBox.innerHTML = heroes.length ? heroes.map(h => `
    <div class="admin-list-item" data-id="${h.id}">
      <img src="${h.backdropUrl || ""}" alt="">
      <div class="info">
        <strong>${h.title || "(بدون عنوان)"}</strong>
        <span>ترتیب: ${h.order ?? 0}</span>
      </div>
      <span class="toggle-badge ${h.active !== false ? "on" : ""}">${h.active !== false ? "فعال" : "غیرفعال"}</span>
      <div class="actions">
        <button class="btn-small edit-hero-btn">ویرایش</button>
        <button class="btn-small danger delete-hero-btn">حذف</button>
      </div>
    </div>
  `).join("") : `<p class="empty-note">هنوز هیرویی اضافه نشده.</p>`;

  listBox.querySelectorAll(".edit-hero-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      fillHeroForm(heroes.find(h => h.id === id));
    });
  });
  listBox.querySelectorAll(".delete-hero-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      if (await confirmModal("این هیرو حذف شود؟")) {
        setButtonLoading(btn, true);
        try {
          await deleteDoc(doc(db, "heroes", id));
          cacheClear("heroes_all");
          showToast("حذف شد");
          await loadHeroes();
          updateStats();
        } catch {
          showToast("خطا در حذف", "err");
          setButtonLoading(btn, false);
        }
      }
    });
  });
  updateStats();
}

function populateHeroMovieSelect() {
  const select = document.getElementById("heroMovieSelect");
  const current = select.value;
  select.innerHTML = `<option value="">— هیچکدام —</option>` +
    allMoviesCache.map(m => `<option value="${m.id}">${m.title}</option>`).join("");
  select.value = current;
}

function fillHeroForm(h) {
  editingHeroId = h.id;
  document.getElementById("heroFormTitle").textContent = `ویرایش هیرو: ${h.title || ""}`;
  document.getElementById("heroKicker").value = h.kicker || "";
  document.getElementById("heroMovieSelect").value = h.movieId || "";
  document.getElementById("heroTitle").value = h.title || "";
  document.getElementById("heroDesc").value = h.description || "";
  document.getElementById("heroYear").value = h.year || "";
  document.getElementById("heroGenre").value = h.genre || "";
  document.getElementById("heroOrder").value = h.order ?? 0;
  document.getElementById("heroBackdrop").value = h.backdropUrl || "";
  document.getElementById("heroActive").value = String(h.active !== false);
  document.getElementById("cancelHeroEditBtn").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetHeroForm() {
  editingHeroId = null;
  document.getElementById("heroFormTitle").textContent = "افزودن هیرو جدید";
  ["heroKicker","heroTitle","heroDesc","heroYear","heroGenre","heroBackdrop"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("heroMovieSelect").value = "";
  document.getElementById("heroOrder").value = "0";
  document.getElementById("heroActive").value = "true";
  document.getElementById("cancelHeroEditBtn").style.display = "none";
}

async function saveHero() {
  const title = document.getElementById("heroTitle").value.trim();
  if (!title) { setStatus("heroStatus", "عنوان هیرو الزامی است.", false); return; }
  const btn = document.getElementById("saveHeroBtn");
  setButtonLoading(btn, true, "در حال ذخیره...");

  const data = {
    kicker: document.getElementById("heroKicker").value.trim(),
    title,
    description: document.getElementById("heroDesc").value.trim(),
    year: document.getElementById("heroYear").value.trim(),
    genre: document.getElementById("heroGenre").value.trim(),
    order: toNumOrNull(document.getElementById("heroOrder").value) ?? 0,
    backdropUrl: document.getElementById("heroBackdrop").value.trim(),
    movieId: document.getElementById("heroMovieSelect").value || null,
    active: document.getElementById("heroActive").value === "true",
  };

  try {
    if (editingHeroId) {
      await updateDoc(doc(db, "heroes", editingHeroId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "heroes"), data);
    }
    cacheClear("heroes_all");
    setStatus("heroStatus", "ذخیره شد.");
    showToast("هیرو ذخیره شد");
    resetHeroForm();
    await loadHeroes();
  } catch (e) {
    setStatus("heroStatus", "خطا در ذخیره‌سازی.", false);
  } finally {
    setButtonLoading(btn, false);
  }
}

// ---------- Feedback: comments moderation + Q&A answers ----------

function movieTitleFor(movieId) {
  const m = allMoviesCache.find(x => x.id === movieId);
  return m ? m.title : "(فیلم حذف‌شده)";
}

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

async function loadFeedback() {
  const [commentsSnap, questionsSnap] = await Promise.all([
    getDocs(collection(db, "comments")),
    getDocs(collection(db, "questions")),
  ]);
  const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const questions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  renderAdminComments(comments);
  renderAdminQuestions(questions);
}

function renderAdminComments(comments) {
  const box = document.getElementById("adminCommentsList");
  if (!comments.length) { box.innerHTML = `<p class="empty-note">هنوز نظری ثبت نشده.</p>`; return; }
  box.innerHTML = comments.map(c => `
    <div class="admin-feedback-item" data-id="${c.id}">
      <div class="fb-meta">
        <strong>${escapeHTML(c.name) || "بدون نام"}</strong>
        <span>امتیاز: ${c.rating || "—"}/۵</span>
        <span>فیلم: ${escapeHTML(movieTitleFor(c.movieId))}</span>
      </div>
      <p>${escapeHTML(c.text)}</p>
      <button class="btn-small danger delete-comment-btn">حذف نظر</button>
    </div>
  `).join("");

  box.querySelectorAll(".delete-comment-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest("[data-id]").dataset.id;
      if (await confirmModal("این نظر برای همیشه حذف شود؟")) {
        setButtonLoading(btn, true);
        try {
          await deleteDoc(doc(db, "comments", id));
          showToast("نظر حذف شد");
          await loadFeedback();
        } catch {
          showToast("خطا در حذف", "err");
          setButtonLoading(btn, false);
        }
      }
    });
  });
}

function renderAdminQuestions(questions) {
  const box = document.getElementById("adminQnaList");
  if (!questions.length) { box.innerHTML = `<p class="empty-note">هنوز سوالی پرسیده نشده.</p>`; return; }
  box.innerHTML = questions.map(q => `
    <div class="admin-feedback-item" data-id="${q.id}">
      <div class="fb-meta">
        <strong>${escapeHTML(q.name) || "بدون نام"}</strong>
        <span>فیلم: ${escapeHTML(movieTitleFor(q.movieId))}</span>
        ${q.answered ? `<span>پاسخ‌داده‌شده</span>` : `<span>در انتظار پاسخ</span>`}
      </div>
      <p>${escapeHTML(q.question)}</p>
      <textarea class="answer-input" placeholder="پاسخ خودت رو بنویس...">${escapeHTML(q.answer)}</textarea>
      <button class="btn-small answer-btn">ثبت پاسخ</button>
      <button class="btn-small danger delete-question-btn">حذف سوال</button>
    </div>
  `).join("");

  box.querySelectorAll(".answer-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const item = btn.closest("[data-id]");
      const id = item.dataset.id;
      const answer = item.querySelector(".answer-input").value.trim();
      if (!answer) { showToast("متن پاسخ خالی است", "err"); return; }
      setButtonLoading(btn, true);
      try {
        await updateDoc(doc(db, "questions", id), { answer, answered: true, answeredAt: serverTimestamp() });
        showToast("پاسخ ثبت شد");
        await loadFeedback();
      } catch {
        showToast("خطا در ثبت پاسخ", "err");
        setButtonLoading(btn, false);
      }
    });
  });

  box.querySelectorAll(".delete-question-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest("[data-id]").dataset.id;
      if (await confirmModal("این سوال برای همیشه حذف شود؟")) {
        setButtonLoading(btn, true);
        try {
          await deleteDoc(doc(db, "questions", id));
          showToast("سوال حذف شد");
          await loadFeedback();
        } catch {
          showToast("خطا در حذف", "err");
          setButtonLoading(btn, false);
        }
      }
    });
  });
}

// ---------- Visitors (Google-login accounts) ----------

async function loadVisitors() {
  const snap = await getDocs(collection(db, "visitors"));
  const visitors = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.lastLoginAt?.seconds || 0) - (a.lastLoginAt?.seconds || 0));
  renderVisitors(visitors);
}

function renderVisitors(visitors) {
  const box = document.getElementById("adminVisitorsList");
  if (!visitors.length) { box.innerHTML = `<p class="empty-note">هنوز کسی با گوگل وارد نشده.</p>`; return; }
  box.innerHTML = visitors.map(v => `
    <div class="visitor-row" data-id="${v.id}">
      ${v.photoURL ? `<img class="visitor-avatar" src="${v.photoURL}" referrerpolicy="no-referrer" alt="">` : `<div class="visitor-avatar"></div>`}
      <div class="visitor-info">
        <strong>${escapeHTML(v.firstName)} ${escapeHTML(v.lastName)}</strong>
        <span>${escapeHTML(v.email)}</span>
        <span>آخرین IP گزارش‌شده: ${escapeHTML(v.ip) || "—"}</span>
      </div>
      <span class="visitor-badge ${v.blocked ? "blocked" : ""}">${v.blocked ? "مسدود" : "فعال"}</span>
      <button class="btn-small ${v.blocked ? "" : "danger"} toggle-block-btn">${v.blocked ? "رفع مسدودی" : "مسدود کردن"}</button>
    </div>
  `).join("");

  box.querySelectorAll(".toggle-block-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("[data-id]");
      const id = row.dataset.id;
      const v = visitors.find(x => x.id === id);
      const msg = v.blocked ? "مسدودیت این حساب برداشته شود؟" : "این حساب مسدود شود؟ دیگر نمی‌تواند نظر/سوال ثبت کند.";
      if (await confirmModal(msg)) {
        setButtonLoading(btn, true);
        try {
          await updateDoc(doc(db, "visitors", id), { blocked: !v.blocked });
          showToast(v.blocked ? "رفع مسدودی شد" : "حساب مسدود شد");
          await loadVisitors();
        } catch {
          showToast("خطا در به‌روزرسانی", "err");
          setButtonLoading(btn, false);
        }
      }
    });
  });
}

// ---------- Blocked IPs (best-effort, client-checked only) ----------

async function loadBlockedIps() {
  const snap = await getDocs(collection(db, "blockedIPs"));
  renderBlockedIps(snap.docs.map(d => d.id));
}

function renderBlockedIps(ips) {
  const box = document.getElementById("adminBlockedIpsList");
  box.innerHTML = ips.length
    ? ips.map(ip => `
      <div class="blocked-ip-row" data-ip="${ip}">
        <span>${escapeHTML(ip)}</span>
        <button class="btn-small danger remove-ip-btn">حذف</button>
      </div>`).join("")
    : `<p class="empty-note">لیستی وجود ندارد.</p>`;

  box.querySelectorAll(".remove-ip-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const ip = btn.closest("[data-ip]").dataset.ip;
      setButtonLoading(btn, true);
      try {
        await deleteDoc(doc(db, "blockedIPs", ip));
        showToast("از لیست حذف شد");
        await loadBlockedIps();
      } catch {
        showToast("خطا در حذف", "err");
        setButtonLoading(btn, false);
      }
    });
  });
}

document.getElementById("addBlockedIpBtn")?.addEventListener("click", async (e) => {
  const input = document.getElementById("newBlockedIp");
  const ip = input.value.trim();
  if (!ip) return;
  const btn = e.currentTarget;
  setButtonLoading(btn, true);
  try {
    await setDoc(doc(db, "blockedIPs", ip), { addedAt: serverTimestamp() });
    input.value = "";
    showToast("اضافه شد");
    await loadBlockedIps();
  } catch {
    showToast("خطا در ذخیره‌سازی", "err");
  } finally {
    setButtonLoading(btn, false);
  }
});
