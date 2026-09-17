import { db } from "./firebase-init.js";
import {
  collection, addDoc, getDocs, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { STAR_FILLED, STAR_OUTLINE, showToast, setButtonLoading } from "./ui.js";

const NAME_KEY = "newmovie_guest_name";

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
  box.innerHTML = comments.length
    ? comments.map(c => `
      <div class="comment-item">
        <div class="comment-head">
          <strong>${escapeHTML(c.name)}</strong>
          <div class="comment-stars">${starsHTML(c.rating)}</div>
          <span class="comment-time">${timeAgo(c.createdAt)}</span>
        </div>
        <p>${escapeHTML(c.text)}</p>
      </div>
    `).join("")
    : "";
}

export function initCommentForm({ movieId, starsElId, formElId, nameElId, textElId, submitBtnId, onSubmitted }) {
  const starsBox = document.getElementById(starsElId);
  const form = document.getElementById(formElId);
  const nameInput = document.getElementById(nameElId);
  const textInput = document.getElementById(textElId);
  const submitBtn = document.getElementById(submitBtnId);

  nameInput.value = localStorage.getItem(NAME_KEY) || "";

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
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    if (!name || !text || !value) {
      showToast("نام، امتیاز و متن نظر الزامی است", "err");
      return;
    }
    setButtonLoading(submitBtn, true, "در حال ثبت...");
    try {
      localStorage.setItem(NAME_KEY, name);
      await addDoc(collection(db, "comments"), {
        movieId, name: name.slice(0, 40), rating: value, text: text.slice(0, 800),
        createdAt: serverTimestamp()
      });
      textInput.value = "";
      value = 0;
      paint(0);
      showToast("نظر شما ثبت شد");
      onSubmitted?.();
    } catch (err) {
      showToast("خطا در ثبت نظر", "err");
    } finally {
      setButtonLoading(submitBtn, false);
    }
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

export function initQuestionForm({ movieId, formElId, nameElId, textElId, submitBtnId, onSubmitted }) {
  const form = document.getElementById(formElId);
  const nameInput = document.getElementById(nameElId);
  const textInput = document.getElementById(textElId);
  const submitBtn = document.getElementById(submitBtnId);

  nameInput.value = localStorage.getItem(NAME_KEY) || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const question = textInput.value.trim();
    if (!name || !question) {
      showToast("نام و متن سوال الزامی است", "err");
      return;
    }
    setButtonLoading(submitBtn, true, "در حال ارسال...");
    try {
      localStorage.setItem(NAME_KEY, name);
      await addDoc(collection(db, "questions"), {
        movieId, name: name.slice(0, 40), question: question.slice(0, 400),
        answer: null, answered: false, createdAt: serverTimestamp()
      });
      textInput.value = "";
      showToast("سوال شما ثبت شد");
      onSubmitted?.();
    } catch (err) {
      showToast("خطا در ثبت سوال", "err");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}
