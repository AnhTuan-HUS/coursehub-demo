-- Rollback cho migration 002
-- LUU Y: Khi rollback, cot note se bi xoa khoi enrollment_events.
-- Toan bo du lieu luu trong cot note se bi mat vinh vien; cac cot khac va so luong dong van duoc giu nguyen.

BEGIN;

ALTER TABLE enrollment_events
DROP COLUMN IF EXISTS note;

DELETE FROM schema_migrations WHERE version = '002';

COMMIT;
