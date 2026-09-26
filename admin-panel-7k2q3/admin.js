import { db, auth, app } from "../js/firebase-init.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, query, collectionGroup, getCountFromServer, where, limit, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getFunctions, httpsCallable
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";
import { showToast, setButtonLoading } from "../js/ui.js";

const onLoginPage = document.getElementById("loginBtn") !== null;
const onDashboard = document.getElementById("adminMovieList") !== null;

// Real gate: being logged in only proves *someone's* Firebase account, not
// that they're an admin — any visitor who signed up on login.html is a
// logged-in user too. Admin status is decided solely by the existence of
// admins/{uid}, checked fresh every time (never cached in the client).
async function isAdminUser(uid) {
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch {
    return false; // permission-denied or offline → treat as not-admin, fail closed
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (onDashboard) location.href = "index.html";
    return;
  }

  const admin = await isAdminUser(user.uid);
  if (!admin) {
    await signOut(auth);
    if (onLoginPage) {
      const errBox = document.getElementById("loginError");
      if (errBox) errBox.textContent = "شما دسترسی ادمین ندارید.";
    }
    if (onDashboard) location.href = "index.html";
    return;
  }

  if (onLoginPage) location.href = "dashboard.html";
  if (onDashboard) initDashboard();
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
      // onAuthStateChanged verifies admin status and redirects (or signs back out).
    } catch (e) {
      errBox.textContent = "ایمیل یا رمز عبور اشتباه است.";
      setButtonLoading(btn, false);
    }
  });
}

if (onDashboard) {
  document.getElementById("logoutBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!(await confirmModal("مطمئنی می‌خوای از پنل مدیریت خارج بشی؟", "بله، خروج", "انصراف"))) return;
    setButtonLoading(btn, true);
    try { await signOut(auth); } catch { setButtonLoading(btn, false); }
  });
}

// ---------- small shared helpers ----------

function confirmModal(message, confirmLabel = "حذف کن", cancelLabel = "انصراف") {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn-small danger" id="modalYes">${confirmLabel}</button>
          <button class="btn-small" id="modalNo">${cancelLabel}</button>
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
let editingGenreId = null;
let editingActorId = null;
let contentFilter = "all";
let allMoviesCache = [];
let allGenresCache = [];
let allActorsCache = [];

async function initDashboard() {
  // Second, independent check (defense in depth against any race between
  // onAuthStateChanged firing and this function running) — never trust a
  // single call site for something this sensitive.
  const user = auth.currentUser;
  if (!user || !(await isAdminUser(user.uid))) {
    await signOut(auth);
    location.href = "index.html";
    return;
  }

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

  const loaders = [
    ["ژانرها", loadGenres], ["بازیگران", loadActors], ["فیلم‌ها", loadMovies], ["هیروها", loadHeroes],
    ["نظرات/سوالات", loadFeedback], ["بازدیدکنندگان", loadVisitors], ["IPهای مسدود", loadBlockedIps],
    ["تنظیمات سایت", loadSiteSettings], ["آمار و نمودارها", loadAnalytics],
  ];
  for (const [label, fn] of loaders) {
    try {
      await fn();
    } catch (e) {
      console.error(`خطا در بارگذاری ${label}:`, e);
      showToast(`خطا در بارگذاری «${label}» — کنسول مرورگر رو برای جزئیات ببین`, "err");
    }
  }
  updateStats();

  document.getElementById("saveMovieBtn").addEventListener("click", saveMovie);
  document.getElementById("cancelEditBtn").addEventListener("click", resetMovieForm);
  document.getElementById("saveHeroBtn").addEventListener("click", saveHero);
  document.getElementById("cancelHeroEditBtn").addEventListener("click", resetHeroForm);
  document.getElementById("saveGenreBtn").addEventListener("click", saveGenre);
  document.getElementById("cancelGenreEditBtn").addEventListener("click", resetGenreForm);
  document.getElementById("saveActorBtn").addEventListener("click", saveActor);
  document.getElementById("cancelActorEditBtn").addEventListener("click", resetActorForm);
  document.getElementById("mCastSearch").addEventListener("input", () => renderCastPicker(getSelectedCastIds()));
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSiteSettings);
  document.getElementById("notifSendBtn").addEventListener("click", sendNotificationToAllUsers);
  refreshTokenCount();
  initFocalPicker();
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
  renderCategoryPicker();

  const listBox = document.getElementById("adminGenreList");
  listBox.innerHTML = allGenresCache.length
    ? allGenresCache.map(g => `
      <div class="admin-list-item" data-id="${g.id}">
        <div class="info"><strong>${g.name}</strong><span>شناسه: ${g.id}</span></div>
        <div class="actions"><button class="btn-small edit-genre-btn">ویرایش</button><button class="btn-small danger delete-genre-btn">حذف</button></div>
      </div>`).join("")
    : `<p class="empty-note">هنوز دسته‌بندی‌ای اضافه نشده.</p>`;

  listBox.querySelectorAll(".delete-genre-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      if (await confirmModal("این دسته‌بندی حذف شود؟ (فیلم‌هایی که بهش اختصاص دارن حذف نمی‌شن، فقط دیگه تو لیست انتخاب جدید نیست)")) {
        setButtonLoading(btn, true);
        try {
          await deleteDoc(doc(db, "genres", id));
          showToast("دسته‌بندی حذف شد");
          await loadGenres();
        } catch {
          showToast("خطا در حذف", "err");
          setButtonLoading(btn, false);
        }
      }
    });
  });
  listBox.querySelectorAll(".edit-genre-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      const genre = allGenresCache.find(item => item.id === id);
      if (!genre) return;
      editingGenreId = genre.id;
      document.getElementById("genreName").value = genre.name || "";
      document.getElementById("saveGenreBtn").textContent = "ذخیره تغییرات";
      document.getElementById("cancelGenreEditBtn").style.display = "inline-flex";
      document.getElementById("genreName").focus();
    });
  });
}

