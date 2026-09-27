// اجرا: node generate-sitemap.js
// این اسکریپت رو خودت (نه در مرورگر) هر وقت فیلم/سریال/بازیگر زیادی اضافه کردی
// اجرا کن تا sitemap.xml با همه‌ی صفحات فیلم/سریال/بازیگر واقعی آپدیت بشه —
// چون این‌ها از Firestore میان و یک فایل ثابت به‌تنهایی نمی‌تونه لیستشون کنه.
//
// پیش‌نیاز: یک کلید سرویس‌اکانت از Firebase Console → Project settings →
// Service accounts → Generate new private key، ذخیره‌شده با اسم
// serviceAccountKey.json کنار همین فایل (این فایل رو هرگز جایی پابلیک/گیت‌هاب
// public قرار نده — دسترسی کامل به دیتابیستو می‌ده).
//
// نصب پیش‌نیاز: npm install firebase-admin

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const BASE_URL = "https://newmovieorg.github.io/newmovie";

const STATIC_URLS = [
  { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
  { loc: `${BASE_URL}/movies.html`, changefreq: "daily", priority: "0.9" },
  { loc: `${BASE_URL}/series.html`, changefreq: "daily", priority: "0.9" },
  { loc: `${BASE_URL}/actors.html`, changefreq: "weekly", priority: "0.6" },
  { loc: `${BASE_URL}/about.html`, changefreq: "monthly", priority: "0.3" },
  { loc: `${BASE_URL}/contact.html`, changefreq: "monthly", priority: "0.3" },
  { loc: `${BASE_URL}/faq.html`, changefreq: "monthly", priority: "0.3" },
];

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  const urls = [...STATIC_URLS];

  const moviesSnap = await db.collection("movies").where("active", "==", true).get();
  moviesSnap.forEach(docSnap => {
    urls.push({ loc: `${BASE_URL}/movie.html?id=${docSnap.id}`, changefreq: "weekly", priority: "0.8" });
  });

  const actorsSnap = await db.collection("actors").get();
  actorsSnap.forEach(docSnap => {
    urls.push({ loc: `${BASE_URL}/actor.html?id=${docSnap.id}`, changefreq: "monthly", priority: "0.5" });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${escapeXml(u.loc)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join("\n") +
    `\n</urlset>\n`;

  fs.writeFileSync(path.join(__dirname, "sitemap.xml"), xml, "utf8");
  console.log(`sitemap.xml نوشته شد — ${urls.length} آدرس (${moviesSnap.size} فیلم/سریال فعال، ${actorsSnap.size} بازیگر).`);
  console.log("حالا این فایل رو روی هاست جایگزین نسخه‌ی قبلی کن.");
}

main().catch(err => { console.error("خطا:", err); process.exit(1); });
