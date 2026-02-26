import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Tests for the CSRF protection middleware defined in server/index.ts.
 * We recreate the middleware here to test it in isolation without needing
 * a full database/auth stack.
 */
function createAppWithCsrf() {
  const app = express();
  app.use(express.json());

  // CSRF middleware (mirrors server/index.ts)
  app.use("/api", (req, res, next) => {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
      return next();
    }
    const contentType = req.headers["content-type"] || "";
    const hasJsonContentType = contentType.includes("application/json");
    const hasMultipart = contentType.startsWith("multipart/form-data");
    const hasCsrfHeader = req.headers["x-requested-with"] === "CoupleClarity";

    if (hasCsrfHeader || hasJsonContentType || hasMultipart) {
      return next();
    }
    return res.status(403).json({ error: "Forbidden: missing required request headers" });
  });

  // Test endpoint
  app.get("/api/test", (_req, res) => res.json({ ok: true }));
  app.post("/api/test", (_req, res) => res.json({ ok: true }));
  app.put("/api/test", (_req, res) => res.json({ ok: true }));
  app.delete("/api/test", (_req, res) => res.json({ ok: true }));

  return app;
}

describe("CSRF protection middleware", () => {
  const app = createAppWithCsrf();

  it("allows GET requests without any special headers", async () => {
    const res = await request(app).get("/api/test");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("blocks POST without CSRF header or JSON content-type", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("Content-Type", "text/plain")
      .send("plain text");
    expect(res.status).toBe(403);
  });

  it("allows POST with X-Requested-With header", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("X-Requested-With", "CoupleClarity")
      .set("Content-Type", "text/plain")
      .send("data");
    expect(res.status).toBe(200);
  });

  it("allows POST with application/json content type", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ test: true }));
    expect(res.status).toBe(200);
  });

  it("allows POST with multipart/form-data content type", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("Content-Type", "multipart/form-data; boundary=----test");
    expect(res.status).toBe(200);
  });

  it("blocks PUT without proper headers", async () => {
    const res = await request(app)
      .put("/api/test")
      .set("Content-Type", "text/plain")
      .send("data");
    expect(res.status).toBe(403);
  });

  it("blocks DELETE without proper headers", async () => {
    const res = await request(app)
      .delete("/api/test")
      .set("Content-Type", "text/plain");
    expect(res.status).toBe(403);
  });

  it("allows DELETE with X-Requested-With header", async () => {
    const res = await request(app)
      .delete("/api/test")
      .set("X-Requested-With", "CoupleClarity");
    expect(res.status).toBe(200);
  });

  it("rejects wrong X-Requested-With value", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("X-Requested-With", "WrongValue")
      .set("Content-Type", "text/plain")
      .send("data");
    expect(res.status).toBe(403);
  });
});