// Renders the checkbox chips used to assign one-or-more categories to a
// movie/series, preserving whatever is currently checked when the category
// list refreshes (e.g. after adding a new one) so mid-edit selections survive.
function renderCategoryPicker() {
  const box = document.getElementById("mCategoryPicker");
  const previouslyChecked = new Set(
    [...box.querySelectorAll('input[type="checkbox"]:checked')].map(el => el.value)
  );
  box.innerHTML = allGenresCache.length
    ? allGenresCache.map(g => `
      <label class="chip category-chip">
        <input type="checkbox" value="${g.id}" ${previouslyChecked.has(g.id) ? "checked" : ""} style="display:none;">
        ${g.name}
      </label>`).join("")
    : `<p class="empty-note" style="padding:0;">اول از تب «دسته‌بندی‌ها» چندتا دسته‌بندی بساز.</p>`;

  box.querySelectorAll(".category-chip").forEach(chip => {
    const input = chip.querySelector("input");
    chip.classList.toggle("active", input.checked);
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      input.checked = !input.checked;
      chip.classList.toggle("active", input.checked);
    });
  });
}

function getSelectedCategoryIds() {
  return [...document.querySelectorAll('#mCategoryPicker input[type="checkbox"]:checked')].map(el => el.value);
}

function setSelectedCategoryIds(ids) {
  const set = new Set(ids || []);
  document.querySelectorAll('#mCategoryPicker input[type="checkbox"]').forEach(input => {
    input.checked = set.has(input.value);
    input.closest(".category-chip")?.classList.toggle("active", input.checked);
  });
}

