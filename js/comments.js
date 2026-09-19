import { db } from "./firebase-init.js";
import {
  collection, addDoc, getDocs, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { STAR_FILLED, STAR_OUTLINE, showToast, setButtonLoading } from "./ui.js";
import { watchVisitor } from "./auth.js";

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function timeAgo(ts) {
  const date = ts?.seconds ? new Date(ts.seconds * 1000) : new Date();
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "همین الان";
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} روز پیش`;
  return date.toLocaleDateString("fa-IR");
}

function starsHTML(rating, size = 13) {
  let out = "";
  for (let i = 1; i <= 5; i++) {
    const filled = i <= rating;
    out += `<span style="width:${size}px;height:${size}px;display:inline-flex;color:${filled ? "var(--brand)" : "var(--paper-faint)"}">${filled ? STAR_FILLED : STAR_OUTLINE}</span>`;
  }
  return out;
}

function loginPromptHTML(message) {
  return `
    <div class="login-required">
      <p>${message}</p>
      <a class="btn btn-primary login-prompt-btn" href="login.html?redirect=${encodeURIComponent(location.href)}">ورود / ثبت‌نام</a>
    </div>`;
}

// ---------------- Comments + rating ----------------

export async function fetchComments(movieId) {
  const snap = await getDocs(query(collection(db, "comments"), where("movieId", "==", movieId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export function renderRatingSummary(elId, comments) {
  const box = document.getElementById(elId);
  if (!box) return;
  if (!comments.length) {
    box.innerHTML = `<p class="empty-note" style="padding:0 0 18px;text-align:right;">هنوز نظری ثبت نشده. اولین نفر باش.</p>`;
    return;
  }
  const avg = comments.reduce((s, c) => s + (c.rating || 0), 0) / comments.length;
  box.innerHTML = `
    <div class="rating-summary">
      <strong>${avg.toFixed(1)}</strong>
      <div>${starsHTML(Math.round(avg), 16)}</div>
      <span>از ${comments.length} نظر</span>
    </div>`;
}

export function renderComments(elId, comments) {
  const box = document.getElementById(elId);
  if (!box) return;
  box.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div class="comment-head">
        <strong>${escapeHTML(c.name)}</strong>
        <div class="comment-stars">${starsHTML(c.rating)}</div>
        <span class="comment-time">${timeAgo(c.createdAt)}</span>
      </div>
      <p>${escapeHTML(c.text)}</p>
    </div>
  `).join("");
}

