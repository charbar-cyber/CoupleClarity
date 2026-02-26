import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CSRF protection for state-changing API requests.
// Browsers enforce the same-origin policy on requests with non-simple headers
// or content types. Cross-origin requests with Content-Type: application/json
// or custom headers like X-Requested-With trigger a CORS preflight that we
// don't allow, so an attacker's page cannot forge these requests.
// We accept the request if it has EITHER:
//   1. The custom X-Requested-With header (set by apiRequest), OR
//   2. Content-Type: application/json (set by direct fetch calls in the app), OR
//   3. Content-Type: multipart/form-data (file uploads)
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
    backlog: 100
  }, () => {
    log(`serving on port ${port} (http://0.0.0.0:${port})`);
  });
})();
