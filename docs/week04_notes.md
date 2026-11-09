# CourseHub - Buoi 4: Transaction, Concurrency, Migration va Toi uu truy van

- Migration 001: Bảng `schema_migrations` và bảng nhật ký `enrollment_events`.
- Migration 002: Bổ sung cột `note VARCHAR(200)` cho bảng `enrollment_events`.
- Demo class: `RACE-01`, capacity = 1.
- POST /enrollments: Khóa dòng `class_sections` bằng `SELECT ... FOR UPDATE` trước khi đếm và ghi dữ liệu; ghi sự kiện audit `CREATED` trong cùng transaction.
- DELETE /enrollments/{student_id}/{class_section_id}: Khóa dòng `class_sections` bằng `FOR UPDATE`, xóa bản ghi bằng `RETURNING`, ghi sự kiện `CANCELLED` trong cùng transaction.
- Concurrency test (`week04_concurrency_test.py`): Hai request gửi đồng thời qua `threading.Barrier` và `ThreadPoolExecutor` -> Đúng 1 request nhận `201 Created`, 1 request nhận `409 Conflict`, `enrolled` của `RACE-01` = 1, `remaining` = 0.
- Performance data: 100.000 dòng sinh bằng `generate_series`, phân biệt bởi `dataset = 'performance'`.

---

## 1. Đo lường hiệu năng truy van (Section VII)

**Truy vấn kiểm tra:**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, student_id, class_section_id, event_type, occurred_at
FROM enrollment_events
WHERE dataset = 'performance'
  AND student_id = '22000001'
  AND occurred_at >= TIMESTAMP '2025-12-20 00:00:00'
