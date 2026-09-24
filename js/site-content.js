import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { escapeHTML } from "./ui.js";

export const DEFAULT_SITE_CONTENT = {
  siteTagline: "معرفی دقیق فیلم و سریال برای انتخاب بهتر",
  aboutTitle: "درباره نیو مووی",
  aboutBody: "نیو مووی یک مرجع فارسی برای کشف فیلم و سریال است؛ جایی برای دیدن اطلاعات، امتیاز، خلاصه داستان، تریلر و لینک‌های مرتبط با هر عنوان.",
  aboutMission: "هدف ما این است که قبل از شروع تماشا، اطلاعات مرتب و قابل اعتمادی در اختیار شما باشد.",
  contactTitle: "تماس با ما",
  contactBody: "برای پیشنهاد عنوان جدید، گزارش مشکل یا همکاری با ما در ارتباط باشید.",
  contactEmail: "hello@example.com",
  contactPhone: "",
  contactAddress: "",
  telegramUrl: "",
  instagramUrl: "",
  faqItems: [
    { question: "چطور یک فیلم را به علاقه‌مندی‌ها اضافه کنم؟", answer: "در صفحه جزئیات هر عنوان روی دکمه افزودن به علاقه‌مندی‌ها بزنید." },
    { question: "آیا نیو مووی فایل فیلم را میزبانی می‌کند؟", answer: "خیر. نیو مووی یک سایت معرفی و راهنمای محتواست و فایل ویدیویی را روی سایت میزبانی نمی‌کند." },
    { question: "چطور یک عنوان جدید پیشنهاد بدهم؟", answer: "از صفحه تماس با ما، عنوان و اطلاعات پیشنهادی خود را برای ما ارسال کنید." }
  ],
  lastUpdated: ""
};

export async function loadSiteContent() {
  try {
    const snapshot = await getDoc(doc(db, "siteSettings", "main"));
    if (!snapshot.exists()) return { ...DEFAULT_SITE_CONTENT };
    const data = snapshot.data() || {};
    return {
      ...DEFAULT_SITE_CONTENT,
      ...data,
      faqItems: Array.isArray(data.faqItems) && data.faqItems.length
        ? data.faqItems
        : DEFAULT_SITE_CONTENT.faqItems
    };
  } catch (error) {
    console.warn("site settings unavailable; using defaults", error);
    return { ...DEFAULT_SITE_CONTENT };
  }
}

export function safeUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

export function renderFaqItems(items) {
  return items.map(item => `
    <details class="faq-item">
      <summary>${escapeHTML(item.question || "")}</summary>
      <p>${escapeHTML(item.answer || "")}</p>
    </details>
  `).join("");
}