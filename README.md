# نیو مووی — Movie/Series Platform

## به‌روزرسانی‌های اخیر (بازطراحی + نظرات/دانلود)
- برند کامل از «سینماتک» به «نیو مووی» تغییر کرد (همه‌جای سایت و پنل ادمین).
- سیستم کلیرنس هدر شیشه‌ای اصلاح شد (دیگه هیچ‌جا با محتوا/هیرو تداخل نداره)، و بک‌دراپ هیرو روی موبایل درست cover می‌شه بدون کراپ اشتباه.
- همه ایموجی‌ها (🔍، ★، ☆) با آیکون SVG واقعی جایگزین شدن؛ دکمه‌های async (پنل ادمین) الان state لودینگ واقعی دارن.
- جستجوی هدر در موبایل که کامل غیرقابل‌دسترس بود، درست شد.
- صفحه جزئیات: بخش «نظرات و امتیاز کاربران»، بخش «پرسش و پاسخ»، و فیلد «لینک‌های دانلود» (چند کیفیت/حجم) اضافه شد — همراه با تب جدید «نظرات و سوالات» در پنل ادمین برای پاسخ‌دادن و مدیریت/حذف.
- کالکشن‌های جدید Firestore: `comments`، `questions`، `admins`؛ Security Rules به‌روز شد (بخش «قوانین امنیتی» رو حتماً ببین — یک مرحله دستی لازم داره).

## چیزهایی که عوض شد (نسخه جدید)
- برند کاملاً بازطراحی شد: مشکی/سفید/سبز-لیمویی (`#CDFA0A`)، لوگوی SVG ارائه‌شده دقیقاً بدون تغییر در پث/رنگ استفاده شده.
- هدر شیشه‌ای (Glass) شناور با انیمیشن کوچک‌شدن هنگام اسکرول + ناوبری پایین صفحه مخصوص موبایل.
- Hero تبدیل به کاروسل شد (چند اسلاید، اتوپلی، سوایپ، دکمه قبلی/بعدی، ایندیکیتور).
- صفحات جدید: `movies.html` و `series.html` (جستجو/فیلتر ژانر و سال/مرتب‌سازی/نمایش بیشتر) و `favorites.html`.
- صفحه جزئیات کامل‌تر شد: بک‌دراپ، متادیتای بیشتر (کشور، زبان، کارگردان، بازیگران)، موارد مشابه، اشتراک‌گذاری، افزودن به علاقه‌مندی‌ها.
- Skeleton Loading به‌جای متن ساده "در حال بارگذاری".
- کش سبک با `sessionStorage` (فایل `js/cache.js`) تا وقتی بین صفحات جابه‌جا می‌شوی، داده‌های قبلاً گرفته‌شده دوباره از فایربیس درخواست نشن (اعتبار: ۵ دقیقه، بعد از ذخیره در پنل ادمین به‌صورت خودکار پاک می‌شود تا تغییرات فوراً دیده بشه).
- پنل ادمین: تب‌بندی شد (نمای کلی / فیلم‌ها و سریال‌ها / مدیریت هیرو / ژانرها)، فرم‌ها کامل‌تر شدن، Toast برای موفقیت/خطا، مودال تأیید قبل از حذف، وضعیت فعال/غیرفعال برای فیلم‌ها و هیروها.

## چیزهایی که عمداً متفاوت از درخواست اولیه پیاده شد (و چرا)
چون سایت روی **GitHub Pages / Vercel به‌صورت استاتیک** (بدون فریم‌ورک و بدون مرحله Build) میزبانی می‌شه تا رایگان و ساده بمونه:
- به‌جای **React + Framer Motion**، از HTML/CSS/JS خالص + انیمیشن‌های CSS استفاده شد. اضافه‌کردن React/Framer Motion نیاز به ابزار Build (Webpack/Vite) داره که deploy روی گیت‌هاب پیجز رو پیچیده‌تر می‌کنه.
- **SEO با Server-Side Rendering واقعی امکان‌پذیر نیست** چون هاست فقط فایل استاتیک سرو می‌کنه. در عوض، تگ‌های `title`، `meta description`، Open Graph، `canonical` و `JSON-LD` با جاوااسکریپت در لحظه بارگذاری صفحه جزئیات ست می‌شن (برای گوگل که جاوااسکریپت اجرا می‌کنه کافیه، ولی برخی کرالرهای ساده‌تر شبکه‌های اجتماعی ممکنه فقط نسخه اولیه HTML رو ببینن).
- به‌جای Pagination واقعی Firestore (که نیاز به Index و پیچیدگی بیشتر داره)، فیلتر/جستجو/مرتب‌سازی سمت کلاینت روی داده‌های واقعی انجام می‌شه و دکمه «نمایش بیشتر» به‌صورت تکه‌تکه (۱۸ تایی) نمایش می‌ده. برای حجم محتوای یک سایت شخصی این روش سریع‌تر و ساده‌تره؛ اگر تعداد فیلم‌ها به چند صد رسید، باید به Pagination واقعی فایربیس مهاجرت کرد.
- **Favorites** چون سایت سیستم اکانت برای بازدیدکننده‌ها نداره (فقط ادمین لاگین می‌کنه)، در `localStorage` مرورگر خودشون ذخیره می‌شه، نه در فایربیس.
- **Popular** بر اساس فیلد اختیاری `popularity` (اگر پر بشه) یا در غیر این صورت `rating` مرتب می‌شه، چون سایت آمار بازدید واقعی (Views/Analytics) رد نمی‌کنه؛ اضافه‌کردن آمار واقعی نیاز به Google Analytics یا شمارنده سمت سرور داره.
- هیچ داده دمو/فیک اضافه نشد؛ اگر مجموعه‌ای (مثلاً فیلم/سریال/هیرو) خالی باشه، همون بخش با پیام خالی مناسب نمایش داده می‌شه یا اصلاً رندر نمی‌شه.

