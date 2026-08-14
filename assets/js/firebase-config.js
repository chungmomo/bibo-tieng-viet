/* Cấu hình Firebase Web App.
   Lấy giá trị tại: Firebase Console > Project settings > General >
   "Your apps" > chọn app Web (biểu tượng </>) > SDK setup and configuration.

   Đây KHÔNG phải là bí mật cần giấu — an toàn khi để công khai trong mã
   nguồn, vì quyền đọc/ghi dữ liệu thực sự được kiểm soát bởi Firestore
   Security Rules (xem firestore.rules), không phải bởi các giá trị bên dưới.
   Nhớ bật Authentication (Email/Password) và tạo Firestore Database trước
   khi dùng — xem hướng dẫn trong README.md. */
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
