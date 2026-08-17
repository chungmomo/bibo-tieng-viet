/* Cấu hình Firebase Web App.
   Lấy giá trị tại: Firebase Console > Project settings > General >
   "Your apps" > chọn app Web (biểu tượng </>) > SDK setup and configuration.

   Đây KHÔNG phải là bí mật cần giấu — an toàn khi để công khai trong mã
   nguồn, vì quyền đọc/ghi dữ liệu thực sự được kiểm soát bởi Firestore
   Security Rules (xem firestore.rules), không phải bởi các giá trị bên dưới.
   Nhớ bật Authentication (Email/Password) và tạo Firestore Database trước
   khi dùng — xem hướng dẫn trong README.md. */
export const firebaseConfig = {
  apiKey: "AIzaSyAv-xYVlV6diCwVgHxtyejzHDJGU7sysmg",
  authDomain: "bibo-tieng-viet.firebaseapp.com",
  projectId: "bibo-tieng-viet",
  storageBucket: "bibo-tieng-viet.firebasestorage.app",
  messagingSenderId: "901087425442",
  appId: "1:901087425442:web:4f067707c0e27ce22db8fb",
};
