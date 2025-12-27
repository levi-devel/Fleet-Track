import "dotenv/config";
import express from "express";
import { registerAuthRoutes } from "../server/auth-routes";
import { registerTrackingRoutes } from "../server/tracking-routes";
import { registerApiRoutes } from "../server/routes";

const app = express();

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any | undefined = undefined;

  const originalResJson = res.json.bind(res);
  res.json = (body: any) => {
    capturedJsonResponse = body;
    return originalResJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

let initialized = false;
let initializing: Promise<void> | null = null;

async function ensureInitialized() {
  if (initialized) {
    return;
  }

  if (!initializing) {
    initializing = (async () => {
      const { initPromise } = await import("../server/storage");
      await initPromise;

      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        registerAuthRoutes(app);
        log("Auth routes registered (Supabase configured)");
      }

      if (process.env.TRACKING_API_KEY) {
        registerTrackingRoutes(app);
        log("Tracking routes registered");
      } else {
        log("Tracking routes disabled (TRACKING_API_KEY not set)");
      }

      registerApiRoutes(app);
    })()
      .then(() => {
        initialized = true;
      })
      .catch((err) => {
        initializing = null;
        throw err;
      });
  }

  await initializing;
}

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  return app(req, res);
}

