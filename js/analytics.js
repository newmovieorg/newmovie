import { db } from "./firebase-init.js";
import {
  collection, addDoc, doc, setDoc, updateDoc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { currentVisitor } from "./auth.js";

function detectDeviceType() {
  const ua = navigator.userAgent || "";
  if (/tablet|ipad/i.test(ua)) return "تبلت";
  if (/mobi|android|iphone/i.test(ua)) return "موبایل";
  return "دسکتاپ";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-09-26"
}

let cachedIp = null;
async function getIp() {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    cachedIp = data.ip || null;
  } catch {
    cachedIp = null;
  }
  return cachedIp;
}

let tracked = false;
// دو نوشتن جدا و سبک به‌جای یک لاگ خام بزرگ:
// ۱) visitStats/{تاریخ} یک شمارنده‌ی روزانه‌ست (increment) — نمودار ۱۴ روزه فقط
//    همین ۱۴ سند کوچیک رو می‌خونه، نه هزاران سند خام.
// ۲) pageViews یک لاگ خام و محدود می‌مونه، فقط برای نمایش «بازدیدکنندگان اخیر»
//    (با limit ثابت توی پنل، نه فیلتر روی تاریخ) — پس حجمش هرچقدر هم زیاد بشه
//    روی هزینه‌ی خوندن پنل ادمین اثر نمی‌ذاره.
export async function trackPageView() {
  if (tracked) return;
  tracked = true;
  try {
    const ip = await getIp();
    const user = currentVisitor();
    await Promise.all([
      setDoc(doc(db, "visitStats", todayKey()), { date: todayKey(), count: increment(1) }, { merge: true }),
      addDoc(collection(db, "pageViews"), {
        path: location.pathname.replace(/^\//, "") || "index.html",
        ip: ip || "",
        deviceType: detectDeviceType(),
        uid: user ? user.uid : null,
        createdAt: serverTimestamp()
      })
    ]);
  } catch (e) {
    console.error("trackPageView failed", e);
  }
}

export async function trackDownload(movieId, movieTitle) {
  try {
    await Promise.all([
      setDoc(doc(db, "downloadStats", todayKey()), { date: todayKey(), count: increment(1) }, { merge: true }),
      updateDoc(doc(db, "movies", movieId), { downloadsCount: increment(1) })
    ]);
  } catch (e) {
    console.error("trackDownload failed", e);
  }
}