async function saveGenre() {
  const name = document.getElementById("genreName").value.trim();
  if (!name) { setStatus("genreStatus", "نام دسته‌بندی را وارد کن.", false); return; }
  const normalized = name.replace(/\s+/g, " ").toLocaleLowerCase("fa");
  const duplicate = allGenresCache.some(item =>
    item.id !== editingGenreId && String(item.name || "").replace(/\s+/g, " ").toLocaleLowerCase("fa") === normalized
  );
  if (duplicate) { setStatus("genreStatus", "این ژانر قبلاً وجود دارد.", false); return; }
  const btn = document.getElementById("saveGenreBtn");
  setButtonLoading(btn, true);
  try {
    if (editingGenreId) {
      await updateDoc(doc(db, "genres", editingGenreId), { name });
      setStatus("genreStatus", "دسته‌بندی ویرایش شد.");
    } else {
      await addDoc(collection(db, "genres"), { name });
      setStatus("genreStatus", "دسته‌بندی اضافه شد.");
    }
    resetGenreForm();
    await loadGenres();
  } catch {
    setStatus("genreStatus", "خطا در ذخیره‌سازی.", false);
  } finally {
    setButtonLoading(btn, false);
  }
}

function resetGenreForm() {
  editingGenreId = null;
  const input = document.getElementById("genreName");
  const button = document.getElementById("saveGenreBtn");
  if (input) input.value = "";
  if (button) button.textContent = "افزودن";
  const cancel = document.getElementById("cancelGenreEditBtn");
  if (cancel) cancel.style.display = "none";
}

// ---------- Actors ----------
// یک مجموعه‌ی جدا (actors) که هم توی فرم فیلم برای انتخاب کست استفاده می‌شه، هم
// توی صفحه‌ی اصلی سایت و صفحه‌ی اختصاصی هر بازیگر (actor.html).

async function loadActors() {
  const snap = await getDocs(collection(db, "actors"));
  allActorsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fa"));
  renderCastPicker(getSelectedCastIds());

  const listBox = document.getElementById("adminActorList");
  listBox.innerHTML = allActorsCache.length
    ? allActorsCache.map(a => `
      <div class="admin-list-item" data-id="${a.id}">
        <img class="admin-actor-thumb" src="${a.photoUrl || ""}" alt="" onerror="this.style.visibility='hidden'">
        <div class="info"><strong>${a.name || "(بدون نام)"}</strong>${a.featured ? ` <span class="badge-featured">ویژه · صفحه اصلی</span>` : ""}</div>
        <div class="actions"><button class="btn-small edit-actor-btn">ویرایش</button><button class="btn-small danger delete-actor-btn">حذف</button></div>
      </div>`).join("")
    : `<p class="empty-note">هنوز بازیگری اضافه نشده.</p>`;

  listBox.querySelectorAll(".delete-actor-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      if (await confirmModal("این بازیگر حذف شود؟ (از فیلم‌هایی که بهش اختصاص داده شده هم برداشته می‌شه)", "حذف کن", "انصراف")) {
        setButtonLoading(btn, true);
        try {
          await deleteDoc(doc(db, "actors", id));
          showToast("بازیگر حذف شد");
          await loadActors();
        } catch {
          showToast("خطا در حذف", "err");
          setButtonLoading(btn, false);
        }
      }
    });
  });
  listBox.querySelectorAll(".edit-actor-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      const actor = allActorsCache.find(item => item.id === id);
      if (!actor) return;
      editingActorId = actor.id;
      document.getElementById("actorName").value = actor.name || "";
      document.getElementById("actorPhoto").value = actor.photoUrl || "";
      document.getElementById("actorFeatured").checked = Boolean(actor.featured);
      document.getElementById("saveActorBtn").textContent = "ذخیره تغییرات";
      document.getElementById("cancelActorEditBtn").style.display = "inline-flex";
      document.getElementById("actorName").focus();
    });
  });
}

