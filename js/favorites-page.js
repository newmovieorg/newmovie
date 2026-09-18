import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { cacheGet, cacheSet } from "./cache.js";
import { skeletonCards, movieCardHTML, getFavorites, favoritesReady } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

async function init() {
  const grid = document.getElementById("resultsGrid");
  grid.innerHTML = skeletonCards(8);

  await favoritesReady;
  const favIds = getFavorites();
  if (!favIds.length) {
    grid.innerHTML = `<p class="empty-note">هنوز چیزی به علاقه‌مندی‌ها اضافه نکردی.</p>`;
    return;
  }

  let all;
  try {
    const cached = cacheGet("movies_all");
    if (cached) {
      all = cached;
    } else {
      const snap = await getDocs(query(collection(db, "movies"), orderBy("createdAt", "desc")));
      all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.active !== false);
      cacheSet("movies_all", all);
    }
  } catch (e) {
    grid.innerHTML = `<p class="error-note">خطا در اتصال به دیتابیس.</p>`;
    return;
  }

  const items = all.filter(m => favIds.includes(m.id));
  grid.innerHTML = items.length
    ? items.map(movieCardHTML).join("")
    : `<p class="empty-note">مواردی که ذخیره کرده بودی دیگر موجود نیستند.</p>`;
}

init();
