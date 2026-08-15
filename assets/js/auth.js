/* Đăng nhập / đăng ký cho phụ huynh bằng Firebase Auth.
   Để đơn giản cho phụ huynh (không cần có sẵn email), bé chỉ cần nhập 1
   "tên đăng nhập" tùy ý + mật khẩu — app tự sinh ra 1 email nội bộ
   (VD: "me.be" -> "me.be@vietkid.local") để dùng với Firebase Auth
   Email/Password bên dưới, không hiển thị ra ngoài.
   Sau khi đăng nhập trên 1 thiết bị, bé có thể tự do chọn hồ sơ và chơi
   mà không cần nhập lại (phiên đăng nhập được trình duyệt ghi nhớ). */
import { auth } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

function usernameToEmail(username) {
  let s = (username || "").trim().toLowerCase().replace(/đ/g, "d");
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
  return (s || "be") + "@vietkid.local";
}

export async function signUpParent(username, password) {
  await createUserWithEmailAndPassword(auth, usernameToEmail(username), password);
}

export async function signInParent(username, password) {
  await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
}

export async function signOutParent() {
  await signOut(auth);
}

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "Tên đăng nhập này đã có người dùng rồi, thử tên khác nhé.",
  "auth/weak-password": "Mật khẩu quá ngắn (cần ít nhất 6 ký tự).",
  "auth/user-not-found": "Không tìm thấy tài khoản với tên đăng nhập này.",
  "auth/wrong-password": "Sai mật khẩu.",
  "auth/invalid-credential": "Tên đăng nhập hoặc mật khẩu không đúng.",
  "auth/too-many-requests": "Bạn thử sai quá nhiều lần, vui lòng thử lại sau.",
  "auth/network-request-failed": "Lỗi kết nối mạng. Vui lòng thử lại.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    "Cấu hình Firebase chưa đúng — hãy kiểm tra assets/js/firebase-config.js.",
};

function authErrorMessage(err) {
  return ERROR_MESSAGES[err.code] || err.message || "Đã có lỗi xảy ra, vui lòng thử lại.";
}

/* Vẽ màn hình đăng nhập/đăng ký vào `container`. Không cần callback báo
   thành công — onAuthStateChanged ở app.js sẽ tự nhận ra và điều hướng. */
export function renderAuthGate(container) {
  let mode = "signin";

  function render() {
    container.innerHTML = `
      <div class="card-panel" style="margin-top:30px;">
        <h1 class="page-title" style="font-size:1.6rem;">👋 Chào mừng đến với VietKid!</h1>
        <p class="page-subtitle">${
          mode === "signin"
            ? "Phụ huynh đăng nhập để xem tiến trình học của bé"
            : "Tạo tài khoản để bắt đầu học cùng bé"
        }</p>
        <input id="auth-username" class="text-input" type="text" autocomplete="username" placeholder="Tên đăng nhập (tùy ý)" style="margin-bottom:10px;">
        <input id="auth-password" class="text-input" type="password" autocomplete="${
          mode === "signin" ? "current-password" : "new-password"
        }" placeholder="Mật khẩu (ít nhất 6 ký tự)" style="margin-bottom:10px;">
        <button class="btn btn-primary btn-block btn-lg" id="auth-submit">${
          mode === "signin" ? "Đăng nhập" : "Đăng ký"
        }</button>
        <p id="auth-error" style="color:var(--red); font-weight:700; display:none; margin-top:10px;"></p>
        <p style="text-align:center; margin-top:16px;">
          ${
            mode === "signin"
              ? 'Chưa có tài khoản? <a href="#" id="auth-switch">Đăng ký ngay</a>'
              : 'Đã có tài khoản? <a href="#" id="auth-switch">Đăng nhập</a>'
          }
        </p>
        ${
          mode === "signup"
            ? '<p class="page-subtitle" style="margin-top:4px;">⚠️ Không có email nên không thể khôi phục mật khẩu — bạn nhớ ghi lại tên đăng nhập và mật khẩu nhé!</p>'
            : ""
        }
      </div>`;

    document.getElementById("auth-switch").addEventListener("click", (e) => {
      e.preventDefault();
      mode = mode === "signin" ? "signup" : "signin";
      render();
    });

    const usernameInput = document.getElementById("auth-username");
    const passwordInput = document.getElementById("auth-password");
    const submitBtn = document.getElementById("auth-submit");
    const errorEl = document.getElementById("auth-error");

    async function submit() {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      errorEl.style.display = "none";
      if (!username) {
        errorEl.textContent = "Vui lòng nhập tên đăng nhập.";
        errorEl.style.display = "block";
        return;
      }
      submitBtn.disabled = true;
      try {
        if (mode === "signin") await signInParent(username, password);
        else await signUpParent(username, password);
      } catch (err) {
        errorEl.textContent = authErrorMessage(err);
        errorEl.style.display = "block";
      } finally {
        submitBtn.disabled = false;
      }
    }

    submitBtn.addEventListener("click", submit);
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  }

  render();
}
