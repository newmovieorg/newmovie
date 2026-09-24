# راه‌اندازی اعلان (FCM) و لایک — چک‌لیست

این پروژه کد کامل و واقعی (نه Mock) برای اعلان وب و لایک/آنلایک را دارد، ولی
چهار مرحله هست که چون به کنسول فایربیس و دیپلوی نیاز دارند، باید خودت انجامشون
بدی — از بیرون این پروژه امکان انجامشون نیست.

## ۱) کلید VAPID را جایگزین کن (لازم برای اینکه اصلاً اعلان کار کند)
1. برو به Firebase Console → پروژه‌ی `new-movie-396bc` → آیکون چرخ‌دنده →
   Project settings → تب **Cloud Messaging**.
2. پایین صفحه بخش **Web configuration** → **Web Push certificates** → دکمه‌ی
   **Generate key pair** (اگر قبلاً نساخته باشی).
3. مقدار تولیدشده رو کپی کن و در فایل `js/notifications.js`، خط زیر رو با
   کلید واقعی جایگزین کن:
   ```js
   const VAPID_KEY = "PASTE_YOUR_FIREBASE_VAPID_KEY_HERE";
   ```
   تا وقتی این خط جایگزین نشده، دکمه‌ی «فعال‌سازی اعلان‌ها» یک پیام خطای
   واضح نشون می‌ده (نه رفتار ساختگی/Mock).

## ۲) Cloud Function ارسال اعلان را دیپلوی کن
دستورالعمل کامل در `functions/README.md` هست؛ خلاصه‌اش:
```
cd functions
npm install
cd ..
firebase deploy --only functions
```
نیازمند پلن Blaze (جزئیات در همون فایل).

## ۳) این قوانین را به Firestore Security Rules پروژه اضافه کن
این‌ها را در Firebase Console → Firestore Database → Rules اضافه کن (یا با
Firebase CLI پابلیش کن). دو مورد اول کاملاً جدید هستند و با چیزی تداخل ندارند؛
مورد سوم باید داخل match موجودِ `movies/{movieId}` تو ادغام بشه (نه اینکه یک
match دوم و جدا براش بسازی، چون Firestore Rules از دو match برای یک مسیر
پشتیبانی نمی‌کند).

```
// جدید — توکن‌های اعلان: هر کاربر فقط توکن‌های خودش را می‌نویسد/می‌خواند/پاک می‌کند.
// (Cloud Function با Admin SDK کار می‌کند و از این قوانین عبور می‌کند، پس محدودیتی
// برای ارسال دسته‌جمعی ایجاد نمی‌کند)
match /visitors/{uid}/fcmTokens/{tokenId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}

// جدید — لایک‌ها: هر کاربر فقط لایک خودش را می‌سازد/پاک می‌کند.
match /likes/{likeId} {
  allow read: if true;
  allow create: if request.auth != null
                && request.resource.data.userId == request.auth.uid
                && likeId == request.auth.uid + '_' + request.resource.data.movieId;
  allow delete: if request.auth != null
                && likeId == request.auth.uid + '_' + resource.data.movieId;
}
```

برای `movies/{movieId}`، داخل شرط `allow update` که همین الان داری، این را با
`||` اضافه کن تا کاربرِ واردشده فقط بتواند فیلد `likesCount` را عوض کند (نه هیچ
فیلد دیگری از فیلم را):
```
request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likesCount'])
```
یعنی اگر الان مثلاً این را داری:
```
allow update: if isAdmin();
```
می‌شود:
```
allow update: if isAdmin()
              || (request.auth != null
                  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likesCount']));
```

## ۴) تست کن
- با یک حساب کاربری واردشده، از منوی حساب (بالای هدر) روی «فعال‌سازی
  اعلان‌ها» بزن و اجازه بده.
- سند تازه‌ای باید زیر `visitors/{uid}/fcmTokens/` در Firestore ظاهر شود.
- از پنل ادمین → تب «ارسال اعلان»، یک اعلان تستی برای همه بفرست.
- برای تست اعلان در حالت بسته‌بودن سایت: تب مرورگر را ببند (یا حداقل از سایت
  خارج شو)، دوباره از پنل ادمین اعلان بفرست — باید به‌صورت نوتیف سیستمی مرورگر
  ظاهر شود و با کلیک، به لینک داده‌شده برود.

## نکته‌ی امنیتی مهم
اعلان «ارسال برای همه» فقط از سمت سرور (داخل Cloud Function) چک می‌کند که
فرستنده در `admins/{uid}` باشد — یعنی حتی اگر کسی کد پنل ادمین را دستکاری کند،
باز هم بدون حساب ادمین واقعی نمی‌تواند اعلان بفرستد.
