import { auth, db } from "./firebase-init.js";
import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Best-effort only: a visitor's IP is self-reported by their own browser via a
// public API, never verified server-side (Firestore rules have no access to
// the request's real IP). Treat this as a UX signal, not real IP blocking.
async function fetchIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

function splitName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

const ERROR_MESSAGES = {
  "auth/unauthorized-domain": "این دامنه در Firebase Console مجاز نشده (Authentication → Settings → Authorized domains).",
  "auth/operation-not-allowed": "روش ورود با گوگل در Firebase Console فعال نشده (Authentication → Sign-in method).",
  "auth/popup-blocked": "مرورگر پنجره ورود رو مسدود کرد؛ در حال امتحان روش جایگزین...",
  "auth/network-request-failed": "مشکل در اتصال اینترنت.",
  "auth/user-not-found": "حسابی با این ایمیل پیدا نشد.",
  "auth/wrong-password": "رمز عبور اشتباه است.",
  "auth/invalid-credential": "ایمیل یا رمز عبور اشتباه است.",
  "auth/email-already-in-use": "این ایمیل قبلاً ثبت‌نام کرده؛ از تب ورود استفاده کن.",
  "auth/weak-password": "رمز عبور باید حداقل ۶ کاراکتر باشد.",
  "auth/invalid-email": "فرمت ایمیل نامعتبر است.",
  "auth/too-many-requests": "تعداد تلاش‌ها زیاد بود؛ کمی بعد دوباره امتحان کن.",
};

export function authErrorMessage(e) {
  return ERROR_MESSAGES[e?.code] || `ورود ناموفق بود (${e?.code || "خطای نامشخص"})`;
}

async function upsertVisitorProfile(user) {
  const ref = doc(db, "visitors", user.uid);
  const ip = await fetchIP();
  const { firstName, lastName } = splitName(user.displayName);
  const base = {
    email: user.email || "", name: user.displayName || "", firstName, lastName,
    photoURL: user.photoURL || "", ip,
  };
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...base, blocked: false, createdAt: serverTimestamp(), lastLoginAt: serverTimestamp() });
    return { blocked: false };
  }
  if (snap.data().blocked) return { blocked: true };
  await updateDoc(ref, { ...base, lastLoginAt: serverTimestamp() });
  return { blocked: false };
}

// Returns { user } on success, or { error } — never throws, so callers can
// always show something useful instead of a bare "failed".
async function finishSignIn(user) {
  try {
    const { blocked } = await upsertVisitorProfile(user);
    if (blocked) {
      await signOut(auth);
      return { error: { code: "auth/blocked", message: "حساب شما مسدود شده و امکان ورود ندارید" } };
    }
    return { user };
  } catch (e) {
    return { error: e };
  }
}

export async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(auth, provider);
    return await finishSignIn(cred.user);
  } catch (e) {
    if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") {
      return { error: null }; // user backed out, nothing to show
    }
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
      // Popups are commonly blocked on mobile browsers / in-app webviews.
      // Redirect flow continues after a full page reload — see handleRedirectResult().
      await signInWithRedirect(auth, provider);
      return { pending: true };
    }
    return { error: e };
  }
}

// Call once on page load (login page) to complete a signInWithRedirect flow.
export async function handleRedirectResult() {
  try {
    const cred = await getRedirectResult(auth);
    if (!cred) return null;
    return await finishSignIn(cred.user);
  } catch (e) {
    return { error: e };
  }
}

export async function emailSignIn(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return await finishSignIn(cred.user);
  } catch (e) {
    return { error: e };
  }
}

export async function emailSignUp(email, password, name) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    return await finishSignIn(cred.user);
  } catch (e) {
    return { error: e };
  }
}

export function visitorSignOut() {
  return signOut(auth);
}

export function watchVisitor(callback) {
  return onAuthStateChanged(auth, callback);
}

export function currentVisitor() {
  return auth.currentUser;
}
