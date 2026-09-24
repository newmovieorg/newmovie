const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// این تنها گیت امنیتی واقعی برای «ارسال به همه» است — چون این تابع به همه‌ی
// توکن‌های ذخیره‌شده در فایراستور دسترسی کامل دارد، فقط کسی که سندش در
// admins/{uid} وجود دارد (دقیقاً همان قانونی که پنل ادمین برای ورود چک می‌کند)
// اجازه‌ی فراخوانی آن را دارد.
async function assertAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "برای این عملیات باید وارد حساب ادمین باشی.");
  }
  const snap = await db.collection("admins").doc(context.auth.uid).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError("permission-denied", "این حساب دسترسی ادمین ندارد.");
  }
}

exports.sendNotificationToAll = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const title = String(data?.title || "").trim();
  const body = String(data?.body || "").trim();
  const link = String(data?.link || "").trim() || "/";
  if (!title || !body) {
    throw new functions.https.HttpsError("invalid-argument", "عنوان و متن اعلان الزامی است.");
  }

  // توکن‌ها به‌صورت زیرمجموعه‌ی هر کاربر ذخیره شده‌اند: visitors/{uid}/fcmTokens/{tokenId}
  // — collectionGroup همه‌ی آن‌ها را در کل دیتابیس یک‌جا برمی‌گرداند.
  const tokensSnap = await db.collectionGroup("fcmTokens").get();
  const tokenDocs = tokensSnap.docs;
  const tokens = tokenDocs.map(d => d.data().token).filter(Boolean);

  if (!tokens.length) {
    return { successCount: 0, failureCount: 0, totalTokens: 0, removedInvalidTokens: 0 };
  }

  const messageBase = {
    notification: { title, body },
    webpush: {
      notification: { icon: "/favicon-180.png", badge: "/favicon-32.png" },
      fcmOptions: { link }
    },
    data: { title, body, link }
  };

  let successCount = 0;
  let failureCount = 0;
  const invalidTokenRefs = [];

  // sendEachForMulticast حداکثر ۵۰۰ توکن در هر بار فراخوانی قبول می‌کند.
  const CHUNK = 500;
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunkTokens = tokens.slice(i, i + CHUNK);
    const chunkDocs = tokenDocs.slice(i, i + CHUNK);
    const res = await admin.messaging().sendEachForMulticast({ tokens: chunkTokens, ...messageBase });
    successCount += res.successCount;
    failureCount += res.failureCount;
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          invalidTokenRefs.push(chunkDocs[idx].ref);
        }
      }
    });
  }

  // توکن‌های نامعتبر/منقضی را حذف می‌کنیم تا دفعه‌ی بعد لیست ارسال تمیز بماند.
  const BATCH = 450;
  for (let i = 0; i < invalidTokenRefs.length; i += BATCH) {
    const batch = db.batch();
    invalidTokenRefs.slice(i, i + BATCH).forEach(ref => batch.delete(ref));
    await batch.commit();
  }

  return { successCount, failureCount, totalTokens: tokens.length, removedInvalidTokens: invalidTokenRefs.length };
});
