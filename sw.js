// نسخه‌ی compat فایربیس چون این فایل یک سرویس‌ورکر کلاسیک است (importScripts)،
// نه یک ماژول ES — نمی‌تواند مستقیم از js/firebase-config.js با import استفاده کند.
// این مقادیر عمومی و غیرمحرمانه‌ی وب‌اپ هستند (دقیقاً همان‌هایی که در
// js/firebase-config.js هست)؛ اگر تنظیمات پروژه را عوض کردی، اینجا را هم به‌روز کن.
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA584r4R-1-r9IwceWzH6cNzN0WOu7DZ9M",
  authDomain: "new-movie-396bc.firebaseapp.com",
  projectId: "new-movie-396bc",
  storageBucket: "new-movie-396bc.firebasestorage.app",
  messagingSenderId: "599794057590",
  appId: "1:599794057590:web:8d1a5bee6f8e1bf9507a57"
});

// همین سرویس‌ورکر (که کش سایت را هم مدیریت می‌کند) پیام‌های پس‌زمینه‌ی FCM را
// هم دریافت می‌کند — عمداً یک سرویس‌ورکر جدا برای firebase-messaging نساختیم
// تا با این یکی روی یک origin رقابت نکنند (فقط آخرین ثبت‌شده کنترل fetch را
// در دست می‌گیرد و ممکن بود کش/آفلاین سایت را خراب کند).
const messaging = firebase.messaging.isSupported() ? firebase.messaging() : null;
if (messaging) {
  messaging.onBackgroundMessage(payload => {
    const title = payload.notification?.title || payload.data?.title || "نیو مووی";
    const body = payload.notification?.body || payload.data?.body || "";
    const link = payload.fcmOptions?.link || payload.data?.link || "./";
    self.registration.showNotification(title, {
      body,
      icon: "./favicon-180.png",
      badge: "./favicon-32.png",
      data: { link },
      dir: "rtl",
      lang: "fa"
    });
  });
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const link = event.notification.data?.link || "./";
  const targetUrl = new URL(link, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientsList => {
      for (const client of clientsList) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

const CACHE_NAME = "newmovie-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./favicon.svg",
  "./favicon-180.png",
  "./favicon-512.png",
  "./manifest.webmanifest",
  "./offline.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match("./offline.html")))
  );
});