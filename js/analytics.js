import { db } from "./firebase-init.js";
import {
  collection, addDoc, doc, updateDoc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { currentVisitor } from "./auth.js";

function detectDeviceType() {
  const ua = navigator.userAgent || "";
  if (/tablet|ipad/i.test(ua)) return "تبلت";
  if (/mobi|android|iphone/i.test(ua)) return "موبایل";
  return "دسکتاپ";
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
// یک بازدید در هر بارگذاری صفحه — فقط روی صفحات عمومی سایت (renderChrome)،
// نه پنل ادمین که این ماژول اصلاً توش import نمی‌شه.
export async function trackPageView() {
  if (tracked) return;
  tracked = true;
  try {
    const ip = await getIp();
    const user = currentVisitor();
    await addDoc(collection(db, "pageViews"), {
      path: location.pathname.replace(/^\//, "") || "index.html",
      ip: ip || "",
      deviceType: detectDeviceType(),
      uid: user ? user.uid : null,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("trackPageView failed", e);
  }
}

export async function trackDownload(movieId, movieTitle) {
  try {
    await Promise.all([
      addDoc(collection(db, "downloads"), {
        movieId: movieId || "",
        movieTitle: movieTitle || "",
        createdAt: serverTimestamp()
      }),
      updateDoc(doc(db, "movies", movieId), { downloadsCount: increment(1) })
    ]);
  } catch (e) {
    console.error("trackDownload failed", e);
  }
}