## ساختار پروژه
```
movie-site/
├── index.html              صفحه اصلی (Hero Carousel + بخش‌های مختلف)
├── movies.html              لیست فیلم‌ها با فیلتر/جستجو
├── series.html              لیست سریال‌ها با فیلتر/جستجو
├── movie.html                صفحه جزئیات (برای فیلم و سریال هردو)
├── favorites.html            علاقه‌مندی‌های محلی کاربر
├── style.css                  استایل کامل (برند مشکی/سفید/لیمویی)
├── js/
│   ├── firebase-config.js    تنظیمات پروژه فایربیس
│   ├── firebase-init.js       مقداردهی اولیه مشترک (app/db/auth)
│   ├── chrome.js               هدر + ناوبری پایین صفحه + لوگو (منبع واحد)
│   ├── cache.js                 کش sessionStorage با انقضا
│   ├── ui.js                     Toast، Skeleton، Favorites، Share، کارت فیلم، آیکون‌های ستاره، loading state دکمه‌ها
│   ├── comments.js               نظر+امتیاز و پرسش‌وپاسخ صفحه جزئیات (جدید)
│   ├── home.js                   منطق صفحه اصلی و کاروسل هیرو
│   ├── list-page.js              منطق مشترک صفحات movies/series
│   ├── movie-detail.js           منطق صفحه جزئیات
│   └── favorites-page.js         منطق صفحه علاقه‌مندی‌ها
└── admin-panel-7k2q3/         پنل ادمین (مسیر مخفی)
    ├── index.html               ورود
    ├── dashboard.html            پنل تب‌دار
    └── admin.js                   منطق کامل CRUD
```

## مدل داده Firestore

### Collection: `movies`
| فیلد | نوع | توضیح |
|---|---|---|
| title | string | عنوان (الزامی) |
| originalTitle | string | عنوان اصلی (اختیاری) |
| type | "movie" \| "series" | نوع محتوا |
| genre | string | ژانر |
| year | string | سال ساخت |
| runtime | number | مدت‌زمان به دقیقه |
| rating | number | امتیاز از ۱۰ |
| votes | number | تعداد رأی (اختیاری) |
| popularity | number | برای مرتب‌سازی «محبوب» (اختیاری) |
| country / language / director / cast | string | اطلاعات تکمیلی |
| synopsis | string | خلاصه داستان |
| posterUrl / backdropUrl / trailerUrl | string | لینک‌ها |
| downloadLinks | array | لیست لینک‌های دانلود، هرکدام `{label, size, url}` (مثلاً کیفیت ۱۰۸۰p با حجم ۱.۸GB) |
| active | boolean | فعال/مخفی از سایت |
| createdAt | timestamp | خودکار |

### Collection: `comments` (نظر + امتیاز بازدیدکننده‌ها، جدید)
movieId, name, rating (عدد ۱ تا ۵), text, createdAt.
فعلاً بدون نیاز به لاگین ثبت می‌شه (فقط با وارد کردن نام) — وقتی لاگین گوگل بازدیدکننده (مرحله بعد) اضافه بشه، می‌شه نام/عکس رو خودکار از اکانت گوگل پر کرد و ثبت نظر رو به کاربر لاگین‌کرده محدود کرد.

### Collection: `questions` (پرسش و پاسخ، جدید)
movieId, name, question, answer (تا وقتی ادمین پاسخ نداده `null`), answered (boolean), createdAt, answeredAt.
ادمین از تب «نظرات و سوالات» در پنل به هرکدوم پاسخ می‌ده؛ فقط ادمین اجازه ویرایش/حذف داره.