// انتخاب کست فیلم: چک‌باکس‌های تصویردار، قابل فیلتر با جستجو — همون الگوی
// renderCategoryPicker ولی با عکس دایره‌ای و یک فیلد جستجو بالاش.
function renderCastPicker(previouslySelectedIds) {
  const box = document.getElementById("mCastPicker");
  if (!box) return;
  const selected = new Set(previouslySelectedIds || []);
  const term = (document.getElementById("mCastSearch")?.value || "").trim().toLocaleLowerCase("fa");
  const list = term ? allActorsCache.filter(a => (a.name || "").toLocaleLowerCase("fa").includes(term)) : allActorsCache;

  box.innerHTML = list.length
    ? list.map(a => `
      <label class="chip category-chip cast-chip-picker">
        <input type="checkbox" value="${a.id}" ${selected.has(a.id) ? "checked" : ""} style="display:none;">
        <img src="${a.photoUrl || ""}" alt="" onerror="this.style.visibility='hidden'">
        ${a.name || "(بدون نام)"}
      </label>`).join("")
    : `<p class="empty-note" style="padding:0;">${allActorsCache.length ? "چیزی با این جستجو پیدا نشد." : "اول از تب «بازیگران» چندتا بازیگر اضافه کن."}</p>`;

  box.querySelectorAll(".category-chip").forEach(chip => {
    const input = chip.querySelector("input");
    chip.classList.toggle("active", input.checked);
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      input.checked = !input.checked;
      chip.classList.toggle("active", input.checked);
    });
  });
}

function getSelectedCastIds() {
  return [...document.querySelectorAll('#mCastPicker input[type="checkbox"]:checked')].map(el => el.value);
}

function setSelectedCastIds(ids) {
  renderCastPicker(ids);
}

async function saveActor() {
  const name = document.getElementById("actorName").value.trim();
  if (!name) { setStatus("actorStatus", "نام بازیگر را وارد کن.", false); return; }
  const photoUrl = document.getElementById("actorPhoto").value.trim();
  const featured = document.getElementById("actorFeatured").checked;
  const btn = document.getElementById("saveActorBtn");
  setButtonLoading(btn, true);
  try {
    if (editingActorId) {
      await updateDoc(doc(db, "actors", editingActorId), { name, photoUrl, featured });
      setStatus("actorStatus", "بازیگر ویرایش شد.");
    } else {
      await addDoc(collection(db, "actors"), { name, photoUrl, featured, createdAt: serverTimestamp() });
      setStatus("actorStatus", "بازیگر اضافه شد.");
    }
    resetActorForm();
    await loadActors();
  } catch {
    setStatus("actorStatus", "خطا در ذخیره‌سازی.", false);
  } finally {
    setButtonLoading(btn, false);
  }
}

function resetActorForm() {
  editingActorId = null;
  const nameInput = document.getElementById("actorName");
  const photoInput = document.getElementById("actorPhoto");
  const featuredInput = document.getElementById("actorFeatured");
  const button = document.getElementById("saveActorBtn");
  if (nameInput) nameInput.value = "";
  if (photoInput) photoInput.value = "";
  if (featuredInput) featuredInput.checked = false;
  if (button) button.textContent = "افزودن بازیگر";
  const cancel = document.getElementById("cancelActorEditBtn");
  if (cancel) cancel.style.display = "none";
}

// ---------- Public site settings ----------

const DEFAULT_SETTINGS = {
  siteTagline: "معرفی دقیق فیلم و سریال برای انتخاب بهتر",
  aboutTitle: "درباره نیو مووی",
  aboutBody: "نیو مووی یک مرجع فارسی برای کشف فیلم و سریال است؛ جایی برای دیدن اطلاعات، امتیاز، خلاصه داستان، تریلر و لینک‌های مرتبط با هر عنوان.",
  aboutMission: "هدف ما این است که قبل از شروع تماشا، اطلاعات مرتب و قابل اعتمادی در اختیار شما باشد.",
  contactTitle: "تماس با ما",
  contactBody: "برای پیشنهاد عنوان جدید، گزارش مشکل یا همکاری با ما در ارتباط باشید.",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  telegramUrl: "",
  instagramUrl: "",
  faqItems: [
    { question: "", answer: "" },
    { question: "", answer: "" },
    { question: "", answer: "" }
  ]
};

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value || "";
}

