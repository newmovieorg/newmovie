// لوگوی رسمی برند — دقیقاً همان SVG ارائه‌شده، بدون تغییر در path/رنگ/نسبت.
// اندازه نمایش با کلاس CSS .logo-mark کنترل می‌شود، فایل SVG اصلی دست‌نخورده می‌ماند.
import { visitorSignOut, watchVisitor } from "./auth.js";
import { watchCategories } from "./data.js";
import { confirmDialog } from "./ui.js";
import { enablePushNotifications, initForegroundMessages, initNotificationReminder } from "./notifications.js";
const LOGO_SVG = `<svg class="logo-mark" width="640" height="640" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="640" height="640" fill="#000000"/>
<path d="M 146.0,533.3 L 146.3,538.7 L 162.3,538.3 L 161.0,533.0 Z M 234.0,521.3 L 247.7,550.3 L 256.7,550.3 L 258.3,532.3 L 259.7,533.0 L 267.3,550.3 L 276.3,550.3 L 278.3,521.0 L 270.7,521.7 L 270.3,541.7 L 260.7,521.3 L 252.3,521.3 L 250.7,541.3 L 249.0,539.7 L 242.0,521.7 Z M 211.3,521.0 L 217.0,550.3 L 235.3,550.7 L 234.7,545.0 L 224.3,545.0 L 222.0,539.7 L 222.7,538.7 L 232.0,538.7 L 231.7,533.7 L 221.3,533.0 L 220.0,529.3 L 221.0,526.7 L 231.0,526.7 L 230.3,521.7 Z M 177.0,521.3 L 183.0,550.7 L 189.7,550.3 L 186.7,533.0 L 202.7,550.3 L 210.3,550.3 L 204.7,521.3 L 197.3,521.0 L 200.3,538.7 L 184.7,521.3 Z" fill="#ffffff" fill-rule="evenodd"/>
<path d="M 462.7,532.0 L 464.0,537.7 L 483.7,537.3 L 483.7,533.3 L 482.3,531.7 Z M 426.0,520.0 L 431.3,549.0 L 451.7,549.7 L 450.3,543.7 L 439.0,543.7 L 438.0,542.0 L 438.0,537.7 L 448.0,537.7 L 447.7,532.7 L 436.7,532.0 L 435.3,528.7 L 435.7,526.0 L 446.7,526.0 L 446.0,520.0 Z M 411.0,520.0 L 416.3,549.0 L 424.3,549.7 L 419.0,520.3 Z M 373.7,520.0 L 390.7,549.3 L 401.0,549.7 L 407.0,520.3 L 398.7,520.3 L 395.3,541.0 L 394.3,541.7 L 382.0,520.7 Z M 340.3,525.3 L 338.7,528.7 L 338.3,533.7 L 341.0,540.7 L 347.0,546.3 L 355.7,549.7 L 362.0,549.7 L 369.3,546.7 L 373.0,541.7 L 373.0,534.3 L 376.0,534.0 L 376.0,529.0 L 371.0,529.0 L 365.0,523.3 L 356.3,520.0 L 346.3,521.0 Z M 347.3,529.3 L 348.0,534.0 L 364.7,534.0 L 365.3,538.3 L 364.0,541.3 L 359.7,543.7 L 355.7,543.7 L 351.0,541.7 L 346.7,535.0 Z M 347.7,528.7 L 352.3,526.0 L 356.3,526.0 L 361.7,528.7 Z M 299.0,520.3 L 299.3,549.7 L 307.0,549.3 L 304.0,533.3 L 315.0,549.7 L 321.3,549.3 L 325.0,533.3 L 329.0,549.7 L 337.0,549.3 L 330.7,520.0 L 321.3,520.7 L 316.3,539.7 L 315.0,539.3 L 303.3,520.7 Z M 244.3,204.0 L 245.0,264.3 L 372.3,392.7 L 374.3,392.7 L 374.7,333.3 L 246.3,204.0 Z M 428.3,106.0 L 426.0,106.3 L 426.0,394.3 L 422.0,410.3 L 414.0,424.3 L 399.3,437.0 L 384.3,443.0 L 368.3,444.0 L 349.3,438.0 L 338.3,430.0 L 246.3,337.0 L 244.0,337.3 L 244.0,390.3 L 318.3,464.7 L 339.3,476.7 L 342.3,476.7 L 356.3,481.7 L 391.3,481.7 L 405.3,477.7 L 424.3,467.7 L 443.7,449.7 L 448.7,442.7 L 458.7,422.3 L 462.7,406.3 L 463.7,142.3 Z M 246.3,88.0 L 214.3,89.0 L 204.3,92.0 L 186.3,101.0 L 170.0,116.0 L 168.0,120.3 L 165.0,123.0 L 161.0,130.3 L 154.0,149.3 L 153.0,419.3 L 190.3,457.7 L 192.7,457.3 L 192.7,158.3 L 194.7,151.3 L 201.7,139.3 L 212.3,130.7 L 224.3,125.7 L 241.3,125.7 L 254.3,131.7 L 372.3,249.7 L 374.7,249.3 L 374.7,196.3 L 282.3,103.0 L 267.3,94.0 Z" fill="#cdfa0a" fill-rule="evenodd"/>
</svg>`;

