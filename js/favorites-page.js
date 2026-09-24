import { watchMovies } from "./data.js";
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

  watchMovies(all => {
    const items = all.filter(m => favIds.includes(m.id));
    grid.innerHTML = items.length
      ? items.map(movieCardHTML).join("")
      : `<p class="empty-note">مواردی که ذخیره کرده بودی دیگر موجود نیستند.</p>`;
  }, () => {
    grid.innerHTML = `<p class="error-note">خطا در اتصال به دیتابیس.</p>`;
  });
}

init();
