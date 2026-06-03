require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const prisma = require("./prismaClient");

const app = express();
app.use(express.json({ limit: "2mb" }));

// ─── Middleware (CORS) ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = [process.env.CLIENT_ORIGIN || "http://localhost:3000", "http://localhost:3000"];
  if (allowed.includes(origin)) res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Auth Helper ─────────────────────────────────────────────────────────────
const authSecret = process.env.AUTH_SECRET || "fallback-secret-for-dev";

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: "تعذر تسجيل الدخول" });
  }
});

// ─── Health Route ────────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  res.json({ status: "ok", message: "Server is running clean" });
});

// ─── Vercel Serverless Export ────────────────────────────────────────────────
module.exports = app;
