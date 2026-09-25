import { db } from "./firebase-init.js";
import {
  collection, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Real-time listeners replace the old getDocs()+sessionStorage-cache approach.
// That cache was keyed per-browser-tab, so an edit made in the admin panel
// (a separate tab) never invalidated what a visitor's tab had already cached
// for up to 5 minutes — the exact cause of "edits don't show up on the site".
// onSnapshot keeps every open page in sync with the database automatically,
// with no manual invalidation needed anywhere.

export function watchMovies(onData, onError) {
  return onSnapshot(collection(db, "movies"), snap => {
    const movies = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(m => m.active !== false)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    onData(movies);
  }, onError);
}

export function watchHeroes(onData, onError) {
  return onSnapshot(collection(db, "heroes"), snap => {
    const heroes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(h => h.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    onData(heroes);
  }, onError);
}

// "Category" is the real, shared, admin-managed grouping entity. It's stored
// in the same Firestore collection the admin panel calls "genres" (no need
// to migrate existing data) — the naming only changed in the UI text.
export function watchCategories(onData, onError) {
  return onSnapshot(collection(db, "genres"), snap => {
    const categories = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fa"));
    onData(categories);
  }, onError);
}

export function watchActors(onData, onError) {
  return onSnapshot(collection(db, "actors"), snap => {
    const actors = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fa"));
    onData(actors);
  }, onError);
}
