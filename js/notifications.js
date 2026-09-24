import { app, db } from "./firebase-init.js";
import {
  getMessaging, getToken, onMessage, isSupported
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { currentVisitor, watchVisitor } from "./auth.js";
import { showToast } from "./ui.js";

// از Firebase Console → Project settings → Cloud Messaging → Web configuration
// → Web Push certificates یک جفت کلید VAPID بساز و مقدارش رو همین‌جا جایگزین کن.
// بدون این کلید، getToken() هیچ‌وقت موفق نمی‌شه.
const VAPID_KEY = "BM8WHM4yLJhC2QJTZexqWDhRpQGpb-SBGyRI2_BYMoo9mL9rerRYWr82v_lu-wJsMBjDpEFV9RB3Z3xX0mkJ8Qk";

const REMIND_KEY = "newmovie_notif_remind_at";
const REMIND_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // هر ۳ روز حداکثر یک‌بار

let messagingInstance = null;
let supportChecked = false;
let supported = false;

async function getMessagingSafe() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;
  if (!supportChecked) {
    supportChecked = true;
    try { supported = await isSupported(); } catch { supported = false; }
  }
  if (!supported) return null;
  if (!messagingInstance) {
    try { messagingInstance = getMessaging(app); } catch { return null; }
  }
  return messagingInstance;
}

// شناسه سند از خود توکن ساخته می‌شه، تا ثبت دوباره‌ی همون دستگاه به‌جای ساختن
// یک سند تکراری، سند قبلی رو آپدیت کنه.
function tokenDocRef(uid, token) {
  const safeId = token.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 300) || String(Date.now());
  return doc(db, "visitors", uid, "fcmTokens", safeId);
}

export async function enablePushNotifications() {
  const user = currentVisitor();
  if (!user) {
    showToast("برای فعال کردن اعلان، اول وارد حساب شو", "err");
    return false;
  }
  if (!("Notification" in window)) {
    showToast("مرورگر شما از اعلان وب پشتیبانی نمی‌کند", "err");
    return false;
  }
  if (VAPID_KEY.startsWith("PASTE_")) {
    console.error("notifications.js: VAPID_KEY را از Firebase Console جایگزین کن.");
    showToast("اعلان‌ها هنوز روی سرور تنظیم نشده", "err");
    return false;
  }

  const messaging = await getMessagingSafe();
  if (!messaging) {
    showToast("مرورگر شما از اعلان وب پشتیبانی نمی‌کند", "err");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      if (permission === "denied") {
        showToast("اجازه اعلان داده نشد. از تنظیمات مرورگر می‌تونی بعداً فعالش کنی", "err");
      }
      return false;
    }

    // همون سرویس‌ورکر اصلی سایت (sw.js) پیام‌های پس‌زمینه‌ی FCM رو هم مدیریت
    // می‌کنه، تا دو سرویس‌ورکر جدا روی یک origin با هم تداخل نکنن.
    const registration = await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) {
      showToast("دریافت توکن اعلان ناموفق بود", "err");
      return false;
    }

    await setDoc(tokenDocRef(user.uid, token), {
      token,
      createdAt: serverTimestamp(),
      ua: navigator.userAgent || "",
      origin: location.origin
    });

    localStorage.removeItem(REMIND_KEY);
    showToast("اعلان‌ها با موفقیت فعال شد");
    return true;
  } catch (e) {
    console.error("enablePushNotifications failed", e);
    showToast("فعال‌سازی اعلان با خطا مواجه شد", "err");
    return false;
  }
}

// وقتی سایت باز است و پیامی می‌رسد، مرورگر خودش نوتیف سیستمی نشان نمی‌دهد —
// این هندلر یک toast داخل صفحه نشان می‌دهد و با کلیک به لینک هدایت می‌کند.
export async function initForegroundMessages() {
  const messaging = await getMessagingSafe();
  if (!messaging) return;
  onMessage(messaging, payload => {
    const title = payload.notification?.title || payload.data?.title || "نیو مووی";
    const body = payload.notification?.body || payload.data?.body || "";
    const link = payload.fcmOptions?.link || payload.data?.link;
    showToast(body ? `${title} — ${body}` : title);
    if (link) {
      const toast = document.querySelector(".toast-wrap .toast:last-child");
      if (toast) {
        toast.style.cursor = "pointer";
        toast.addEventListener("click", () => { location.href = link; }, { once: true });
      }
    }
  });
}

// یادآوری محدود: فقط برای کاربرانی که وارد حساب شده‌اند و هنوز نه اجازه داده‌اند
// نه رد کرده‌اند (permission === "default")، حداکثر هر چند روز یک‌بار.
export function initNotificationReminder() {
  watchVisitor(user => {
    if (!user) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    const last = Number(localStorage.getItem(REMIND_KEY) || 0);
    if (Date.now() - last < REMIND_INTERVAL_MS) return;
    localStorage.setItem(REMIND_KEY, String(Date.now()));
    setTimeout(showNotifBanner, 4000);
  });
}

function showNotifBanner() {
  if (document.getElementById("notifReminderBanner")) return;
  if (!("Notification" in window) || Notification.permission !== "default") return;
  const bar = document.createElement("div");
  bar.id = "notifReminderBanner";
  bar.className = "notif-reminder";
  bar.innerHTML = `
    <span>می‌خوای از فیلم و سریال‌های جدید باخبر بشی؟</span>
    <div class="notif-reminder-actions">
      <button type="button" id="notifReminderYes" class="btn btn-primary">فعال کن</button>
      <button type="button" id="notifReminderNo" class="btn btn-ghost">بعداً</button>
    </div>`;
  document.body.appendChild(bar);
  requestAnimationFrame(() => bar.classList.add("show"));
  const close = () => { bar.classList.remove("show"); setTimeout(() => bar.remove(), 300); };
  document.getElementById("notifReminderYes").addEventListener("click", async () => { await enablePushNotifications(); close(); });
  document.getElementById("notifReminderNo").addEventListener("click", close);
}
