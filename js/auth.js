import { auth, db } from "./firebase-init.js";
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showToast } from "./ui.js";

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

export async function googleSignIn() {
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    const { blocked } = await upsertVisitorProfile(cred.user);
    if (blocked) {
      await signOut(auth);
      showToast("حساب شما مسدود شده و امکان ورود ندارید", "err");
      return null;
    }
    return cred.user;
  } catch (e) {
    if (e.code !== "auth/popup-closed-by-user") showToast("ورود با گوگل ناموفق بود", "err");
    return null;
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