// Mounts the comment form (or a "sign in to comment" prompt) into `containerId`,
// and keeps it in sync as the visitor logs in/out.
export function mountCommentWidget(containerId, movieId, onSubmitted) {
  const container = document.getElementById(containerId);
  if (!container) return;

  watchVisitor((user) => {
    if (!user) {
      container.innerHTML = loginPromptHTML("برای ثبت نظر و امتیاز باید با حساب گوگل وارد شوی.");
      return;
    }
    container.innerHTML = `
      <form class="review-form" id="commentForm">
        <div class="field"><label>ثبت نظر و امتیاز شما (به نام ${escapeHTML(user.displayName || user.email)})</label></div>
        <div class="star-input" id="commentStars"></div>
        <div class="field"><textarea id="commentText" maxlength="800" placeholder="نظرت رو بنویس..."></textarea></div>
        <button type="submit" class="btn btn-primary" id="commentSubmitBtn">ثبت نظر</button>
      </form>`;

    const starsBox = document.getElementById("commentStars");
    const form = document.getElementById("commentForm");
    const textInput = document.getElementById("commentText");
    const submitBtn = document.getElementById("commentSubmitBtn");

    let value = 0;
    starsBox.innerHTML = Array.from({ length: 5 }).map((_, i) => `
      <button type="button" class="star-pick" data-v="${i + 1}" aria-label="${i + 1} ستاره">${STAR_OUTLINE}</button>
    `).join("");
    const starBtns = [...starsBox.querySelectorAll(".star-pick")];
    const paint = (v) => starBtns.forEach(b => {
      const filled = +b.dataset.v <= v;
      b.innerHTML = filled ? STAR_FILLED : STAR_OUTLINE;
      b.classList.toggle("active", filled);
    });
    starBtns.forEach(b => {
      b.addEventListener("mouseenter", () => paint(+b.dataset.v));
      b.addEventListener("mouseleave", () => paint(value));
      b.addEventListener("click", () => { value = +b.dataset.v; paint(value); });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = textInput.value.trim();
      if (!text || !value) {
        showToast("امتیاز و متن نظر الزامی است", "err");
        return;
      }
      setButtonLoading(submitBtn, true, "در حال ثبت...");
      try {
        await addDoc(collection(db, "comments"), {
          movieId, userId: user.uid, name: user.displayName || user.email || "کاربر",
          rating: value, text: text.slice(0, 800), createdAt: serverTimestamp()
        });
        textInput.value = "";
        value = 0; paint(0);
        showToast("نظر شما ثبت شد");
        onSubmitted?.();
      } catch (err) {
        showToast(err.code === "permission-denied" ? "حساب شما مسدود شده است" : "خطا در ثبت نظر", "err");
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  });
}

// ---------------- Q&A ----------------

export async function fetchQuestions(movieId) {
  const snap = await getDocs(query(collection(db, "questions"), where("movieId", "==", movieId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export function renderQuestions(elId, questions) {
  const box = document.getElementById(elId);
  if (!box) return;
  box.innerHTML = questions.length
    ? questions.map(q => `
      <div class="qna-item">
        <div class="qna-q">
          <strong>${escapeHTML(q.name)}</strong>
          <span class="comment-time">${timeAgo(q.createdAt)}</span>
        </div>
        <p class="qna-question">${escapeHTML(q.question)}</p>
        ${q.answered
          ? `<div class="qna-answer"><span>پاسخ نیو مووی</span><p>${escapeHTML(q.answer)}</p></div>`
          : `<span class="qna-pending">در انتظار پاسخ</span>`}
      </div>
    `).join("")
    : `<p class="empty-note" style="padding:0 0 18px;text-align:right;">هنوز سوالی پرسیده نشده.</p>`;
}

export function mountQuestionWidget(containerId, movieId, onSubmitted) {
  const container = document.getElementById(containerId);
  if (!container) return;

  watchVisitor((user) => {
    if (!user) {
      container.innerHTML = loginPromptHTML("برای پرسیدن سوال باید با حساب گوگل وارد شوی.");
      return;
    }
    container.innerHTML = `
      <form class="review-form" id="questionForm">
        <div class="field"><label>سوالت رو بپرس (به نام ${escapeHTML(user.displayName || user.email)})</label></div>
        <div class="field"><textarea id="questionText" maxlength="400" placeholder="سوالت درباره این فیلم/سریال..."></textarea></div>
        <button type="submit" class="btn btn-ghost" id="questionSubmitBtn">ارسال سوال</button>
      </form>`;

    const form = document.getElementById("questionForm");
    const textInput = document.getElementById("questionText");
    const submitBtn = document.getElementById("questionSubmitBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const question = textInput.value.trim();
      if (!question) {
        showToast("متن سوال الزامی است", "err");
        return;
      }
      setButtonLoading(submitBtn, true, "در حال ارسال...");
      try {
        await addDoc(collection(db, "questions"), {
          movieId, userId: user.uid, name: user.displayName || user.email || "کاربر",
          question: question.slice(0, 400), answer: null, answered: false, createdAt: serverTimestamp()
        });
        textInput.value = "";
        showToast("سوال شما ثبت شد");
        onSubmitted?.();
      } catch (err) {
        showToast(err.code === "permission-denied" ? "حساب شما مسدود شده است" : "خطا در ثبت سوال", "err");
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  });
}
