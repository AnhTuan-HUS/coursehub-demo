# CourseHub - Buoi 5: Xay dung Frontend voi React va ket noi FastAPI

- **Frontend framework**: React 18.2.0 + Vite 7.1.7.
- **Backend API**: FastAPI 0.4.0 (bổ sung CORSMiddleware).
- **Database**: PostgreSQL (`v_section_summary`, `enrollments`, `enrollment_events`).
- **Phạm vi kiểm thử**: Kiểm thử giả lập HTTP `tests/api.test.mjs`, build Vite production, đối chiếu truy vấn SQL và luồng ghi/hủy thực tế trên trình duyệt và API.

---

## 1. Cấu hình CORS ở Backend (Section III)

Trong `backend/app/main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

# Buoi 5: chi cho phep frontend local goi API qua trinh duyet.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "PATCH"],
    allow_headers=["Content-Type"],
)
```

- **Origins được phép**: `http://localhost:5173` và `http://127.0.0.1:5173`.
- **Methods**: `GET`, `POST`, `DELETE`, `PATCH`.
- **Headers**: `Content-Type`.
- **Preflight (OPTIONS)**: Trả về HTTP 200 kèm các header `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods` và `Access-Control-Allow-Headers`.

---

## 2. Kiến trúc và Cấu trúc Thư mục Frontend (Section IV - IX)

```text
coursehub-demo/
├── backend/
├── database/
│   └── 13_week05_verify.sql
├── docs/
│   ├── week04_notes.md
│   └── week05_notes.md
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env.example
    ├── .env.local
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── api.js
    │   ├── styles.css
    │   └── components/
    │       ├── Notice.jsx
    │       ├── SectionTable.jsx
    │       ├── EnrollmentList.jsx
    │       ├── StudentForm.jsx    (Bai tap 1)
    │       └── EventHistory.jsx   (Bai tap 3)
    └── tests/
        └── api.test.mjs
```

### Các thành phần chính:
1. **`api.js`**:
   - Tự động lấy URL từ `VITE_API_BASE_URL` (mặc định `http://127.0.0.1:8000`).
   - Hỗ trợ `AbortController` (giữ nguyên `AbortError` để cleanup khi component unmount/đổi sinh viên).
   - Xử lý HTTP 204 No Content từ DELETE (trả `null`, không cố parse JSON).
   - Định dạng lỗi chi tiết từ FastAPI (chuỗi hoặc danh sách mảng validation 422).
   - Bắt lỗi mất kết nối / CORS và hiển thị thông báo hướng dẫn người dùng.
2. **`Notice.jsx`**:
   - Hiển thị thông báo trạng thái `info`, `success`, `error` kèm ARIA role `status`/`alert`.
3. **`SectionTable.jsx`**:
   - Bảng danh sách lớp kèm mã học phần, tên học phần, sức chứa, đã đăng ký, còn chỗ và nút Đăng ký.
   - Nút đăng ký bị vô hiệu hóa khi đang bận/tải, lớp đã đăng ký hoặc lớp hết chỗ (`remaining <= 0`).
4. **`EnrollmentList.jsx`**:
   - Danh sách các lớp học phần sinh viên đã đăng ký kèm nút Hủy đăng ký (gọi DELETE).
5. **`App.jsx`**:
   - Quản lý trạng thái: `draftId`, `studentId`, `courses`, `sections`, `enrollments`, `search`, `selectedCourse`, `onlyAvailable`, `loading`, `busy`, `error`, `notice`, `refresh`.
   - Gọi đồng thời 3 endpoint đọc bằng `Promise.all`: `/courses`, `/sections`, `/students/{studentId}/enrollments`.
   - Làm mới dữ liệu từ CSDL (`refresh`) sau cả thao tác thành công và thất bại để đảm bảo UI không tự cộng/trừ số chỗ sai lệch.

---

## 3. Kết quả Thực hành & Đối chiếu CSDL (Section X, database/13_week05_verify.sql)

### Kịch bản 1: Đăng ký thành công (`POST /enrollments`)
- Sinh viên: `22000004`, Lớp: `WEB-01`
- Request: `POST http://127.0.0.1:8000/enrollments` với body `{"student_id": "22000004", "class_section_id": "WEB-01"}`
- Phản hồi API: **HTTP 201 Created**
- Kết quả kiểm tra SQL (`database/13_week05_verify.sql`):
  - `v_section_summary`: `WEB-01` có `enrolled` = 3, `remaining` = 0.
  - `enrollments`: xuất hiện cặp `('22000004', 'WEB-01')`.
  - `enrollment_events`: xuất hiện bản ghi sự kiện `event_type = 'CREATED'`, `dataset = 'demo'`.

### Kịch bản 2: Hủy đăng ký (`DELETE /enrollments/{student_id}/{class_section_id}`)
- Request: `DELETE http://127.0.0.1:8000/enrollments/22000004/WEB-01`
- Phản hồi API: **HTTP 204 No Content** (body rỗng).
- Kết quả kiểm tra SQL:
  - `v_section_summary`: `WEB-01` có `enrolled` = 2, `remaining` = 1.
  - `enrollments`: bản ghi `('22000004', 'WEB-01')` đã được xóa sạch.
  - `enrollment_events`: xuất hiện thêm bản ghi sự kiện `event_type = 'CANCELLED'`. Bản ghi `CREATED` trước đó vẫn được lưu trữ làm audit log.

