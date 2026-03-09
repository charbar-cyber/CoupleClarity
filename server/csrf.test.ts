import { describe, expect, it } from "vitest";
import type { NextFunction, Request, Response } from "express";

function csrfMiddleware(req: Pick<Request, "method" | "headers">, res: Pick<Response, "status" | "json">, next: NextFunction) {
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
}

async function runCsrfCheck(method: string, headers: Record<string, string> = {}) {
  let statusCode: number | null = null;
  let jsonBody: unknown = null;
  let nextCalled = false;

  const req = {
    method,
    headers,
  } as Pick<Request, "method" | "headers">;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      jsonBody = body;
      return this;
    },
  } as Pick<Response, "status" | "json">;

  const next = () => {
    nextCalled = true;
  };

  csrfMiddleware(req, res, next);

  return { statusCode, jsonBody, nextCalled };
}

describe("CSRF protection middleware", () => {
  it("allows GET requests without any special headers", async () => {
    const result = await runCsrfCheck("GET");
    expect(result.nextCalled).toBe(true);
    expect(result.statusCode).toBeNull();
  });

  it("blocks POST without CSRF header or JSON content-type", async () => {
    const result = await runCsrfCheck("POST", { "content-type": "text/plain" });
    expect(result.nextCalled).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.jsonBody).toEqual({ error: "Forbidden: missing required request headers" });
  });

  it("allows POST with X-Requested-With header", async () => {
    const result = await runCsrfCheck("POST", {
      "x-requested-with": "CoupleClarity",
      "content-type": "text/plain",
    });
    expect(result.nextCalled).toBe(true);
  });

  it("allows POST with application/json content type", async () => {
    const result = await runCsrfCheck("POST", { "content-type": "application/json" });
    expect(result.nextCalled).toBe(true);
  });

  it("allows POST with multipart/form-data content type", async () => {
    const result = await runCsrfCheck("POST", {
      "content-type": "multipart/form-data; boundary=----test",
    });
    expect(result.nextCalled).toBe(true);
  });

  it("blocks PUT without proper headers", async () => {
    const result = await runCsrfCheck("PUT", { "content-type": "text/plain" });
    expect(result.nextCalled).toBe(false);
    expect(result.statusCode).toBe(403);
  });

  it("blocks DELETE without proper headers", async () => {
    const result = await runCsrfCheck("DELETE", { "content-type": "text/plain" });
    expect(result.nextCalled).toBe(false);
    expect(result.statusCode).toBe(403);
  });

  it("allows DELETE with X-Requested-With header", async () => {
    const result = await runCsrfCheck("DELETE", { "x-requested-with": "CoupleClarity" });
    expect(result.nextCalled).toBe(true);
  });

  it("rejects wrong X-Requested-With value", async () => {
    const result = await runCsrfCheck("POST", {
      "x-requested-with": "WrongValue",
      "content-type": "text/plain",
    });
    expect(result.nextCalled).toBe(false);
    expect(result.statusCode).toBe(403);
  });
});