ORDER BY occurred_at DESC
LIMIT 50;
```

### Trước khi tạo chỉ mục:
- **Scan type:** `Seq Scan` trên bảng `enrollment_events` kết hợp `Sort Method: top-N heapsort`
- **Rows Removed by Filter:** 99.183 dòng (quét qua toàn bộ 100.000 dòng)
- **Shared Buffers:** Hit 1.140 blocks (toàn bộ các trang đĩa của bảng)
- **Planning Time:** 0.288 ms
- **Execution Time:** ~5.704 ms

### Sau khi tạo chỉ mục composite (`idx_enrollment_events_dataset_student_time`):
```sql
CREATE INDEX idx_enrollment_events_dataset_student_time
ON enrollment_events (dataset, student_id, occurred_at DESC);
```
- **Scan type:** `Index Scan` sử dụng `idx_enrollment_events_dataset_student_time`
- **Rows Removed by Filter:** 0 dòng (tận dụng B-Tree để tìm kiếm trực tiếp)
- **Shared Buffers:** Hit 50 blocks, Read 3 blocks (giảm hơn 95% I/O đĩa)
- **Tối ưu sắp xếp:** Không cần bước Sort bổ sung vì chỉ mục đã lưu theo thứ tự `occurred_at DESC`
- **Planning Time:** 0.141 ms
- **Execution Time:** ~0.074 ms (Tăng tốc ~77 lần)

---

## 2. Kết quả Bài tập tự thực hành (Section XII)

### Bài 1: API đọc lịch sử đăng ký (`GET /enrollment-events`)
- Endpoint: `GET /enrollment-events`
- Query parameters:
  - `student_id`: Lọc theo mã sinh viên (dùng bind parameter an toàn).
  - `event_type`: Lọc theo loại sự kiện (`CREATED` hoặc `CANCELLED`), kiểm tra hợp lệ trả về `400 Bad Request` nếu sai.
  - `skip`: Bỏ qua số lượng bản ghi (ge=0, mặc định 0).
  - `limit`: Giới hạn kết quả (ge=1, le=100, mặc định 20).
- Sắp xếp ổn định: `ORDER BY occurred_at DESC, id DESC`.
- Đã kiểm thử qua Python và Postman với các ca: có dữ liệu, không có dữ liệu, phân trang và tham số không hợp lệ.

### Bài 2: Kiểm thử rollback nhiều bảng
- Mã kiểm thử: `backend/tests/test_multi_table_rollback.py` và endpoint `POST /demo/test-rollback`.
- Kịch bản kiểm thử Atomicity:
  1. `INSERT INTO enrollments`: Ghi thành công trong transaction.
  2. `INSERT INTO enrollment_events`: Cố ý truyền `event_type = 'INVALID_EVENT'` vi phạm check constraint `ck_enrollment_events_type`.
  3. Bắt ngoại lệ và kiểm tra trạng thái database: Transaction tự động ROLLBACK toàn bộ.
  4. Xác nhận: Bảng `enrollments` không bị tăng thêm bản ghi (số dòng giữ nguyên).

### Bài 3: Chỉ mục thứ hai theo nghiệp vụ
- Tệp SQL: `database/13_exercise_index.sql`
- Nghiệp vụ: Tra cứu 50 sự kiện `CREATED` gần nhất của một lớp học phần cụ thể (`WEB-01`).
- Thiết kế chỉ mục composite:
  - Các cột lọc đẳng thức (`=`): `dataset`, `class_section_id`, `event_type` đặt ở đầu.
  - Cột lọc khoảng (`>=`) và sắp xếp (`ORDER BY DESC`): `occurred_at DESC` đặt ở cuối.
  ```sql
  CREATE INDEX idx_enrollment_events_section_type_time
  ON enrollment_events (dataset, class_section_id, event_type, occurred_at DESC);
  ```
- Kết quả đo lường thực tế:
  - Trước khi tạo index: Bitmap Heap Scan + Top-N Heapsort, đọc 586 blocks, Execution Time: **2.996 ms** (Rows removed by filter: 13.350).
  - Sau khi tạo index: Index Scan trực tiếp, không cần sort, đọc 54 blocks, Execution Time: **0.084 ms** (Tăng tốc ~35 lần).

### Bài 4: Migration 002
- Tệp migration: `database/migrations/002_add_note_to_enrollment_events.sql`
- Thao tác: Bổ sung cột `note VARCHAR(200)` cho bảng `enrollment_events`, ghi nhận phiên bản `'002'` vào `schema_migrations`.
- Tệp rollback: `database/migrations/002_add_note_to_enrollment_events_rollback.sql` (`ALTER TABLE ... DROP COLUMN IF EXISTS note`).
- Đánh giá tính toàn vẹn: Áp dụng thành công trên CSDL đang có 100.003 bản ghi; toàn bộ dữ liệu cũ được giữ nguyên vẹn (cột `note` nhận giá trị `NULL`).
- Cảnh báo dữ liệu khi rollback: Lệnh `DROP COLUMN note` sẽ xóa hoàn toàn nội dung trong cột `note`, các cột khác không bị ảnh hưởng.

### Bài 5: Áp dụng vào Project nhóm (Mốc kiểm tra Project 1)
- **Nghiệp vụ giao dịch nhiều bảng:** Đặt vé/đặt lịch học/đăng ký tín chỉ (Khóa dòng tài nguyên -> Kiểm tra số chỗ/tồn kho -> Tạo bản ghi giao dịch -> Cập nhật trạng thái/tồn kho -> Ghi nhật ký audit).
- **Nguy cơ tranh chấp đồng thời:** Hai người dùng cùng gửi yêu cầu đăng ký/đặt mua suất cuối cùng.
- **Tài nguyên cần khóa:** Dòng dữ liệu của phiên/suất học/phòng (`FOR UPDATE`) để các yêu cầu đồng thời phải xếp hàng tuần tự tại điểm khóa này.
- **Phương pháp kiểm thử concurrency:** Tạo script mô phỏng 2 thread/process gửi request cùng lúc bằng `threading.Barrier` hoặc 2 kết nối CSDL độc lập, chứng minh đúng 1 luồng thành công và trạng thái CSDL cuối cùng không bị âm/vượt sức chứa.

---

> Không commit `backend/.env`.