### Collection: `admins` (جدید — برای تشخیص ادمین در Security Rules)
هر سند به آیدی همون `uid` کاربر ادمین در Firebase Authentication ساخته می‌شه (محتوای سند مهم نیست، فقط وجودش کافیه). چون بعد از این مرحله بازدیدکننده‌ها هم می‌تونن با گوگل وارد بشن، دیگه نمی‌شه صرفاً «کاربر لاگین‌کرده» رو ادمین در نظر گرفت؛ باید مشخص بشه *کدوم* کاربر لاگین‌شده ادمینه.
**یک‌بار به‌صورت دستی لازمه:** برو Firebase Console → Authentication → پیدا کن UID اکانت ادمین (همون ایمیل/رمزی که در `admin-panel-7k2q3` وارد می‌کنی) → بعد در Firestore Database یک کالکشن به اسم `admins` بساز و یک سند با ID دقیقاً همون UID بساز (محتوا فرقی نداره، مثلاً یک فیلد `role: "admin"`).

### Collection: `heroes`
title, kicker, description, year, genre, order (عدد، ترتیب نمایش در کاروسل), backdropUrl, movieId (اختیاری، لینک به یک movie), active.

### Collection: `genres`
فقط فیلد `name` — برای autocomplete در فرم فیلم و ثبات نام ژانرها.

## قوانین امنیتی Firestore (به‌روزشده — نسخه جدید با نظرات/سوالات)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /movies/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /heroes/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /genres/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /admins/{uid} {
      allow read, write: if false; // فقط از کنسول فایربیس دستی اضافه/حذف می‌شه
    }

    match /comments/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['movieId','name','rating','text','createdAt'])
        && request.resource.data.movieId is string && request.resource.data.movieId.size() > 0
        && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 40
        && request.resource.data.text is string && request.resource.data.text.size() > 0 && request.resource.data.text.size() <= 800
        && request.resource.data.rating is number && request.resource.data.rating >= 1 && request.resource.data.rating <= 5;
      allow update: if false;
      allow delete: if isAdmin();
    }

    match /questions/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['movieId','name','question','answer','answered','createdAt'])
        && request.resource.data.movieId is string && request.resource.data.movieId.size() > 0
        && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 40
        && request.resource.data.question is string && request.resource.data.question.size() > 0 && request.resource.data.question.size() <= 400
        && request.resource.data.answer == null
        && request.resource.data.answered == false;
      allow update: if isAdmin()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['answer','answered','answeredAt']);
      allow delete: if isAdmin();
    }
  }
}
```
این رو در Firebase Console → Firestore Database → Rules جایگزین کن و Publish بزن. **نکته مهم:** قانون قدیمی `movies`/`heroes`/`genres` از `request.auth != null` (یعنی «هرکسی که لاگین کرده») به `isAdmin()` تغییر کرد. این تغییر لازمه چون در مرحله بعد بازدیدکننده‌ها هم می‌تونن با گوگل لاگین کنن؛ اگر همون قانون قدیمی می‌موند، هر بازدیدکننده‌ی لاگین‌کرده می‌تونست فیلم/هیرو/ژانر اضافه یا حذف کنه. پس حتماً کالکشن `admins` رو طبق توضیح بالا بساز، وگرنه بعد از Publish کردن این Rules، خود پنل ادمین هم دیگه نمی‌تونه ذخیره کنه.

**درباره امنیت نظرات/سوالات بدون لاگین:** چون فعلاً ثبت نظر/سوال نیاز به لاگین نداره (هرکسی با وارد کردن یک نام می‌تونه ثبت کنه)، این یعنی سایت در برابر اسپم محافظت کامل نداره — Rules بالا فقط جلوی داده بدشکل/خیلی طولانی رو می‌گیره، نه بات‌های تکراری. اگر بعد از راه‌اندازی اسپم دیدی، دو گزینه داری: (۱) در مرحله بعد که لاگین گوگل اضافه می‌شه، ثبت نظر/سوال رو هم به لاگین‌بودن محدود کنیم، یا (۲) یک reCAPTCHA/App Check جدا اضافه کنیم.

## دیپلوی
سایت الان روی GitHub Pages در آدرس زیر بالاست:
`https://code416org-a11y.github.io/newmovie/`

برای آپدیت بعد از هر تغییر: فایل‌های جدید رو جایگزین فایل‌های قبلی در ریپوی گیت‌هاب کن (drag & drop یا `git push`)، گیت‌هاب پیجز خودش ظرف چند دقیقه سایت رو آپدیت می‌کنه.

## نکات امنیتی
- هیچ Secret جدیدی داخل فرانت‌اند گذاشته نشده؛ `apiKey` فایربیس برای اپ‌های وب ساخته شده که عمومی باشه و امنیت واقعی از Firestore Rules (فقط کاربر لاگین‌شده بنویسه) تأمین می‌شه.
- تمام مقادیر متنی قبل از قرار گرفتن در `innerHTML` مستقیماً از Firestore میان؛ چون این یک پنل تک‌کاربره (فقط خودت) هست نه سیستم چندکاربره با ورودی عمومی، ریسک XSS محدوده به دیتایی که خودت وارد می‌کنی.
- پنل ادمین پشت Firebase Authentication (ایمیل/رمز) قفل است؛ مسیر مخفی (`admin-panel-7k2q3`) فقط یک لایه اضافه‌ست، نه جایگزین احراز هویت.
