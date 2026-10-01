import { watchActors } from "./data.js";
import { emptyStateHTML, escapeHTML, PERSON_ICON, skeletonActors } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

const grid = document.getElementById("actorGrid");
const searchInput = document.getElementById("actorSearchInput");
grid.innerHTML = skeletonActors(12);
let allActors = null; // null = هنوز جواب اول از فایراستور نرسیده (فرق داره با آرایه‌ی خالی یعنی واقعاً بازیگری نیست)

function actorCardHTML(a) {
  return `
    <a class="actor-card" href="actor.html?id=${a.id}">
      <span class="actor-card-photo">${a.photoUrl
        ? `<img src="${escapeHTML(a.photoUrl)}" alt="" loading="lazy" onerror="this.remove()">`
        : PERSON_ICON}</span>
      <span class="actor-card-name">${escapeHTML(a.name || "")}</span>
    </a>`;
}

function render() {
  if (allActors === null) return; // اسکلتون همین‌طوری می‌مونه تا جواب اول برسه
  // فقط بازیگرهایی که ادمین صراحتاً «نمایش عمومی» رو براشون فعال کرده — نه هر
  // بازیگری که فقط برای تگ‌کردن کست یه فیلم (دستی یا با افزودن گروهی) ساخته شده.
  const publicActors = allActors.filter(a => a.featured);
  const term = (searchInput.value || "").trim().toLocaleLowerCase("fa");
  const list = term ? publicActors.filter(a => (a.name || "").toLocaleLowerCase("fa").includes(term)) : publicActors;
  grid.innerHTML = list.length
    ? list.map(actorCardHTML).join("")
    : emptyStateHTML(publicActors.length ? "بازیگری با این اسم پیدا نشد" : "هنوز بازیگری برای نمایش عمومی انتخاب نشده");
}

searchInput.addEventListener("input", render);
watchActors(actors => { allActors = actors; render(); }, () => { allActors = []; render(); });