### Kịch bản 3: Từ chối đăng ký (HTTP 409 Conflict)
- Khi sinh viên đã đăng ký lớp đó hoặc khi lớp đã hết chỗ (`remaining <= 0`).
- Phản hồi API: **HTTP 409 Conflict** kèm `{"detail": "Sinh vien da dang ky lop nay"}` hoặc `{"detail": "Lop hoc phan da day"}`.
- Giao diện người dùng nhận mã 409, hiển thị lỗi rõ ràng và tự động tải lại dữ liệu mới nhất từ CSDL.

---

## 4. Kết quả Kiểm thử Tự động và Biên dịch (Section XIV)

### Lệnh chạy kiểm thử:
```bash
npm test
```
**Kết quả: 9/9 test cases đạt 100% (pass):**
1. `GET` thành công trả về dữ liệu JSON đã phân tích.
2. `POST` gửi đúng payload JSON kèm `Content-Type: application/json`.
3. `DELETE` 204 trả về `null` an toàn mà không bị lỗi cú pháp JSON.
4. Phản hồi không phải JSON (HTML/raw text) ném lỗi `HTTP <status>: phản hồi không phải JSON.`
5. Lỗi HTTP kèm `detail` dạng chuỗi hiển thị đúng thông báo lỗi nghiệp vụ.
6. Lỗi HTTP kèm `detail` dạng mảng (chuẩn FastAPI validation 422) ghép các thông báo nối tiếp.
7. Lỗi HTTP không có `detail` sử dụng câu thông báo mặc định.
8. Lỗi kết nối / CORS ném thông báo lỗi rõ ràng hướng dẫn kiểm tra Backend.
9. `AbortError` được giữ nguyên để React cleanup không gây báo lỗi giả khi đổi màn hình.

### Lệnh build bản phân phối:
```bash
npm run build
```
**Kết quả: Vite 7.1.7 build production hoàn tất thành công:**
- `dist/index.html` (0.43 kB)
- `dist/assets/index-*.css` (3.20 kB)
- `dist/assets/index-*.js` (153.16 kB)

---

## 5. Kết quả Bài tập Tự thực hành (Section XV.2)

### Bài 1: Tách form chọn sinh viên thành `StudentForm.jsx`
- Đã tách toàn bộ form chọn sinh viên và nút tải lại dữ liệu sang `frontend/src/components/StudentForm.jsx`.
- Sử dụng props: `draftId`, `setDraftId`, `studentId`, `busy`, `loading`, `onSubmit`, `onReload`.
- Không sao chép state sinh viên nội bộ trong `StudentForm`, đảm bảo tính duy nhất và nhất quán của nguồn chân lý (Single Source of Truth) tại `App.jsx`.

### Bài 2: Bổ sung bộ lọc học phần từ `GET /courses`
- Thêm thẻ `<select id="course-filter">` trong vùng lọc của `App.jsx`.
- Tự động lấy danh sách mã học phần (`INT2204`, `INT2205`, `INT2206`...) từ state `courses` do `GET /courses` trả về.
- Khi người dùng chọn một học phần, danh sách bảng lớp lọc theo `row.course_code === selectedCourse`.
- Khi không có lớp phù hợp, hiển thị thông báo rỗng: *"Không có lớp phù hợp với bộ lọc."* mà không sửa đổi bất kỳ dữ liệu nào trong CSDL.

### Bài 3: Màn hình lịch sử sinh viên có phân trang (`GET /enrollment-events`)
- Tạo component `frontend/src/components/EventHistory.jsx`.
- Gọi endpoint `GET /enrollment-events?student_id={studentId}&skip={page * PAGE_SIZE}&limit={PAGE_SIZE}` đã xây dựng từ Buổi 4.
- Lọc chỉ hiển thị các sự kiện của bộ dữ liệu `dataset = 'demo'` (tránh tải hàng loạt 100.000 dòng dữ liệu hiệu năng).
- Cung cấp nút điều hướng phân trang *"Trang trước"*, *"Trang sau"* và tự động reset về trang đầu khi chọn sinh viên khác.

### Bài 4: Mở rộng tìm kiếm & phân trang phía server (Project Nhóm)
- Với các tập dữ liệu lớn của Project (như hàng trăm nghìn giao dịch, phòng, sách), không được tải toàn bộ dữ liệu về trình duyệt rồi dùng mảng JS `.filter()` / `.slice()`.
- Phải áp dụng tìm kiếm và phân trang trực tiếp trong PostgreSQL:
  - Query parameters: `q: str | None`, `skip: int = Query(0, ge=0)`, `limit: int = Query(20, ge=1, le=100)`.
  - SQL: `WHERE col ILIKE :q ORDER BY created_at DESC, id DESC OFFSET :skip LIMIT :limit`.
  - Đảm bảo có chỉ mục phù hợp trên các cột tìm kiếm và sắp xếp.
