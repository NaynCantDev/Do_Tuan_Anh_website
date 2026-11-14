# Do_Tuan_Anh_website — Portfolio CNS&AI của Đỗ Tuấn Anh

Portfolio học phần **Nhập môn Công nghệ số và ứng dụng AI (INF2501)** — sinh viên Sư phạm Âm nhạc.

## Trạng thái
- ✅ Giao diện riêng + trang Giới thiệu (thông tin, sở thích, 4 mục tiêu học tập, định hướng phát triển, mục tiêu portfolio)
- ✅ Trang Dự án / chi tiết bài / Tổng kết đã dựng sẵn; ô nào còn `…` hiện nhãn "đang cập nhật"
- ✅ Bài 1 (Thao tác tệp, thư mục): 12 bước kèm 16 ảnh chụp, cây thư mục sau từng bước, bảng Copy/Cut – Delete/Shift+Delete, phím tắt, quy tắc đặt tên
- ✅ Bài 3 (Viết prompt hiệu quả): 3 tác vụ × 3 prompt chạy thật trên Gemini, 19 ảnh chụp màn hình, bảng chấm theo tiêu chí, đối chiếu đáp án, phân tích và bộ nguyên tắc
- ✅ Bài 2, 4, 5, 6: nội dung tách riêng trong `students/do_tuan_anh/bai<N>.yaml` (render.py tự gộp vào data.yaml)
- ⚠ Tổng kết (`conclusion.yaml`): bản nháp — theo đề, Tuấn Anh cần tự viết lại phần cảm nhận, tự đánh giá
- ⏳ Mã sinh viên, lớp, email: chưa có

## Giao diện — "Live Session"
Lấy cảm hứng từ ảnh Tuấn Anh biểu diễn dưới ánh đèn sân khấu tím–hồng; không dùng chung khung với portfolio khác.
- Màu: nền sân khấu `#0c0a1e`, tím đèn `#8d6bff`, hồng đèn `#e84cb0`, xanh LED `#5fd8ff`, hổ phách `#ffb547`
- Chữ: **Big Shoulders Display** (tiêu đề kiểu poster), **Archivo** (nội dung), **JetBrains Mono** (nhãn thiết bị) — tự host trong `template/assets/fonts/`, đủ dấu tiếng Việt
- Hero: tên lớn dưới 3 luồng đèn sân khấu lắc lư, ảnh trong khung "màn hình sân khấu", sóng âm chạy bên dưới; đèn spot đi theo chuột
- Về mình = "tech rider" của nghệ sĩ
- Mục tiêu học tập = **bàn mixer 4 kênh**: fader tự đẩy lên khi cuộn tới, bấm kênh để nghe một nốt của hợp âm
- Định hướng phát triển = **bản phối DAW 5 track × 12 ô nhịp**: nút "Phát bản phối" chơi thật một đoạn nhạc C–Am–F–G dựng từ chính các track định hướng
- **Mic check**: bật micro, ngân một nốt → web dò cao độ (autocorrelation), gọi tên nốt C–D–E / Đô–Rê–Mi, kim lệch cent và vẽ đường cao độ. Xử lý hoàn toàn trên máy, không ghi âm
- Dự án = **6 pad sampler** 3×2, rê chuột/chạm để nghe, đèn LED báo bài đã xong hay đang cập nhật
- Trang chi tiết: bảng "track info" dính bên trái + nút transport ⏮ ▦ ⏭
- Khối "phòng thu" cho bài prompt: mỗi tác vụ là một *Session*, 3 phiên bản prompt là *Take 1/2/3* (tab), bảng *Mixdown* chấm điểm bằng đèn LED, lightbox xem ảnh chụp, bảng tự đếm lại đáp án
- Âm thanh tổng hợp bằng Web Audio, không cần file; tôn trọng *prefers-reduced-motion*

## Cấu trúc
```
students/do_tuan_anh/data.yaml   ← toàn bộ nội dung
students/do_tuan_anh/images/     ← ảnh đại diện + ảnh minh chứng bài tập
template/*.html.j2, template/assets/  ← giao diện
scripts/render.py                ← YAML → HTML tĩnh vào dist/
```

## Dùng
```bash
pip install -r requirements.txt
python scripts/render.py
```
Mở `dist/index.html` (nên chạy qua server, ví dụ `python -m http.server -d dist`, để micro và font hoạt động đúng). Push lên `main` → GitHub Actions tự build & deploy (bật **Settings → Pages → Source: GitHub Actions** một lần).