async function loadSiteSettings() {
  let remote = {};
  try {
    const snapshot = await getDoc(doc(db, "siteSettings", "main"));
    remote = snapshot.exists() ? snapshot.data() : {};
  } catch (error) {
    console.warn("site settings could not be read; showing defaults", error);
  }
  const settings = { ...DEFAULT_SETTINGS, ...remote };
  setValue("siteTagline", settings.siteTagline);
  setValue("siteAboutTitle", settings.aboutTitle);
  setValue("siteAboutBody", settings.aboutBody);
  setValue("siteAboutMission", settings.aboutMission);
  setValue("siteContactTitle", settings.contactTitle);
  setValue("siteContactBody", settings.contactBody);
  setValue("siteContactEmail", settings.contactEmail);
  setValue("siteContactPhone", settings.contactPhone);
  setValue("siteContactAddress", settings.contactAddress);
  setValue("siteTelegramUrl", settings.telegramUrl);
  setValue("siteInstagramUrl", settings.instagramUrl);
  (settings.faqItems || []).slice(0, 3).forEach((item, index) => {
    setValue(`faq${index + 1}Question`, item.question);
    setValue(`faq${index + 1}Answer`, item.answer);
  });
}

async function saveSiteSettings() {
  const button = document.getElementById("saveSettingsBtn");
  setButtonLoading(button, true, "در حال ذخیره...");
  const faqItems = [1, 2, 3].map(index => ({
    question: document.getElementById(`faq${index}Question`).value.trim(),
    answer: document.getElementById(`faq${index}Answer`).value.trim()
  })).filter(item => item.question || item.answer);
  const data = {
    siteTagline: document.getElementById("siteTagline").value.trim(),
    aboutTitle: document.getElementById("siteAboutTitle").value.trim(),
    aboutBody: document.getElementById("siteAboutBody").value.trim(),
    aboutMission: document.getElementById("siteAboutMission").value.trim(),
    contactTitle: document.getElementById("siteContactTitle").value.trim(),
    contactBody: document.getElementById("siteContactBody").value.trim(),
    contactEmail: document.getElementById("siteContactEmail").value.trim(),
    contactPhone: document.getElementById("siteContactPhone").value.trim(),
    contactAddress: document.getElementById("siteContactAddress").value.trim(),
    telegramUrl: document.getElementById("siteTelegramUrl").value.trim(),
    instagramUrl: document.getElementById("siteInstagramUrl").value.trim(),
    faqItems,
    updatedAt: serverTimestamp()
  };
  try {
    await setDoc(doc(db, "siteSettings", "main"), data, { merge: true });
    setStatus("settingsStatus", "تنظیمات سایت ذخیره شد.");
  } catch (error) {
    console.error("site settings save failed", error);
    setStatus("settingsStatus", "ذخیره تنظیمات انجام نشد؛ قوانین Firestore را بررسی کن.", false);
  } finally {
    setButtonLoading(button, false);
  }
}

// ---------- Push notifications (Firebase Cloud Messaging) ----------

async function refreshTokenCount() {
  const el = document.getElementById("notifTokenCount");
  if (!el) return;
  try {
    const snap = await getCountFromServer(query(collectionGroup(db, "fcmTokens")));
    el.textContent = `تعداد دستگاه‌های دارای اعلان فعال: ${snap.data().count}`;
  } catch {
    el.textContent = "";
  }
}

