import { watchMovies } from "./data.js";
import { skeletonCards, movieCardHTML, getFavorites, favoritesReady, emptyStateHTML } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

async function init() {
  const grid = document.getElementById("resultsGrid");
  grid.innerHTML = skeletonCards(8);

  await favoritesReady;
  const favIds = getFavorites();
  if (!favIds.length) {
    grid.innerHTML = emptyStateHTML("هنوز چیزی به علاقه‌مندی‌ها اضافه نکردی", "روی آیکون قلب هر فیلم بزن تا اینجا اضافه بشه.");
    return;
  }

  watchMovies(all => {
    const items = all.filter(m => favIds.includes(m.id));
    grid.innerHTML = items.length
      ? items.map(movieCardHTML).join("")
      : emptyStateHTML("مواردی که ذخیره کرده بودی دیگر موجود نیستند");
  }, () => {
    grid.innerHTML = `<p class="error-note">خطا در اتصال به دیتابیس.</p>`;
  });
}

init();
