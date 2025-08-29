import dotenv from 'dotenv';
// Load .env early (especially for production `npm start`)
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "../backend/vite";
import morgan from 'morgan';
import * as Sentry from '@sentry/node';

const app = express();

// Sentry init (optional) with v7/v8 compatibility
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  const S: any = Sentry as any;
  if (S.Handlers?.requestHandler) {
    app.use(S.Handlers.requestHandler());
  } else if (S.setupExpressRequestHandler) {
    app.use(S.setupExpressRequestHandler());
  }
}

// Global unhandled rejection logging (non-fatal unless desired)
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// Pre-start automation (dev only): run db bootstrap + migrations if enabled
if (process.env.NODE_ENV !== 'production' && process.env.AUTO_MIGRATE !== 'false') {
  // Fire and forget – synchronous spawn would slow cold start; small helper
  (async () => {
    try {
      const { exec } = await import('node:child_process');
      log('running automated DB bootstrap (dev)');
      exec('npm run db:bootstrap', { env: process.env }, (err, stdout, stderr) => {
        if (err) {
          console.error('[auto-migrate] failed:', err.message);
        } else if (stdout) {
          console.log(stdout.trim());
        }
        if (stderr) console.error(stderr.trim());
      });
    } catch (e) {
      console.error('[auto-migrate] spawn error', e);
    }
  })();
}

// Enable compression for better performance
app.use(compression());
app.use(morgan('tiny'));

// Optimize JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any): Response {
    capturedJsonResponse = bodyJson as any;
    return originalResJson(bodyJson);
  } as any;

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

import { seedDatabase } from "../backend/seed";

(async () => {
  // Keep existing seed (idempotent) – optional since bootstrap already seeds
  try {
    await seedDatabase();
  } catch (e) {
    console.warn('[startup] seed skipped:', (e as Error).message);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
    throw err;
  });

  const serveClient = process.env.SERVE_CLIENT !== 'false';
  if (serveClient) {
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  }

  const port = Number(process.env.PORT || 3000);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
