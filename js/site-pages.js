import { renderChrome } from "./chrome.js";
import { loadSiteContent, renderFaqItems, safeUrl } from "./site-content.js";
import { PERSON_ICON } from "./ui.js";

renderChrome();

const page = document.body.dataset.page;
const root = document.getElementById("sitePage");

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || "";
}

function renderContent(content) {
  setText("siteTagline", content.siteTagline);
  setText("aboutTitle", content.aboutTitle);
  setText("aboutBody", content.aboutBody);
  setText("aboutMission", content.aboutMission);
  setText("contactTitle", content.contactTitle);
  setText("contactBody", content.contactBody);
  setText("contactEmail", content.contactEmail);
  setText("contactPhone", content.contactPhone);
  setText("contactAddress", content.contactAddress);
  setText("faqIntro", content.siteTagline);

  const email = document.getElementById("contactEmailLink");
  if (email) {
    email.href = content.contactEmail ? `mailto:${content.contactEmail}` : "#";
    email.textContent = content.contactEmail || "ایمیل هنوز تنظیم نشده";
  }
  const phone = document.getElementById("contactPhoneLink");
  if (phone) {
    phone.href = content.contactPhone ? `tel:${content.contactPhone.replace(/[^\d+]/g, "")}` : "#";
    phone.textContent = content.contactPhone || "شماره تماس هنوز تنظیم نشده";
  }
  const telegram = document.getElementById("telegramLink");
  if (telegram) {
    const url = safeUrl(content.telegramUrl);
    telegram.href = url || "#";
    telegram.hidden = !url;
  }
  const instagram = document.getElementById("instagramLink");
  if (instagram) {
    const url = safeUrl(content.instagramUrl);
    instagram.href = url || "#";
    instagram.hidden = !url;
  }
  const faq = document.getElementById("faqList");
  if (faq) faq.innerHTML = renderFaqItems(content.faqItems || []);

  // صفحه‌ی «درباره سازنده»
  setText("creatorName", content.creatorName || "ناشناس");
  setText("creatorRole", content.creatorRole);
  setText("creatorBio", content.creatorBio);
  const photoBox = document.getElementById("creatorPhoto");
  if (photoBox) {
    photoBox.innerHTML = safeUrl(content.creatorPhoto)
      ? `<img src="${safeUrl(content.creatorPhoto)}" alt="${content.creatorName || ""}" onerror="this.remove()">`
      : PERSON_ICON;
  }
  const socialLinks = [
    ["creatorInstagramLink", content.creatorInstagram],
    ["creatorTelegramLink", content.creatorTelegram],
    ["creatorTwitterLink", content.creatorTwitter],
    ["creatorYoutubeLink", content.creatorYoutube],
    ["creatorLinkedinLink", content.creatorLinkedin],
    ["creatorWebsiteLink", content.creatorWebsite]
  ];
  const socialWrap = document.getElementById("creatorSocial");
  let anySocial = false;
  socialLinks.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const url = safeUrl(value);
    el.href = url || "#";
    el.hidden = !url;
    if (url) anySocial = true;
  });
  if (socialWrap) socialWrap.hidden = !anySocial;
}

loadSiteContent().then(renderContent).catch(() => renderContent({}));

if (page === "contact") {
  document.getElementById("contactForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const content = document.getElementById("contactEmailLink")?.textContent;
    const name = document.getElementById("contactName").value.trim();
    const message = document.getElementById("contactMessage").value.trim();
    if (!content || content.includes("تنظیم نشده")) return;
    const subject = encodeURIComponent(`پیام از سایت نیو مووی — ${name || "بازدیدکننده"}`);
    window.location.href = `mailto:${content}?subject=${subject}&body=${encodeURIComponent(message)}`;
  });
}