const SEARCH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
const USER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`;

const HEADER_HTML = `
<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <a href="index.html" class="brand">
      ${LOGO_SVG}
      <span class="brand-text">نیو<span class="accent">مووی</span></span>
    </a>
    <nav class="header-nav">
      <a href="index.html">خانه</a>
      <a href="movies.html">فیلم‌ها</a>
      <a href="series.html">سریال‌ها</a>
      <a href="favorites.html">علاقه‌مندی‌ها</a>
    </nav>
    <div class="header-actions">
      <div class="account-box" id="accountBox">
        <button class="account-btn" id="accountBtn" aria-label="حساب کاربری">${USER_ICON}</button>
        <div class="account-menu" id="accountMenu"></div>
      </div>
      <div class="search-box">
        <input type="text" id="headerSearchInput" placeholder="جستجو...">
        <button id="headerSearchBtn" aria-label="جستجو">${SEARCH_ICON}</button>
      </div>
      <button class="menu-toggle" id="menuToggle" aria-label="باز کردن منو" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>`;

const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>`,
  movies: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/></svg>`,
  series: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8"/></svg>`,
  favorites: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.6-9.5-9.1C.8 8.6 2.3 5 6 5c2 0 3.3 1 4 2 .7-1 2-2 4-2 3.7 0 5.2 3.6 3.5 6.9C19 16.4 12 21 12 21z"/></svg>`,
  install: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></svg>`
};

const BOTTOM_NAV_HTML = `
<nav class="bottom-nav">
  <div class="bottom-nav-list">
    <a href="index.html" class="bottom-nav-item">${ICONS.home}<span>خانه</span></a>
    <a href="movies.html" class="bottom-nav-item">${ICONS.movies}<span>فیلم‌ها</span></a>
    <a href="series.html" class="bottom-nav-item">${ICONS.series}<span>سریال‌ها</span></a>
    <a href="favorites.html" class="bottom-nav-item">${ICONS.favorites}<span>علاقه</span></a>
    <a href="movies.html#search" class="bottom-nav-item" id="bottomNavSearch">${SEARCH_ICON}<span>جستجو</span></a>
  </div>
</nav>`;

const MOBILE_DRAWER_HTML = `
<div class="mobile-drawer-overlay" id="mobileDrawerOverlay"></div>
<aside class="mobile-drawer" id="mobileDrawer" aria-hidden="true">
  <div class="drawer-head">
    <a href="index.html" class="brand">${LOGO_SVG}<span class="brand-text">نیو<span class="accent">مووی</span></span></a>
    <button class="drawer-close" id="drawerClose" aria-label="بستن منو">×</button>
  </div>
  <div class="drawer-account" id="drawerAccount"><span class="drawer-account-icon">${USER_ICON}</span><div><strong id="drawerAccountName">حساب کاربری</strong><a href="login.html" id="drawerAccountAction">ورود یا ثبت‌نام</a></div></div>
  <nav class="drawer-nav" aria-label="منوی اصلی موبایل">
    <a href="index.html">${ICONS.home}<span>خانه</span></a>
    <a href="movies.html">${ICONS.movies}<span>همه فیلم‌ها</span></a>
    <a href="series.html">${ICONS.series}<span>همه سریال‌ها</span></a>
    <a href="favorites.html">${ICONS.favorites}<span>علاقه‌مندی‌ها</span></a>
    <a href="about.html"><span class="drawer-link-mark">i</span><span>درباره ما</span></a>
    <a href="contact.html"><span class="drawer-link-mark">✦</span><span>تماس با ما</span></a>
  </nav>
  <div class="drawer-divider"></div>
  <button class="drawer-install" id="installAppBtn" type="button">${ICONS.install}<span>نصب اپلیکیشن</span></button>
  <div class="drawer-divider"></div>
  <div class="drawer-section-title">ژانرها</div>
  <div class="drawer-genres" id="drawerGenres"><span class="drawer-muted">در حال بارگذاری ژانرها...</span></div>
  <div class="drawer-footer-links"><a href="faq.html">پرسش‌های متداول</a><a href="privacy.html">حریم خصوصی</a><a href="terms.html">قوانین</a></div>
