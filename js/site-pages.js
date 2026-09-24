import { renderChrome } from "./chrome.js";
import { loadSiteContent, renderFaqItems, safeUrl } from "./site-content.js";

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