async function sendNotificationToAllUsers() {
  const button = document.getElementById("notifSendBtn");
  const title = document.getElementById("notifTitle").value.trim();
  const body = document.getElementById("notifBody").value.trim();
  const link = document.getElementById("notifLink").value.trim();

  if (!title || !body) {
    setStatus("notifStatus", "عنوان و متن اعلان الزامی است.", false);
    return;
  }
  if (!(await confirmModal(`اعلان برای همه‌ی کاربرانی که اعلان را فعال کرده‌اند ارسال شود؟`, "بله، ارسال کن", "انصراف"))) return;

  setButtonLoading(button, true, "در حال ارسال...");
  try {
    const functions = getFunctions(app);
    const send = httpsCallable(functions, "sendNotificationToAll");
    const res = await send({ title, body, link });
    const { successCount = 0, failureCount = 0, totalTokens = 0 } = res.data || {};
    setStatus("notifStatus", `ارسال شد — موفق: ${successCount} از ${totalTokens}${failureCount ? ` (ناموفق: ${failureCount})` : ""}`);
    document.getElementById("notifTitle").value = "";
    document.getElementById("notifBody").value = "";
    document.getElementById("notifLink").value = "";
    refreshTokenCount();
  } catch (error) {
    console.error("send notification failed", error);
    const code = error?.code || "";
    if (code === "functions/not-found") {
      setStatus("notifStatus", "تابع ارسال اعلان روی سرور پیدا نشد؛ باید ابتدا Cloud Function را دیپلوی کنی (راهنمای functions/README.md).", false);
    } else if (code === "functions/permission-denied" || code === "functions/unauthenticated") {
      setStatus("notifStatus", "این حساب دسترسی ارسال اعلان ندارد.", false);
    } else {
      setStatus("notifStatus", "ارسال اعلان با خطا مواجه شد.", false);
    }
  } finally {
    setButtonLoading(button, false);
  }
}

// ---------- Focal-point picker (backdrop position for hero & movie detail) ----------
// این "برش" واقعی نیست (فایل جدیدی ساخته نمی‌شه، چون این پروژه سرویس آپلود/ذخیره‌ی
// عکس نداره و همه‌چیز از روی لینک مستقیمه) — نقطه‌ی کانونی تصویر رو ذخیره می‌کنه
// و همون لینک با background-position متفاوت توی هیرو/جزئیات فیلم نمایش داده می‌شه.
let focalTargetPosInput = null;
let focalPendingPos = "50% 50%";

function initFocalPicker() {
  document.querySelectorAll(".crop-focal-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const urlInput = document.getElementById(btn.dataset.urlInput);
      const posInput = document.getElementById(btn.dataset.posInput);
      const url = urlInput.value.trim();
      if (!url) { showToast("اول یه لینک تصویر وارد کن", "err"); return; }
      focalTargetPosInput = posInput;
      focalPendingPos = posInput.value.trim() || "50% 50%";
      document.getElementById("focalPickerImg").src = url;
      updateFocalMarker(focalPendingPos);
      document.getElementById("focalModalOverlay").classList.add("open");
    });
  });

  const picker = document.getElementById("focalPicker");
  picker.addEventListener("click", (e) => {
    const rect = picker.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    focalPendingPos = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    updateFocalMarker(focalPendingPos);
  });

  document.getElementById("focalConfirmBtn").addEventListener("click", () => {
    if (focalTargetPosInput) focalTargetPosInput.value = focalPendingPos;
    closeFocalModal();
  });
  document.getElementById("focalCancelBtn").addEventListener("click", closeFocalModal);
  document.getElementById("focalModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "focalModalOverlay") closeFocalModal();
  });
}

function updateFocalMarker(pos) {
  const [x, y] = pos.split(" ");
  const marker = document.getElementById("focalMarker");
  marker.style.left = x;
  marker.style.top = y;
}

function closeFocalModal() {
  document.getElementById("focalModalOverlay").classList.remove("open");
  focalTargetPosInput = null;
}

// ---------- Analytics (visits, downloads) ----------
// همه‌چیز از روی نوشتن مستقیم کلاینت توی Firestore جمع میشه (سرور جدا نداریم)،
// پس تقریبیه و در برابر سوءاستفاده‌ی عمدی مقاوم نیست — دقیقاً همون محدودیتی که
// شمارنده‌ی لایک‌ها هم داره.

function lastNDaysLabels(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}
function dayKey(date) { return date.toISOString().slice(0, 10); }
function formatDayLabel(date) { return date.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }); }

