-- 13_exercise_index.sql
-- Bai tap tu thuc hanh - Bai 3: Chi muc thu hai theo nghiep vu
-- Nghiep vu: Tra cuu / thong ke 50 su kien CREATED gan nhat cua mot lop hoc phan (vi du 'WEB-01')

-- 1. EXPLAIN truoc khi tao index idx_enrollment_events_section_type_time
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, student_id, class_section_id, event_type, occurred_at
FROM enrollment_events
WHERE dataset = 'performance'
  AND class_section_id = 'WEB-01'
  AND event_type = 'CREATED'
  AND occurred_at >= TIMESTAMP '2025-11-01 00:00:00'
ORDER BY occurred_at DESC
LIMIT 50;

-- 2. Thiet ke Composite Index dua tren nguyen ly:
-- - Cac cot dung dieu kien loc bang (=) dat truoc: dataset, class_section_id, event_type
-- - Cot dung dieu kien khoang (>=) va sap xep (ORDER BY ... DESC) dat o cuoi: occurred_at DESC
CREATE INDEX IF NOT EXISTS idx_enrollment_events_section_type_time
ON enrollment_events (dataset, class_section_id, event_type, occurred_at DESC);

ANALYZE enrollment_events;

-- 3. EXPLAIN sau khi tao index
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, student_id, class_section_id, event_type, occurred_at
FROM enrollment_events
WHERE dataset = 'performance'
  AND class_section_id = 'WEB-01'
  AND event_type = 'CREATED'
  AND occurred_at >= TIMESTAMP '2025-11-01 00:00:00'
ORDER BY occurred_at DESC
LIMIT 50;
