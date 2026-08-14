/* Đăng nhập / đăng ký cho phụ huynh bằng Firebase Auth (email + mật khẩu).
   Sau khi phụ huynh đăng nhập trên 1 thiết bị, bé có thể tự do chọn hồ sơ
   và chơi mà không cần nhập lại mật khẩu mỗi lần (phiên đăng nhập được
   trình duyệt ghi nhớ). */
import { auth } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signUpParent(email, password) {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function signInParent(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutParent() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "Email này đã được đăng ký rồi.",
  "auth/invalid-email": "Email không hợp lệ.",
  "auth/weak-password": "Mật khẩu quá ngắn (cần ít nhất 6 ký tự).",
  "auth/user-not-found": "Không tìm thấy tài khoản với email này.",
  "auth/wrong-password": "Sai mật khẩu.",
  "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
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
        <input id="auth-email" class="text-input" type="email" autocomplete="email" placeholder="Email" style="margin-bottom:10px;">
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
        ${mode === "signin" ? '<p style="text-align:center;"><a href="#" id="auth-forgot">Quên mật khẩu?</a></p>' : ""}
      </div>`;

    document.getElementById("auth-switch").addEventListener("click", (e) => {
      e.preventDefault();
      mode = mode === "signin" ? "signup" : "signin";
      render();
    });

    const emailInput = document.getElementById("auth-email");
    const passwordInput = document.getElementById("auth-password");
    const submitBtn = document.getElementById("auth-submit");
    const errorEl = document.getElementById("auth-error");

    async function submit() {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      errorEl.style.display = "none";
      submitBtn.disabled = true;
      try {
        if (mode === "signin") await signInParent(email, password);
        else await signUpParent(email, password);
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

    const forgotLink = document.getElementById("auth-forgot");
    if (forgotLink) {
      forgotLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email) {
          alert("Bạn nhập email trước rồi bấm Quên mật khẩu nhé.");
          return;
        }
        try {
          await resetPassword(email);
          alert("Đã gửi email đặt lại mật khẩu, vui lòng kiểm tra hộp thư!");
        } catch (err) {
          alert(authErrorMessage(err));
        }
      });
    }
  }

  render();
}