</aside>`;

function initHeaderBehavior() {
  const header = document.getElementById("siteHeader");
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 20) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".header-nav a, .bottom-nav-item").forEach(a => {
    const href = (a.getAttribute("href") || "").split("?")[0];
    if (href === path) a.classList.add("active");
  });

  const searchInput = document.getElementById("headerSearchInput");
  const searchBtn = document.getElementById("headerSearchBtn");
  const goSearch = () => {
    const term = searchInput.value.trim();
    if (term) location.href = `movies.html?q=${encodeURIComponent(term)}`;
  };
  searchBtn?.addEventListener("click", goSearch);
  searchInput?.addEventListener("keydown", e => { if (e.key === "Enter") goSearch(); });

  initMobileDrawer();
  initAccountUI();
}

let deferredInstallPrompt = null;

function initMobileDrawer() {
  const header = document.getElementById("siteHeader");
  if (!header || document.getElementById("mobileDrawer")) return;
  header.insertAdjacentHTML("afterend", MOBILE_DRAWER_HTML);
  const drawer = document.getElementById("mobileDrawer");
  const overlay = document.getElementById("mobileDrawerOverlay");
  const toggle = document.getElementById("menuToggle");
  const close = document.getElementById("drawerClose");
  const setOpen = open => {
    drawer.classList.toggle("open", open);
    overlay.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    toggle?.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("drawer-open", open);
  };
  toggle?.addEventListener("click", () => setOpen(!drawer.classList.contains("open")));
  close?.addEventListener("click", () => setOpen(false));
  overlay?.addEventListener("click", () => setOpen(false));
  drawer.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  document.getElementById("installAppBtn")?.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      updateInstallButton();
    } else {
      window.alert("برای نصب، از منوی مرورگر گزینه «افزودن به صفحه اصلی» را انتخاب کنید.");
    }
    setOpen(false);
  });

  const genreBox = document.getElementById("drawerGenres");
  watchCategories(categories => {
    if (!genreBox) return;
    genreBox.innerHTML = categories.length
      ? categories.slice(0, 18).map(category => `<a href="movies.html?genre=${encodeURIComponent(category.id)}">${escapeText(category.name)}</a>`).join("")
      : `<span class="drawer-muted">هنوز ژانری ثبت نشده.</span>`;
  }, () => {});
}

function updateInstallButton() {
  const button = document.getElementById("installAppBtn");
  if (!button) return;
  button.querySelector("span").textContent = deferredInstallPrompt ? "نصب اپلیکیشن" : "افزودن به صفحه اصلی";
}

function updateDrawerAccount(user) {
  const name = document.getElementById("drawerAccountName");
  const action = document.getElementById("drawerAccountAction");
  const icon = document.querySelector(".drawer-account-icon");
  if (!name || !action || !icon) return;
  if (user) {
    const displayName = user.displayName || "کاربر";
    name.textContent = displayName;
    action.textContent = "خروج از حساب";
    action.href = "#logout";
    action.onclick = async event => {
      event.preventDefault();
      const ok = await confirmDialog("مطمئنی می‌خوای از حساب خارج بشی؟", "بله، خروج", "انصراف");
      if (!ok) return;
      await visitorSignOut();
      document.body.classList.remove("drawer-open");
      document.getElementById("mobileDrawer")?.classList.remove("open");
      document.getElementById("mobileDrawerOverlay")?.classList.remove("open");
    };
    icon.innerHTML = user.photoURL
      ? `<img src="${escapeText(user.photoURL)}" alt="" referrerpolicy="no-referrer">`
      : USER_ICON;
  } else {
    name.textContent = "حساب کاربری";
    action.textContent = "ورود یا ثبت‌نام";
    action.href = `login.html?redirect=${encodeURIComponent(location.href)}`;
    action.onclick = null;
    icon.innerHTML = USER_ICON;
  }
}

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function initAccountUI() {
  const btn = document.getElementById("accountBtn");
  const menu = document.getElementById("accountMenu");
  const box = document.getElementById("accountBox");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (box.classList.contains("logged-in")) {
      box.classList.toggle("menu-open");
      return;
    }
    location.href = `login.html?redirect=${encodeURIComponent(location.href)}`;
  });

  document.addEventListener("click", (e) => {
    if (box && !box.contains(e.target)) box.classList.remove("menu-open");
  });

  watchVisitor((user) => {
    if (user) {
      box.classList.add("logged-in");
      btn.innerHTML = user.photoURL
        ? `<img src="${user.photoURL}" alt="${user.displayName || ""}" referrerpolicy="no-referrer">`
        : USER_ICON;
      const notifGranted = ("Notification" in window) && Notification.permission === "granted";
      menu.innerHTML = `
        <div class="account-menu-name">${user.displayName || "کاربر"}</div>
        ${notifGranted ? "" : `<button type="button" id="accountEnableNotif">🔔 فعال‌سازی اعلان‌ها</button>`}
        <button type="button" id="accountLogoutBtn">خروج از حساب</button>`;
      document.getElementById("accountEnableNotif")?.addEventListener("click", async () => {
        await enablePushNotifications();
        box.classList.remove("menu-open");
      });
      document.getElementById("accountLogoutBtn").addEventListener("click", async () => {
        const ok = await confirmDialog("مطمئنی می‌خوای از حساب خارج بشی؟", "بله، خروج", "انصراف");
        if (!ok) return;
        await visitorSignOut();
        box.classList.remove("menu-open");
      });
      updateDrawerAccount(user);
    } else {
      box.classList.remove("logged-in", "menu-open");
      btn.innerHTML = USER_ICON;
      menu.innerHTML = "";
      updateDrawerAccount(null);
    }
  });
}

const FOOTER_HTML = `
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div class="footer-brand">${LOGO_SVG}<div><strong>نیو مووی</strong><span> ${new Date().getFullYear()} — ${"معرفی دقیق فیلم و سریال"}</span></div></div>
    <nav class="footer-links" aria-label="لینک‌های اطلاعاتی">
      <a href="about.html">درباره ما</a>
      <a href="contact.html">تماس با ما</a>
      <a href="faq.html">پرسش‌های متداول</a>
      <a href="privacy.html">حریم خصوصی</a>
      <a href="terms.html">قوانین استفاده</a>
    </nav>
    <p class="footer-note">نیو مووی فایل ویدیویی را روی سایت میزبانی نمی‌کند.</p>
  </div>
</footer>`;

const BACK_TO_TOP_HTML = `<button id="backToTopBtn" class="back-to-top" type="button" aria-label="بازگشت به بالای صفحه" hidden>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
</button>`;

function initBackToTop() {
  if (document.getElementById("backToTopBtn")) return;
  document.body.insertAdjacentHTML("beforeend", BACK_TO_TOP_HTML);
  const btn = document.getElementById("backToTopBtn");
  const onScroll = () => { btn.hidden = window.scrollY < 480; };
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

export function renderChrome() {
  const headerSlot = document.getElementById("app-header");
  const navSlot = document.getElementById("app-bottomnav");
  const footerSlot = document.getElementById("app-footer");
  if (headerSlot) headerSlot.outerHTML = HEADER_HTML;
  if (navSlot) navSlot.outerHTML = BOTTOM_NAV_HTML;
  if (footerSlot) footerSlot.outerHTML = FOOTER_HTML;
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "manifest.webmanifest";
    document.head.appendChild(manifest);
  }
  initHeaderBehavior();
  initBackToTop();
  initForegroundMessages();
  initNotificationReminder();
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButton();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updateInstallButton();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

export { LOGO_SVG };
