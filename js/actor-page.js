import { watchMovies, watchActors } from "./data.js";
import { movieCardHTML, skeletonCards, emptyStateHTML, escapeHTML } from "./ui.js";
import { renderChrome } from "./chrome.js";

renderChrome();

const params = new URLSearchParams(location.search);
const id = params.get("id");

const grid = document.getElementById("resultsGrid");
grid.innerHTML = skeletonCards(6);

if (!id) {
  document.getElementById("actorProfileName").textContent = "بازیگر پیدا نشد";
  grid.innerHTML = emptyStateHTML("لینک نامعتبر است");
} else {
  const state = { movies: null, actors: null };

  function tryRender() {
    const { movies, actors } = state;
    if (movies === null || actors === null) return;

    const actor = actors.find(a => a.id === id);
    if (!actor) {
      document.getElementById("actorProfileName").textContent = "بازیگر پیدا نشد";
      document.getElementById("actorProfileCount").textContent = "";
      grid.innerHTML = emptyStateHTML("این بازیگر دیگر در سایت وجود ندارد");
      return;
    }

    document.title = `${actor.name || "بازیگر"} | نیو مووی`;
    document.getElementById("actorProfileName").textContent = actor.name || "";
    const photoBox = document.getElementById("actorProfilePhoto");
    photoBox.innerHTML = actor.photoUrl
      ? `<img src="${escapeHTML(actor.photoUrl)}" alt="${escapeHTML(actor.name || "")}" onerror="this.remove()">`
      : "";

    const items = movies.filter(m => Array.isArray(m.castIds) && m.castIds.includes(id));
    document.getElementById("actorProfileCount").textContent = items.length
      ? `${items.length} عنوان در نیو مووی`
      : "";
    grid.innerHTML = items.length
      ? items.map(movieCardHTML).join("")
      : emptyStateHTML("هنوز فیلم یا سریالی از این بازیگر ثبت نشده");
  }

  watchMovies(movies => { state.movies = movies; tryRender(); }, () => { state.movies = []; tryRender(); });
  watchActors(actors => { state.actors = actors; tryRender(); }, () => { state.actors = []; tryRender(); });
}
