import { watchActors } from "./data.js";
import { emptyStateHTML, escapeHTML, PERSON_ICON } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

const grid = document.getElementById("actorGrid");
const searchInput = document.getElementById("actorSearchInput");
let allActors = [];

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
  const term = (searchInput.value || "").trim().toLocaleLowerCase("fa");
  const list = term ? allActors.filter(a => (a.name || "").toLocaleLowerCase("fa").includes(term)) : allActors;
  grid.innerHTML = list.length
    ? list.map(actorCardHTML).join("")
    : emptyStateHTML(allActors.length ? "بازیگری با این اسم پیدا نشد" : "هنوز بازیگری اضافه نشده");
}

searchInput.addEventListener("input", render);
watchActors(actors => { allActors = actors; render(); }, () => { allActors = []; render(); });
