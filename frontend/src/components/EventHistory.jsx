import { useEffect, useState } from "react";
import { api } from "../api.js";
import Notice from "./Notice.jsx";

const PAGE_SIZE = 5;

export default function EventHistory({ studentId, refresh, disabled }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  // Reset page when studentId changes
  useEffect(() => {
    setPage(0);
  }, [studentId]);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };

    async function loadEvents() {
      setLoading(true);
      setError("");
      try {
        const data = await api(
          `/enrollment-events?student_id=${encodeURIComponent(studentId)}&skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`,
          options,
        );
        if (controller.signal.aborted) return;
        // Chi hien thi nhat ky demo
        const demoEvents = (data || []).filter(
          (item) => !item.dataset || item.dataset === "demo",
        );
        setEvents(demoEvents);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.message);
        setEvents([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadEvents();
    return () => controller.abort();
  }, [studentId, page, refresh]);

  return (
    <section className="panel">
      <h2>4. Lịch sử thao tác sinh viên (Buổi 4 - Bài 3)</h2>
      <Notice kind="error">{error}</Notice>
      {loading && <p className="muted">Đang tải lịch sử thao tác...</p>}
      {!loading && events.length === 0 && (
        <p className="muted">Chưa có sự kiện demo nào cho sinh viên {studentId}.</p>
      )}
      {!loading && events.length > 0 && (
        <div className="table-scroll">
          <table aria-label="Lịch sử thao tác sinh viên">
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Lớp học phần</th>
                <th>Thao tác</th>
                <th>Nguồn</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    {new Date(ev.occurred_at).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </td>
                  <td>
                    <strong>{ev.class_section_id}</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${ev.event_type === "CREATED" ? "" : "full"}`}
                    >
                      {ev.event_type === "CREATED" ? "Đăng ký" : "Hủy đăng ký"}
                    </span>
                  </td>
                  <td>
                    <small>{ev.source || "api"}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination">
        <button
          type="button"
          className="secondary"
          disabled={disabled || loading || page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Trang trước
        </button>
        <span className="muted">Trang {page + 1}</span>
        <button
          type="button"
          className="secondary"
          disabled={disabled || loading || events.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </button>
      </div>
    </section>
  );
}
