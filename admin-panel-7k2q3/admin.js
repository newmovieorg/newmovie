import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc,
  updateDoc, deleteDoc, serverTimestamp, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "../js/firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const onLoginPage = document.getElementById("loginBtn") !== null;
const onDashboard = document.getElementById("adminMovieList") !== null;

// ---------- Auth guard ----------
onAuthStateChanged(auth, (user) => {
  if (onLoginPage && user) {
    location.href = "dashboard.html";
  }
  if (onDashboard && !user) {
    location.href = "index.html";
  }
  if (onDashboard && user) {
    initDashboard();
  }
});

if (onLoginPage) {
  document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    const errBox = document.getElementById("loginError");
    errBox.textContent = "";
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      errBox.textContent = "ایمیل یا رمز عبور اشتباه است.";
    }
  });
}

if (onDashboard) {
  document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));
}

// ---------- Dashboard logic ----------
let editingId = null;

async function initDashboard() {
  await loadHeroForm();
  await loadMovieList();

  document.getElementById("saveHeroBtn").addEventListener("click", saveHero);
  document.getElementById("saveMovieBtn").addEventListener("click", saveMovie);
  document.getElementById("cancelEditBtn").addEventListener("click", resetMovieForm);
}

async function loadHeroForm() {
  const snap = await getDoc(doc(db, "site", "hero"));
  if (snap.exists()) {
    const h = snap.data();
    document.getElementById("heroKicker").value = h.kicker || "";
    document.getElementById("heroTitle").value = h.title || "";
    document.getElementById("heroDesc").value = h.description || "";
    document.getElementById("heroBackdrop").value = h.backdropUrl || "";
  }
}

async function populateHeroMovieSelect(movies) {
  const select = document.getElementById("heroMovieSelect");
  const heroSnap = await getDoc(doc(db, "site", "hero"));
  const currentMovieId = heroSnap.exists() ? heroSnap.data().movieId : "";
  select.innerHTML = `<option value="">— هیچکدام —</option>` +
    movies.map(m => `<option value="${m.id}" ${m.id === currentMovieId ? "selected" : ""}>${m.title}</option>`).join("");
}

async function saveHero() {
  const status = document.getElementById("heroStatus");
  try {
    await setDoc(doc(db, "site", "hero"), {
      kicker: document.getElementById("heroKicker").value.trim(),
      title: document.getElementById("heroTitle").value.trim(),
      description: document.getElementById("heroDesc").value.trim(),
      backdropUrl: document.getElementById("heroBackdrop").value.trim(),
      movieId: document.getElementById("heroMovieSelect").value || null,
      updatedAt: serverTimestamp()
    }, { merge: true });
    status.textContent = "ذخیره شد.";
    status.className = "status-msg ok";
  } catch (e) {
    status.textContent = "خطا در ذخیره‌سازی.";
    status.className = "status-msg err";
  }
  setTimeout(() => (status.textContent = ""), 3000);
}

async function loadMovieList() {
  const listBox = document.getElementById("adminMovieList");
  const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const movies = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  await populateHeroMovieSelect(movies);

  if (!movies.length) {
    listBox.innerHTML = `<p class="empty-note">هنوز فیلمی اضافه نشده.</p>`;
    return;
  }

  listBox.innerHTML = movies.map(m => `
    <div class="admin-list-item" data-id="${m.id}">
      <img src="${m.posterUrl || ""}" alt="">
      <div class="info">
        <strong>${m.title}</strong>
        <span>${m.year || ""}${m.genre ? " · " + m.genre : ""}</span>
      </div>
      <div class="actions">
        <button class="btn-small edit-btn">ویرایش</button>
        <button class="btn-small delete-btn">حذف</button>
      </div>
    </div>
  `).join("");

  listBox.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      const m = movies.find(x => x.id === id);
      fillMovieForm(m);
    });
  });
  listBox.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".admin-list-item").dataset.id;
      if (confirm("این فیلم حذف شود؟")) {
        await deleteDoc(doc(db, "movies", id));
        loadMovieList();
      }
    });
  });
}

function fillMovieForm(m) {
  editingId = m.id;
  document.getElementById("movieFormTitle").textContent = `ویرایش: ${m.title}`;
  document.getElementById("mTitle").value = m.title || "";
  document.getElementById("mGenre").value = m.genre || "";
  document.getElementById("mYear").value = m.year || "";
  document.getElementById("mRating").value = m.rating || "";
  document.getElementById("mSynopsis").value = m.synopsis || "";
  document.getElementById("mPoster").value = m.posterUrl || "";
  document.getElementById("mTrailer").value = m.trailerUrl || "";
  document.getElementById("cancelEditBtn").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetMovieForm() {
  editingId = null;
  document.getElementById("movieFormTitle").textContent = "افزودن فیلم/سریال جدید";
  ["mTitle","mGenre","mYear","mRating","mSynopsis","mPoster","mTrailer"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("cancelEditBtn").style.display = "none";
}

async function saveMovie() {
  const status = document.getElementById("movieStatus");
  const data = {
    title: document.getElementById("mTitle").value.trim(),
    genre: document.getElementById("mGenre").value.trim(),
    year: document.getElementById("mYear").value.trim(),
    rating: document.getElementById("mRating").value.trim(),
    synopsis: document.getElementById("mSynopsis").value.trim(),
    posterUrl: document.getElementById("mPoster").value.trim(),
    trailerUrl: document.getElementById("mTrailer").value.trim(),
  };

  if (!data.title) {
    status.textContent = "عنوان الزامی است.";
    status.className = "status-msg err";
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, "movies", editingId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "movies"), data);
    }
    status.textContent = "ذخیره شد.";
    status.className = "status-msg ok";
    resetMovieForm();
    loadMovieList();
  } catch (e) {
    status.textContent = "خطا در ذخیره‌سازی.";
    status.className = "status-msg err";
  }
  setTimeout(() => (status.textContent = ""), 3000);
}
