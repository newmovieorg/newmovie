# نیو مووی — وب‌سایت معرفی فیلم و سریال

سایت استاتیک (HTML/CSS/JS خالص، بدون فریم‌ورک) برای معرفی فیلم و سریال، با Firebase (Firestore + Auth) به‌عنوان دیتابیس.

## ساختار
- صفحات اصلی سایت: `index.html`, `movies.html`, `series.html`, `movie.html`, `favorites.html`, `login.html` و صفحات اطلاعاتی (`about.html`, `contact.html`, `faq.html`, `privacy.html`, `terms.html`)
- منطق مشترک در `js/` (چیدمان هدر/فوتر در `chrome.js`، دیتای فایربیس در `data.js`/`firebase-init.js`، نظرات/امتیاز در `comments.js`)
- پنل مدیریت جدا و مخفی در `admin-panel-7k2q3/` — این مسیر را قبل از انتشار به یک نام دیگر (و غیرقابل‌حدس) تغییر بده
- تنظیمات پروژه فایربیس در `js/firebase-config.js`

## اجرای محلی
چون از ماژول‌های ES استفاده شده، فایل‌ها را مستقیم در مرورگر باز نکن؛ با یک سرور استاتیک ساده اجرا کن، مثلاً:

```
npx serve .
```

یا هر هاست استاتیک رایگان دیگری (Cloudflare Pages، Netlify، Vercel، GitHub Pages) که فایل‌های این پوشه را همان‌طور که هست سرو کند.

## نکته امنیتی پنل ادمین
دسترسی به `admin-panel-7k2q3/dashboard.html` علاوه بر لاگین، به وجود سند کاربر در مجموعه‌ی `admins/{uid}` در Firestore هم نیاز دارد. قبل از استفاده، قوانین امنیتی (Security Rules) فایربیس را چک و پابلیش کن.

## اعلان وب (FCM) و لایک/آنلایک
کد کامل و واقعی است، ولی چند مرحله (کلید VAPID، دیپلوی Cloud Function، قوانین
Firestore) نیاز به کنسول فایربیس دارد — چک‌لیست کامل در `FCM-AND-LIKES-SETUP.md`.
