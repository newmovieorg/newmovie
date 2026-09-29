import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);

// کش دائمی (IndexedDB) — بدون این، هر رفتن به یه صفحه (حتی برگشتن به همون صفحه‌ای
// که همین الان دیدی) یه رفت‌وبرگشت کامل به سرور فایراستور می‌خواست، چون این یه
// سایت چندصفحه‌ایه (نه SPA) و هر ناوبری یعنی جاوااسکریپت از صفر اجرا می‌شه.
// با این، دفعه‌ی دوم به بعد دیتا فوری از روی دیسک میاد و همزمان در پس‌زمینه
// آپدیت می‌شه — اگه مرورگر/حالت پرایویت پشتیبانی نکنه، خودش بی‌صدا به حالت
// حافظه‌ی معمولی برمی‌گرده (سایت خراب نمی‌شه، فقط این بهینه‌سازی غیرفعال می‌مونه).
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  console.error("Firestore persistence unavailable, falling back to memory-only cache", e);
  db = getFirestore(app);
}
export { db };

export const auth = getAuth(app);
