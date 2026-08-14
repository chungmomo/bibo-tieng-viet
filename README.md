# VietKid 👑

Website học tiếng Việt phong cách công chúa dành cho bé gái gốc Việt đang
sống ở Nhật (thiết kế cho bé khoảng 6–8 tuổi). Nội dung song ngữ
**Việt – Nhật**, có phát âm, trò chơi và hệ thống sao/huy hiệu để khuyến
khích bé học mỗi ngày.

## Tính năng

- **Hồ sơ riêng cho bé**: chọn tên + hình đại diện (công chúa, tiên, kỳ
  lân...), tiến trình được lưu lại giữa các lần học (SQLite).
- **Bảng chữ cái tiếng Việt**: 29 chữ cái, lật thẻ xem ví dụ + nghe phát âm.
- **✍️ Tập viết chữ**: bé dùng ngón tay/chuột tô theo hình chữ mờ trên
  canvas, tự động chấm điểm theo độ phủ và cho sao — luyện ghi nhớ mặt
  chữ trước khi tập viết thật trên giấy.
- **Từ vựng theo 9 chủ đề**: Gia đình, Con vật, Màu sắc, Số đếm, Đồ ăn,
  Trường học, Cơ thể, Thời tiết, Cảm xúc — mỗi từ có hình minh họa, nghĩa
  tiếng Nhật và nút nghe phát âm tiếng Việt / tiếng Nhật.
- **3 trò chơi** cho mỗi chủ đề:
  - 🧩 Nối cặp (trí nhớ)
  - ❓ Đố vui trắc nghiệm
  - 🔡 Ghép chữ cái thành từ
- **Sao ⭐ + huy hiệu 🎖️**: chấm điểm sau mỗi trò chơi, mở khóa huy hiệu khi
  "giỏi" một chủ đề hoặc đạt mốc sao.
- **Trang Thành tích**: tổng số sao, huy hiệu, tiến trình từng chủ đề.
- Giao diện tông hồng - công chúa (vương miện, lấp lánh, ruy băng), chữ to,
  hoạt hình bo tròn, hiệu ứng pháo giấy (confetti) và âm thanh khen thưởng
  — phù hợp tâm lý trẻ nhỏ.
- **Responsive**: dùng tốt trên điện thoại, máy tính bảng và máy tính để
  bàn (đã kiểm thử ở nhiều kích thước màn hình).

## Có 2 cách chạy

Dự án có **2 bản** dùng chung nội dung/giao diện, chọn bản phù hợp với nhu cầu:

### 1. Bản web app tĩnh — chạy ngay trong trình duyệt, không cần cài gì (khuyên dùng)

Chỉ có **1 file HTML duy nhất**: [`webapp/index.html`](webapp/index.html).
Không cần Python, không cần server — mở file này bằng trình duyệt
(Chrome/Edge/Safari) là chạy được ngay, kể cả **mở trực tiếp bằng cách
nhấp đúp vào file** (không cần internet, trừ font chữ trang trí).

- Tiến trình học (hồ sơ, sao, huy hiệu) được lưu bằng `localStorage` của
  trình duyệt trên máy đó.
- Muốn dùng trên điện thoại/máy tính khác: copy file `webapp/index.html`
  sang máy đó, hoặc host lên bất kỳ dịch vụ web tĩnh nào (GitHub Pages,
  Netlify...) rồi mở bằng link.

### 2. Bản server Flask — có API, lưu dữ liệu bằng SQLite

Dùng khi muốn nhiều thiết bị cùng truy cập một server và chia sẻ dữ liệu
qua mạng.

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Sau đó mở trình duyệt tại **http://localhost:5000**.

> Ghi chú: tính năng đọc chữ (phát âm) dùng Web Speech API có sẵn trong
> trình duyệt (Chrome/Edge/Safari). Nếu máy chưa có giọng đọc tiếng Việt,
> trình duyệt sẽ tự chọn giọng gần nhất có sẵn.

## Công nghệ

- **`webapp/index.html`**: HTML + CSS + JavaScript thuần, tự chứa hoàn
  toàn trong 1 file, lưu dữ liệu bằng `localStorage` — không cần backend.
- **`app.py`**: Backend Python (Flask) + SQLite (lưu hồ sơ & tiến trình
  học) phục vụ các template trong `templates/`.
- Phát âm: Web Speech API của trình duyệt (giọng đọc `vi-VN` / `ja-JP`)
  ở cả 2 bản.

## Cấu trúc thư mục

```
VietKid/
├── webapp/
│   └── index.html         # Bản web app tĩnh, tự chứa - mở trực tiếp là chạy
├── app.py                 # Bản server Flask: trang + API
├── data/
│   ├── alphabet.json      # 29 chữ cái tiếng Việt
│   └── vocabulary.json    # 9 chủ đề từ vựng song ngữ Việt-Nhật
├── static/
│   ├── css/style.css
│   └── js/
│       ├── api.js         # gọi API + quản lý hồ sơ (localStorage)
│       ├── speech.js       # đọc chữ (Web Speech API)
│       ├── sound.js         # hiệu ứng âm thanh + confetti
│       └── main.js
├── templates/
│   ├── base.html, index.html, alphabet.html, topics.html, vocabulary.html
│   ├── writing.html, writing_practice.html   # Tập viết chữ (canvas)
│   ├── progress.html
│   └── games/matching.html, quiz.html, spelling.html
└── requirements.txt
```

> Lưu ý: `webapp/index.html` nhúng sẵn dữ liệu từ vựng/bảng chữ cái ngay
> trong file. Nếu chỉnh sửa `data/vocabulary.json` hoặc `data/alphabet.json`
> cho bản Flask, cần copy nội dung tương ứng sang phần `ALPHABET` /
> `VOCABULARY` trong `webapp/index.html` để 2 bản luôn khớp nhau.

## Thêm nội dung mới

Muốn thêm từ vựng hoặc chủ đề mới? Chỉ cần chỉnh sửa
`data/vocabulary.json` (thêm object chủ đề mới hoặc thêm từ vào chủ đề có
sẵn) — không cần sửa code.
