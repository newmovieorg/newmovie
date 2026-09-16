import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(location.search);
const id = params.get("id");

async function load() {
  if (!id) {
    document.getElementById("detailTitle").textContent = "فیلمی مشخص نشده";
    return;
  }
  try {
    const snap = await getDoc(doc(db, "movies", id));
    if (!snap.exists()) {
      document.getElementById("detailTitle").textContent = "فیلم پیدا نشد";
      return;
    }
    const m = snap.data();
    document.title = `${m.title} | سینماتک`;
    document.getElementById("detailPoster").style.backgroundImage = `url('${m.posterUrl || ""}')`;
    document.getElementById("detailTitle").textContent = m.title || "";
    document.getElementById("detailSynopsis").textContent = m.synopsis || "";

    const tags = document.getElementById("detailTags");
    const parts = [];
    if (m.year) parts.push(`<span>${m.year}</span>`);
    if (m.genre) parts.push(`<span>${m.genre}</span>`);
    if (m.rating) parts.push(`<span>امتیاز ${m.rating}</span>`);
    tags.innerHTML = parts.join("");

    if (m.trailerUrl) {
      const link = document.getElementById("trailerLink");
      link.href = m.trailerUrl;
      link.style.display = "inline-flex";
    }
  } catch (e) {
    console.error("detail load error", e);
    document.getElementById("detailTitle").textContent = "خطا در بارگذاری";
  }
}

load();
