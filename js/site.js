import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, getDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allMovies = [];

async function loadHero() {
  try {
    const heroSnap = await getDoc(doc(db, "site", "hero"));
    if (heroSnap.exists()) {
      const h = heroSnap.data();
      document.getElementById("heroKicker").textContent = h.kicker || "پیشنهاد ویژه";
      document.getElementById("heroTitle").textContent = h.title || "";
      document.getElementById("heroDesc").textContent = h.description || "";
      document.getElementById("hero").style.backgroundImage = h.backdropUrl
        ? `linear-gradient(180deg, rgba(18,16,20,0.15) 0%, rgba(18,16,20,0.55) 55%, #121014 100%), url('${h.backdropUrl}')`
        : "";
      const link = document.getElementById("heroLink");
      link.href = h.movieId ? `movie.html?id=${h.movieId}` : "#movies";
    } else {
      document.getElementById("heroKicker").textContent = "به سینماتک خوش آمدید";
      document.getElementById("heroTitle").textContent = "معرفی بهترین فیلم‌ها و سریال‌ها";
    }
  } catch (e) {
    console.error("hero load error", e);
  }
}

function renderMovies(list) {
  const grid = document.getElementById("movieGrid");
  if (!list.length) {
    grid.innerHTML = `<p class="empty-note">فعلاً فیلمی ثبت نشده.</p>`;
    return;
  }
  grid.innerHTML = list.map(m => `
    <a class="card" href="movie.html?id=${m.id}">
      <div class="card-poster" style="background-image:url('${m.posterUrl || ""}')">
        ${m.rating ? `<span class="card-rating">${m.rating}</span>` : ""}
      </div>
      <div class="card-body">
        <p class="card-title">${m.title}</p>
        <p class="card-meta">${m.year || ""}${m.genre ? " · " + m.genre : ""}</p>
      </div>
    </a>
  `).join("");
}

function renderGenreChips(list) {
  const genres = [...new Set(list.map(m => m.genre).filter(Boolean))];
  const row = document.getElementById("genreChips");
  genres.forEach(g => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.genre = g;
    btn.textContent = g;
    row.appendChild(btn);
  });
  row.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    row.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    const g = btn.dataset.genre;
    renderMovies(g === "all" ? allMovies : allMovies.filter(m => m.genre === g));
  });
}

async function loadMovies() {
  try {
    const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allMovies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMovies(allMovies);
    renderGenreChips(allMovies);
  } catch (e) {
    console.error("movies load error", e);
    document.getElementById("movieGrid").innerHTML =
      `<p class="empty-note">خطا در بارگذاری فیلم‌ها.</p>`;
  }
}

document.getElementById("searchBtn").addEventListener("click", doSearch);
document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});
function doSearch() {
  const term = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!term) { renderMovies(allMovies); return; }
  renderMovies(allMovies.filter(m => (m.title || "").toLowerCase().includes(term)));
}

loadHero();
loadMovies();
