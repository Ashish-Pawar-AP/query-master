import "dotenv/config";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { connectDB, disconnectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { ensureSuperAdmin } from "./utils/ensureSuperAdmin.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./modules/auth/auth.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import moduleRoutes from "./modules/modules/module.routes.js";
import subModuleRoutes from "./modules/submodules/subModule.routes.js";
import favoriteRoutes from "./modules/favorites/favorite.routes.js";
import noteRoutes from "./modules/notes/note.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import permissionRoutes from "./modules/permissions/permission.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";

// Fail fast and loud on a missing required setting, rather than crashing cryptically
// deep inside some unrelated request handler the first time it's touched (e.g. a missing
// JWT secret would otherwise only surface the moment someone tries to log in).
const REQUIRED_ENV_VARS = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "CLIENT_URL"];
function assertRequiredEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variable(s): ${missing.join(", ")}. Check your .env file.`);
    process.exit(1);
  }
}

assertRequiredEnv();

const app = express();

// Render, Railway, and most PaaS hosts put the app behind a reverse proxy. Without this,
// express-rate-limit can't tell real client IPs apart from the proxy's IP — it either
// throws a validation error or silently rate-limits every user as if they were one.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => res.json({ success: true, message: "Query Master API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/submodules", subModuleRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/users", userRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let server;

connectDB()
  .then(() => ensureSuperAdmin())
  .then(() => {
    server = app.listen(PORT, () => logger.info(`Query Master API listening on port ${PORT}`));
  })
  .catch((err) => {
    logger.error(`Startup failed: ${err.message}`);
    process.exit(1);
  });

// Graceful shutdown — PaaS hosts send SIGTERM on every redeploy/scale-down. Without this,
// in-flight requests get cut off mid-response and the DB connection is torn down uncleanly.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return; // a second signal (e.g. repeated Ctrl+C) must not restart the sequence
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully…`);

  // Cleanup must never be able to hang: mongoose.disconnect() blocks until a still-pending
  // connection attempt settles (up to the driver's 30s server-selection timeout), which is
  // exactly the situation when a deploy is cancelled mid-boot. Force the exit well inside a
  // typical platform kill-grace window instead of waiting to be SIGKILLed.
  const deadline = setTimeout(() => {
    logger.error("Graceful shutdown timed out after 10s — forcing exit");
    process.exit(1);
  }, 10_000);
  deadline.unref();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// A crash the process can't recover from should be logged clearly and exit, rather than
// continuing to run in a corrupted state (a worse outcome than a clean restart).
process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled promise rejection: ${reason instanceof Error ? reason.stack : reason}`);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught exception: ${err.stack || err.message}`);
  process.exit(1);
});
