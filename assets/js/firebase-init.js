import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {
  /* một số trình duyệt (chế độ ẩn danh) không cho lưu persistence — bỏ qua */
});

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
});
