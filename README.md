# VietKid 👑

Website học tiếng Việt song ngữ **Việt – Nhật** dành cho bé (khoảng 6–8
tuổi), có phát âm, tập viết, từ vựng theo chủ đề, trò chơi và hệ thống
sao/huy hiệu để khuyến khích bé học mỗi ngày. Avatar đa dạng (công chúa,
hoàng tử, siêu anh hùng, robot, thú cưng...) để hợp cả bé trai lẫn bé gái.

## Kiến trúc

Đây là **1 trang web tĩnh duy nhất** (HTML + CSS + JavaScript thuần, không
build tool, không framework):

- **Hosting**: GitHub Pages — chỉ phục vụ file tĩnh, miễn phí.
- **Dữ liệu**: [Firebase](https://firebase.google.com) —
  - **Authentication** (email/mật khẩu): phụ huynh đăng nhập 1 lần trên
    thiết bị, sau đó bé tự do chọn hồ sơ và học mà không cần đăng nhập lại.
    Để đơn giản, người dùng chỉ cần nhập **tên đăng nhập tùy ý + mật khẩu**
    (không cần email thật) — app tự sinh 1 email nội bộ từ tên đăng nhập để
    dùng với Firebase Auth bên dưới. Vì vậy **không có tính năng khôi phục
    mật khẩu qua email** — nhắc phụ huynh ghi nhớ tên đăng nhập/mật khẩu.
  - **Firestore**: lưu hồ sơ bé + tiến trình học (điểm, sao, huy hiệu),
    đồng bộ qua nhiều thiết bị.
- **Nội dung học** (bảng chữ cái, từ vựng): file JSON tĩnh trong `data/`,
  không cần Firestore — sửa thêm từ mới chỉ cần sửa JSON.
- **Phát âm**: Web Speech API có sẵn trong trình duyệt (giọng `vi-VN` /
  `ja-JP`).

Không còn backend Python/Flask/SQLite — toàn bộ chạy trong trình duyệt.

## Cấu trúc thư mục

```
VietKid/
├── index.html                 # Shell trang (header/nav/footer + #app)
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── app.js              # Router (hash) + toàn bộ giao diện
│       ├── auth.js             # Đăng nhập/đăng ký phụ huynh (Firebase Auth)
│       ├── store.js             # Đọc/ghi hồ sơ + tiến trình (Firestore)
│       ├── data.js              # Tải data/*.json
│       ├── firebase-init.js     # Khởi tạo Firebase App/Auth/Firestore
│       ├── firebase-config.js   # ⚠️ Cấu hình Firebase — bạn cần điền
│       ├── speech.js            # Phát âm (Web Speech API)
│       └── sound.js             # Âm thanh + hiệu ứng confetti
├── data/
│   ├── alphabet.json           # 29 chữ cái tiếng Việt
│   └── vocabulary.json         # 11 chủ đề từ vựng song ngữ Việt-Nhật
└── firestore.rules             # Quy tắc bảo mật Firestore (dán vào Console)
```

## Thiết lập Firebase (chỉ cần làm 1 lần)

1. Vào **[console.firebase.google.com](https://console.firebase.google.com)**
   → **Add project** → đặt tên (VD: `vietkid`) → tạo project (có thể tắt
   Google Analytics, không cần thiết).
2. **Bật đăng nhập**: menu trái → *Build* → **Authentication** → tab
   *Sign-in method* → bật **Email/Password**.
3. **Tạo cơ sở dữ liệu**: menu trái → *Build* → **Firestore Database** →
   **Create database** → chọn chế độ *Production mode* → chọn khu vực gần
   bạn (VD: `asia-northeast1` cho Nhật).
4. **Áp dụng quy tắc bảo mật**: trong Firestore → tab **Rules** → xoá nội
   dung mặc định, dán toàn bộ nội dung file [`firestore.rules`](firestore.rules)
   vào → **Publish**.
5. **Lấy cấu hình Web App**: menu trái → biểu tượng ⚙️ → **Project
   settings** → mục *Your apps* → bấm biểu tượng **`</>`** (Web) → đặt tên
   app → **Register app**. Firebase sẽ hiện 1 object `firebaseConfig`.
6. Mở file [`assets/js/firebase-config.js`](assets/js/firebase-config.js)
   trong project này, thay các giá trị `YOUR_...` bằng giá trị Firebase vừa
   cho bạn, rồi lưu lại.

> Các giá trị trong `firebase-config.js` (apiKey, projectId...) **không
> phải bí mật** — an toàn khi để công khai trên GitHub, vì quyền truy cập
> dữ liệu thật sự được kiểm soát bởi Firestore Rules ở bước 4.

## Chạy thử ở máy local

Vì dùng ES modules (`import`/`export`), cần mở qua 1 server tĩnh (không
mở trực tiếp bằng cách nhấp đúp file, trình duyệt sẽ chặn `import` với
giao thức `file://`):

```bash
python3 -m http.server 8000
```

Rồi mở **http://localhost:8000**.

## Đưa lên GitHub Pages

1. Đẩy code lên nhánh `main` của repo GitHub.
2. Vào repo trên GitHub → **Settings** → **Pages**.
3. Mục **Build and deployment** → *Source*: **Deploy from a branch** →
   *Branch*: `main` / `(root)` → **Save**.
4. Sau ít phút, trang sẽ có ở `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

## Thêm nội dung mới

Muốn thêm từ vựng hoặc chủ đề mới? Chỉ cần chỉnh sửa
`data/vocabulary.json` (thêm object chủ đề mới hoặc thêm từ vào chủ đề có
sẵn) — không cần sửa code. Cấu trúc 1 chủ đề:

```json
{
  "id": "ten_khong_dau_duy_nhat",
  "name": "Tên tiếng Việt",
  "name_ja": "日本語の名前",
  "icon": "🎈",
  "color": "#RRGGBB",
  "words": [
    {"vi": "từ tiếng Việt", "ja": "日本語", "emoji": "🎈"}
  ]
}
```

Muốn thêm avatar cho hồ sơ bé? Sửa mảng `AVATARS` ở đầu file
[`assets/js/app.js`](assets/js/app.js).

## Tính năng

- **Đăng nhập phụ huynh** (tên đăng nhập tùy ý + mật khẩu, không cần
  email) + nhiều hồ sơ bé/gia đình, đồng bộ qua Firestore trên mọi thiết bị.
- **Bảng chữ cái tiếng Việt**: 29 chữ cái, lật thẻ xem ví dụ + nghe phát âm.
- **🔍 Tìm chữ cái**: bấm chọn hết các ô chứa đúng chữ cái mục tiêu giữa
  các chữ dễ nhầm lẫn (a/ă/â, o/ô/ơ...) — luyện nhận diện mặt chữ.
- **✍️ Tập viết chữ**: tô theo hình chữ mờ trên canvas, tự động chấm điểm
  theo độ phủ và cho sao.
- **Từ vựng theo 14 chủ đề**: Gia đình, Con vật, Màu sắc, Số đếm, Đồ ăn,
  Trường học, Cơ thể, Thời tiết, Cảm xúc, Phương tiện, Nghề nghiệp, Thiên
  nhiên, Đồ dùng trong nhà, Thể thao & Sở thích (147 từ song ngữ Việt-Nhật).
- **4 trò chơi** cho mỗi chủ đề: 🧩 Nối cặp, ❓ Đố vui trắc nghiệm, 🔡 Ghép
  chữ thành từ, 👂 Nghe và đoán.
- **Sao ⭐ + huy hiệu 🎖️**, trang **Thành tích** tổng hợp tiến trình.
- **Rồng Con 🐉**: linh vật động viên bé trên trang chủ.
- Giao diện rực rỡ, chữ to, hoạt hình bo tròn, confetti + âm thanh khen
  thưởng — phù hợp tâm lý trẻ nhỏ; responsive cho điện thoại/tablet/PC.

## Ý tưởng phát triển thêm

- Xác thực email khi đăng ký, đăng nhập bằng Google.
- Trang quản lý cho phụ huynh: xoá hồ sơ, xem thống kê thời gian học.
- Thêm ngôn ngữ giao diện (Anh, Việt) ngoài Việt-Nhật hiện tại.
- Thêm dạng trò chơi mới (nghe - chọn hình, nối câu...).
