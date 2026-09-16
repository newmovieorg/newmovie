# سینماتک — سایت معرفی فیلم و سریال

## ساختار پروژه
```
movie-site/
├── index.html              صفحه اصلی (هیرو + لیست فیلم‌ها)
├── movie.html               صفحه جزئیات هر فیلم
├── style.css                 استایل مشترک کل سایت
├── js/
│   ├── firebase-config.js   تنظیمات فایربیس (باید پر کنی)
│   ├── site.js               منطق صفحه اصلی
│   └── movie-detail.js       منطق صفحه جزئیات
└── admin-panel-7k2q3/        پنل ادمین (مسیر مخفی — این پوشه را رنیم هم می‌توانی بکنی)
    ├── index.html             صفحه ورود
    ├── dashboard.html         پنل مدیریت
    └── admin.js               منطق ورود + مدیریت داده‌ها
```

## مرحله ۱: تنظیمات Firebase
۱. در Firebase Console پروژه‌ات را باز کن.
۲. از منوی سمت چپ **Build > Firestore Database** را بساز (Start in production mode).
۳. از منوی **Build > Authentication**، روش **Email/Password** را فعال کن و از تب Users یک کاربر ادمین (ایمیل + رمز) دستی اضافه کن — این تنها راه ورود به پنله، ثبت‌نام عمومی وجود ندارد.
۴. از **Project settings > General > Your apps**، یک Web App بساز و مقادیر config را کپی کن.
۵. مقادیر را داخل `js/firebase-config.js` جایگزین کن.

## مرحله ۲: قوانین امنیتی Firestore (خیلی مهم)
در Firestore > Rules این قانون را جایگزین کن تا فقط کاربر لاگین‌شده بتواند بنویسد و همه بتوانند بخوانند:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /movies/{movieId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /site/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## مرحله ۳: تست محلی
چون از ماژول‌های JS استفاده شده، باید با یک سرور محلی ساده اجرا شود (باز کردن مستقیم فایل با file:// کار نمی‌کند):
```
cd movie-site
npx serve .
```
یا با افزونه Live Server در VS Code.

## مرحله ۴: دیپلوی روی Vercel (رایگان)
۱. این پوشه را در یک ریپوی گیت‌هاب آپلود کن.
۲. در vercel.com با گیت‌هاب وارد شو و پروژه را import کن.
۳. چون سایت استاتیک است (بدون فریم‌ورک)، Vercel نیازی به تنظیم build ندارد — Deploy را بزن.
۴. آدرس نهایی چیزی شبیه `your-site.vercel.app` خواهد بود.

## مرحله ۵: مخفی نگه داشتن پنل ادمین
- پوشه `admin-panel-7k2q3` را می‌توانی به هر اسم دلخواه دیگری رنیم کنی (هرچه غیرقابل‌حدس‌تر بهتر).
- از هیچ صفحه‌ای در سایت اصلی به آن لینک نده.
- امنیت اصلی از Firebase Authentication تأمین می‌شود، نه فقط مخفی بودن آدرس — پس حتی اگر آدرس لو برود، بدون ایمیل/رمز درست کسی وارد نمی‌شود.
- برای امنیت بیشتر می‌توانی از Vercel یک **Password Protection** یا **Deployment Protection** هم روی همین ساب‌مسیر فعال کنی (در پلن‌های بالاتر Vercel موجود است؛ در پلن رایگان صرفاً به Firebase Auth تکیه کن).

## نکات
- فیلدهای لینک پوستر/تریلر باید URL مستقیم به یک تصویر یا صفحه یوتیوب باشند (خودت میزبان عکس نیستی، فقط لینک ذخیره می‌شود).
- برای هاست عکس پوستر رایگان می‌توانی از سرویس‌هایی مثل imgbb.com یا همان لینک IMDb/TMDB استفاده کنی.
