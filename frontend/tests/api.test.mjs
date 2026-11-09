import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { api } from "../src/api.js";

describe("api helper test suite", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("1. GET thanh cong tra ve du lieu JSON", async () => {
    globalThis.fetch = async (url, options) => {
      assert.match(url, /\/courses$/);
      assert.equal(options.method, "GET");
      return new Response(JSON.stringify([{ code: "INT2204", name: "Lap trinh Web" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const data = await api("/courses");
    assert.deepEqual(data, [{ code: "INT2204", name: "Lap trinh Web" }]);
  });

  test("2. POST gui payload JSON voi Content-Type phu hop", async () => {
    globalThis.fetch = async (url, options) => {
      assert.match(url, /\/enrollments$/);
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.equal(
        options.body,
        JSON.stringify({ student_id: "22000004", class_section_id: "WEB-01" }),
      );
      return new Response(JSON.stringify({ status: "created" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await api("/enrollments", {
      method: "POST",
      body: { student_id: "22000004", class_section_id: "WEB-01" },
    });
    assert.deepEqual(result, { status: "created" });
  });

  test("3. DELETE 204 tra ve null khong loi parse JSON", async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, "DELETE");
      return new Response(null, { status: 204 });
    };

    const result = await api("/enrollments/22000004/WEB-01", { method: "DELETE" });
    assert.equal(result, null);
  });

  test("4. Phan hoi khong phai JSON nem loi ro rang", async () => {
    globalThis.fetch = async () => {
      return new Response("<html>Not Found</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      });
    };

    await assert.rejects(
      async () => api("/bad-endpoint"),
      /HTTP 502: phản hồi không phải JSON\./,
    );
  });

  test("5. HTTP Loi voi detail chuoi tra ve thong diep chinh xac", async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ detail: "Lop hoc phan da day" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    };

    await assert.rejects(
      async () => api("/enrollments", { method: "POST" }),
      (err) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /HTTP 409: Lop hoc phan da day/);
        return true;
      },
    );
  });

  test("6. HTTP Loi voi detail mang (FastAPI 422) ghep cac message", async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          detail: [
            { loc: ["body", "student_id"], msg: "Field required" },
            { loc: ["body", "class_section_id"], msg: "Field required" },
          ],
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    };

    await assert.rejects(
      async () => api("/enrollments", { method: "POST" }),
      (err) => {
        assert.equal(err.status, 422);
        assert.match(err.message, /HTTP 422: Field required; Field required/);
        return true;
      },
    );
  });

  test("7. HTTP Loi khong co detail dung fallback message", async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({}),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    };

    await assert.rejects(
      async () => api("/bad-request"),
      /HTTP 400: Yêu cầu không thành công\./,
    );
  });

  test("8. Loi ket noi / mang / CORS nem thong bao huong dan kiem tra", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };

    await assert.rejects(
      async () => api("/courses"),
      /Không nhận được phản hồi API\. Kiểm tra Backend\/CORS/,
    );
  });

  test("Bo sung: AbortError duoc giu nguyen de cleanup khong hien thi loi gia", async () => {
    globalThis.fetch = async () => {
      const abortErr = new Error("The operation was aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    };

    await assert.rejects(
      async () => api("/courses"),
      (err) => err.name === "AbortError",
    );
  });
});
