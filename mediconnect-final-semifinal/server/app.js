const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const { notFound, errorHandler } = require("./middleware/errors");
const { clearSession } = require("./middleware/auth");

const FRONTEND_DIR = path.join(__dirname, "..", "mediconnect");

function createApp() {
  const app = express();
  if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : process.env.TRUST_PROXY);
  app.disable("x-powered-by");

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: null
      }
    }
  }));

  app.use("/api", cors({ origin: config.clientOrigins, credentials: true }));
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many attempts. Please wait a few minutes and try again." }
  });
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." }
  });
  app.use("/api", apiLimiter);

  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api", require("./routes/catalog"));
  app.use("/api/appointments", require("./routes/appointments"));
  app.use("/api", require("./routes/care"));

  if (config.allowDemoReset) {
    app.post("/api/dev/reset", async (req, res) => {
      await require("./seed").seed();
      clearSession(res);
      res.json({ ok: true });
    });
  }

  app.use("/api", notFound);

  app.use(express.static(FRONTEND_DIR, { extensions: ["html"] }));

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
