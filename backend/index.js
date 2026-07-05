import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { db } from "./db/config.js";
import { mainRouter } from "./src/api/routes.js";
import { errorHandler } from "./src/middleware/error-handler.js";

dotenv.config();

const app = express();
const port = Number.parseInt(process.env.PORT, 10) || 3777;
const isProduction = process.env.NODE_ENV === "production";
const corsOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (corsOrigins.length === 0) {
    return !isProduction || origin.startsWith("http://localhost:");
  }

  return corsOrigins.includes(origin);
};

const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_REQUESTS = 20;
const authAttempts = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of authAttempts.entries()) {
    if (value.resetAt <= now) {
      authAttempts.delete(key);
    }
  }
}, AUTH_RATE_LIMIT_WINDOW_MS).unref();

const authRateLimiter = (req, res, next) => {
  const key = `${req.ip}:${req.method}:${req.path}`;
  const now = Date.now();
  const current = authAttempts.get(key);

  if (!current || current.resetAt <= now) {
    authAttempts.set(key, {
      count: 1,
      resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS,
    });
    next();
    return;
  }

  current.count += 1;

  if (current.count > AUTH_RATE_LIMIT_MAX_REQUESTS) {
    res.setHeader(
      "Retry-After",
      String(Math.ceil((current.resetAt - now) / 1000)),
    );
    res.status(429).json({
      message: "Too many authentication attempts. Please try again later.",
    });
    return;
  }

  next();
};

const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );

  if (isProduction) {
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  }

  next();
};

const requestLogger = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      }),
    );
  });

  next();
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  maxAge: 86400,
};

app.disable("x-powered-by");
app.set("trust proxy", 1);

// Middleware
app.use(helmet());
app.use(securityHeaders);
app.use(requestLogger);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    dotfiles: "deny",
    index: false,
    fallthrough: false,
  }),
);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.use("/api/auth", authRateLimiter);
app.use("/api", mainRouter);

app.use(errorHandler);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const connection = await db.getConnection();

    console.log("Database connection established successfully.");
    connection.release();

    const server = app.listen(port, () => {
      console.log(`Server running on port http://localhost:${port}`);
    });

    server.on("error", (error) => {
      console.error("Failed to start the server:", error.message);
      process.exit(1);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);
      server.close(async () => {
        try {
          await db.end();
          process.exit(0);
        } catch (shutdownError) {
          console.error("Error during shutdown:", shutdownError.message);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error(
      "Failed to connect to the database. Server not started.",
      error.message,
    );
    process.exit(1);
  }
};

startServer();
