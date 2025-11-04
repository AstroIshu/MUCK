// Add this at the top of server/_core/index.ts
import "./env";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import path from "path";
import { fileURLToPath } from "url";
// Load local env first (if present), then fallback to .env
const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "../../");
const localEnv = path.join(root, ".env.local");
const envFile = path.join(root, ".env");
try {
  const local = dotenv.config({ path: localEnv });
  if (local.parsed) {
    console.log("Loaded environment from .env.local");
  }
} catch (_) {}
try {
  const env = dotenv.config({ path: envFile });
  if (env.parsed) {
    console.log("Loaded environment from .env");
  }
} catch (_) {}
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setupWebSocket } from "../websocket";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Authentication middleware - attaches user to request if authenticated
  app.use(async (req, res, next) => {
    try {
      req.user = await sdk.authenticateRequest(req);
      next();
    } catch (error: any) {
      // User is not authenticated - error.message available if error is Error-like
      console.log(
        "🛑 User not authenticated:",
        error?.message || String(error)
      );
      next();
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // WebSocket for real-time collaboration
  setupWebSocket(server);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