function renderLineChart(canvasId, labels, data, label, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === "undefined") return;
  Chart.getChart(ctx)?.destroy();
  new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label, data, borderColor: color, backgroundColor: color + "33", tension: 0.3, fill: true }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#999" }, grid: { color: "#222" } },
        y: { beginAtZero: true, ticks: { color: "#999", precision: 0 }, grid: { color: "#222" } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderBarChart(canvasId, labels, data, label, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === "undefined") return;
  Chart.getChart(ctx)?.destroy();
  new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label, data, backgroundColor: color }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, ticks: { color: "#999", precision: 0 }, grid: { color: "#222" } },
        y: { ticks: { color: "#999" }, grid: { color: "#222" } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

async function loadAnalytics() {
  const days = lastNDaysLabels(14);
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceTs = Timestamp.fromDate(since);

  let pageViews = [];
  try {
    const snap = await getDocs(query(collection(db, "pageViews"), where("createdAt", ">=", sinceTs), orderBy("createdAt", "desc"), limit(3000)));
    pageViews = snap.docs.map(d => d.data());
  } catch (e) { console.error("خطا در بارگذاری بازدیدها:", e); }

  const visitCounts = {};
  days.forEach(d => visitCounts[dayKey(d)] = 0);
  pageViews.forEach(pv => {
    const key = pv.createdAt?.toDate ? dayKey(pv.createdAt.toDate()) : null;
    if (key && key in visitCounts) visitCounts[key]++;
  });
  renderLineChart("chartVisits", days.map(formatDayLabel), days.map(d => visitCounts[dayKey(d)]), "بازدید", "#cdfa0a");

  let downloads = [];
  try {
    const snap = await getDocs(query(collection(db, "downloads"), where("createdAt", ">=", sinceTs), orderBy("createdAt", "desc"), limit(3000)));
    downloads = snap.docs.map(d => d.data());
  } catch (e) { console.error("خطا در بارگذاری دانلودها:", e); }

  const dlCounts = {};
  days.forEach(d => dlCounts[dayKey(d)] = 0);
  downloads.forEach(dl => {
    const key = dl.createdAt?.toDate ? dayKey(dl.createdAt.toDate()) : null;
    if (key && key in dlCounts) dlCounts[key]++;
  });
  renderLineChart("chartDownloads", days.map(formatDayLabel), days.map(d => dlCounts[dayKey(d)]), "دانلود", "#4dc9ff");

  const top = [...allMoviesCache].filter(m => m.downloadsCount > 0)
    .sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0)).slice(0, 8);
  renderBarChart("chartTopDownloads", top.map(m => m.title || "بدون‌نام"), top.map(m => m.downloadsCount || 0), "دانلود", "#ff8a4d");

  const listBox = document.getElementById("adminVisitsList");
  const recent = pageViews.slice(0, 60);
  listBox.innerHTML = recent.length
    ? recent.map(pv => `
      <div class="admin-list-item visit-row">
        <div class="info">
          <strong>${pv.ip || "نامشخص"}</strong>
          <span>${pv.deviceType || "-"} · ${pv.path || "-"} · ${pv.createdAt?.toDate ? pv.createdAt.toDate().toLocaleString("fa-IR") : "-"}</span>
        </div>
        <span class="${pv.uid ? "badge-featured" : "badge-guest"}">${pv.uid ? "ثبت‌نام‌کرده" : "مهمان"}</span>
      </div>`).join("")
    : `<p class="empty-note">هنوز بازدیدی ثبت نشده.</p>`;
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
  setSelectedCategoryIds(m.categoryIds);
  document.getElementById("mYear").value = m.year || "";
  document.getElementById("mRuntime").value = m.runtime || "";
  document.getElementById("mRating").value = m.rating || "";
  document.getElementById("mVotes").value = m.votes || "";
  document.getElementById("mPopularity").value = m.popularity || "";
  document.getElementById("mCountry").value = m.country || "";
  document.getElementById("mLanguage").value = m.language || "";
  document.getElementById("mDirector").value = m.director || "";
  setSelectedCastIds(m.castIds);
  document.getElementById("mSynopsis").value = m.synopsis || "";
  document.getElementById("mPoster").value = m.posterUrl || "";
  document.getElementById("mBackdrop").value = m.backdropUrl || "";
  document.getElementById("mBackdropPosition").value = m.backdropPosition || "";
  document.getElementById("mTrailer").value = m.trailerUrl || "";
  setDlRows(m.downloadLinks);
  document.getElementById("cancelEditBtn").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetMovieForm() {
  editingMovieId = null;
  document.getElementById("movieFormTitle").textContent = "افزودن فیلم/سریال جدید";
  ["mOriginalTitle","mTitle","mGenre","mYear","mRuntime","mRating","mVotes","mPopularity",
   "mCountry","mLanguage","mDirector","mSynopsis","mPoster","mBackdrop","mBackdropPosition","mTrailer"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("mType").value = "movie";
  document.getElementById("mActive").value = "true";
  document.getElementById("mCastSearch").value = "";
  setSelectedCategoryIds([]);
  setSelectedCastIds([]);
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
    categoryIds: getSelectedCategoryIds(),
    year: document.getElementById("mYear").value.trim(),
    runtime: toNumOrNull(document.getElementById("mRuntime").value),
    rating: toNumOrNull(document.getElementById("mRating").value),
    votes: toNumOrNull(document.getElementById("mVotes").value),
    popularity: toNumOrNull(document.getElementById("mPopularity").value),
    country: document.getElementById("mCountry").value.trim(),
    language: document.getElementById("mLanguage").value.trim(),
    director: document.getElementById("mDirector").value.trim(),
    castIds: getSelectedCastIds(),
    synopsis: document.getElementById("mSynopsis").value.trim(),
    posterUrl: document.getElementById("mPoster").value.trim(),
    backdropUrl: document.getElementById("mBackdrop").value.trim(),
    backdropPosition: document.getElementById("mBackdropPosition").value.trim(),
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
  document.getElementById("heroBackdropPosition").value = h.backdropPosition || "";
  document.getElementById("heroActive").value = String(h.active !== false);
  document.getElementById("cancelHeroEditBtn").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetHeroForm() {
  editingHeroId = null;
  document.getElementById("heroFormTitle").textContent = "افزودن هیرو جدید";
  ["heroKicker","heroTitle","heroDesc","heroYear","heroGenre","heroBackdrop","heroBackdropPosition"].forEach(id => document.getElementById(id).value = "");
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
    backdropPosition: document.getElementById("heroBackdropPosition").value.trim(),
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
  try {
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
  } catch (e) {
    const msg = `<p class="error-note">خطا در بارگذاری (${e.code || e.message}).</p>`;
    document.getElementById("adminCommentsList").innerHTML = msg;
    document.getElementById("adminQnaList").innerHTML = msg;
    throw e;
  }
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
  try {
    const snap = await getDocs(collection(db, "visitors"));
    const visitors = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.lastLoginAt?.seconds || 0) - (a.lastLoginAt?.seconds || 0));
    renderVisitors(visitors);
  } catch (e) {
    document.getElementById("adminVisitorsList").innerHTML =
      `<p class="error-note">خطا در بارگذاری (${e.code || e.message}). اگه کد خطا permission-denied هست، یعنی سند admins/{uid} هنوز ساخته نشده یا Rules جدید Publish نشده — به بخش «قوانین امنیتی» در README نگاه کن.</p>`;
    throw e;
  }
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
  try {
    const snap = await getDocs(collection(db, "blockedIPs"));
    renderBlockedIps(snap.docs.map(d => d.id));
  } catch (e) {
    document.getElementById("adminBlockedIpsList").innerHTML =
      `<p class="error-note">خطا در بارگذاری (${e.code || e.message}).</p>`;
    throw e;
  }
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
