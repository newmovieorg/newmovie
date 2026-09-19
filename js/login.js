import { LOGO_SVG } from "./chrome.js";
import { googleSignIn, emailSignIn, emailSignUp, handleRedirectResult, authErrorMessage, currentVisitor } from "./auth.js";
import { setButtonLoading } from "./ui.js";

document.getElementById("loginBrand").innerHTML = LOGO_SVG + `<span class="brand-text">نیو<span class="accent">مووی</span></span>`;

const params = new URLSearchParams(location.search);
const redirectTo = params.get("redirect") || "index.html";

function goBack() {
  location.href = redirectTo;
}

// Already logged in? Nothing to do here.
if (currentVisitor()) goBack();

// ---- Tabs ----
const tabs = document.querySelectorAll(".auth-tab");
const forms = { login: document.getElementById("loginForm"), signup: document.getElementById("signupForm") };
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    Object.entries(forms).forEach(([key, form]) => form.style.display = key === tab.dataset.tab ? "" : "none");
  });
});

function showResult(errEl, result) {
  if (result.pending) return; // redirecting to Google, page will reload
  if (result.error) {
    errEl.textContent = authErrorMessage(result.error);
    return;
  }
  if (result.user) goBack();
}

// ---- Login ----
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("loginSubmitBtn");
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";
  setButtonLoading(btn, true, "در حال ورود...");
  const result = await emailSignIn(
    document.getElementById("loginEmail").value.trim(),
    document.getElementById("loginPassword").value
  );
  setButtonLoading(btn, false);
  showResult(errEl, result);
});

// ---- Signup ----
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("signupSubmitBtn");
  const errEl = document.getElementById("signupError");
  errEl.textContent = "";
  setButtonLoading(btn, true, "در حال ثبت‌نام...");
  const result = await emailSignUp(
    document.getElementById("signupEmail").value.trim(),
    document.getElementById("signupPassword").value,
    document.getElementById("signupName").value.trim()
  );
  setButtonLoading(btn, false);
  showResult(errEl, result);
});

// ---- Google ----
document.getElementById("googleBtn").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const errEl = document.getElementById("googleError");
  errEl.textContent = "";
  setButtonLoading(btn, true, "در حال اتصال...");
  const result = await googleSignIn();
  setButtonLoading(btn, false);
  showResult(errEl, result);
});

// ---- Completing a redirect-based Google sign-in (popup fallback) ----
(async () => {
  const result = await handleRedirectResult();
  if (result) showResult(document.getElementById("googleError"), result);
})();
