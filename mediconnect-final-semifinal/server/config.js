require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error("JWT_SECRET must be set to a random string of at least 32 characters in production.");
}

module.exports = {
  isProd,
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mediconnect",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me-dev-only-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieName: "mc_token",
  // Extra origins allowed to call the API (e.g. VS Code Live Server on :5501)
  clientOrigins: (process.env.CLIENT_ORIGINS || "http://localhost:5501,http://127.0.0.1:5501")
    .split(",").map(s => s.trim()).filter(Boolean),
  // The "Reset demo data" footer link. Off in production unless explicitly enabled.
  allowDemoReset: process.env.ALLOW_DEMO_RESET
    ? process.env.ALLOW_DEMO_RESET === "true"
    : !isProd
};
