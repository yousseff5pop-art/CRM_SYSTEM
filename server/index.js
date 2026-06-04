require("dotenv").config();

// ─── Startup validation ───────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required in .env");
  process.exit(1);
}
if (false && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET === "crm-local-secret")) {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ AUTH_SECRET must be set to a strong secret in production");
    process.exit(1);
  } else {
    console.warn("⚠️  AUTH_SECRET not set — using insecure default (dev only)");
  }
}

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const devAuthSecretFile = path.join(__dirname, ".dev-auth-secret");
const whatsappRuntimeConfigFile = path.join(__dirname, ".whatsapp-runtime.json");

function getAuthSecret() {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET !== "crm-local-secret") {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    console.error("AUTH_SECRET must be set to a strong secret in production");
    process.exit(1);
  }

  try {
    if (fs.existsSync(devAuthSecretFile)) {
      const secret = fs.readFileSync(devAuthSecretFile, "utf8").trim();
      if (secret) {
        return secret;
      }
    }

    const generatedSecret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(devAuthSecretFile, generatedSecret, "utf8");
    console.warn("AUTH_SECRET not set — generated a local development secret in server/.dev-auth-secret");
    return generatedSecret;
  } catch (err) {
    console.warn("Could not persist local AUTH_SECRET, using in-memory secret for this run only");
    return crypto.randomBytes(32).toString("hex");
  }
}

function loadWhatsAppRuntimeConfig() {
  try {
    if (!fs.existsSync(whatsappRuntimeConfigFile)) {
      return { enabled: false };
    }

    const parsed = JSON.parse(fs.readFileSync(whatsappRuntimeConfigFile, "utf8"));
    return {
      enabled: Boolean(parsed?.enabled)
    };
  } catch (err) {
    console.warn("Could not read WhatsApp runtime config, defaulting to disabled:", err.message);
    return { enabled: false };
  }
}

function saveWhatsAppRuntimeConfig(config) {
  try {
    fs.writeFileSync(
      whatsappRuntimeConfigFile,
      JSON.stringify({ enabled: Boolean(config?.enabled) }, null, 2),
      "utf8"
    );
  } catch (err) {
    console.warn("Could not persist WhatsApp runtime config:", err.message);
  }
}
const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const prisma = require("./prismaClient");

const app = express();
const port = Number(process.env.PORT || 3001);
const backupDir = path.join(__dirname, "backups");
const logsDir = path.join(__dirname, "logs");
const whatsappLogFile = path.join(logsDir, "whatsapp.log");
const stageOptions = ["new", "interested", "contacted", "follow_up", "won", "closed"];
const employeeSeed = ["ندى", "يوسف", "سلمى", "أحمد", "سارة"];
const authCookieName = "crm_session";
const authSecret = getAuthSecret();
const sessionMaxAgeMs = 1000 * 60 * 60 * 24 * 7;
const whatsappDefaultCountryCode = String(
  process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || process.env.DEFAULT_COUNTRY_CODE || "20"
).replace(/\D/g, "");


let whatsappState = "offline";
let whatsappQR = null;
let client = null;
let whatsappBusy = false;
let whatsappRestartPromise = null;
let whatsappEnabled = loadWhatsAppRuntimeConfig().enabled;

if (!whatsappEnabled) {
  whatsappState = "disabled";
}

function setWhatsAppEnabled(nextValue) {
  whatsappEnabled = Boolean(nextValue);
  saveWhatsAppRuntimeConfig({ enabled: whatsappEnabled });
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));

function isAllowedOrigin(origin) {
  if (!origin) return false;

  const explicitOrigins = new Set([
    process.env.CLIENT_ORIGIN || "http://localhost:3000",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002"
  ]);

  if (explicitOrigins.has(origin)) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);
    if (!["http:", "https:"].includes(protocol)) {
      return false;
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }

    if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) {
      return true;
    }

    const match = hostname.match(/^172\.(\d{1,2})\./);
    if (match) {
      const block = Number(match[1]);
      return block >= 16 && block <= 31;
    }
  } catch {
    return false;
  }

  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function logWhatsApp(event, details = {}) {
  try {
    ensureDirectory(logsDir);
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...details
    });
    fs.appendFileSync(whatsappLogFile, `${line}\n`, "utf8");
  } catch (err) {
    console.warn("Failed to write WhatsApp log:", err.message);
  }
}

/**
 * Normalize a phone number:
 * - Strip everything after @
 * - Remove all non-digit characters except leading +
 * - Remove country code prefix duplicates
 * Returns clean digits-only string (no +)
 */
function normalizePhone(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  // Remove @anything (WhatsApp JID suffix)
  const beforeAt = trimmed.split("@")[0];
  // Keep only digits and leading +
  const clean = beforeAt.replace(/[^\d+]/g, "");
  // Remove leading + for storage (store as digits only)
  return clean.replace(/^\+/, "") || "";
}

function toWhatsAppPhone(value) {
  const digits = normalizePhone(value).replace(/^00/, "");
  if (!digits) return "";

  if (digits.startsWith(whatsappDefaultCountryCode)) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length >= 10 && whatsappDefaultCountryCode) {
    return `${whatsappDefaultCountryCode}${digits.slice(1)}`;
  }

  return digits;
}

/**
 * Format phone for display: add + and format nicely
 * e.g. "201012345678" → "+20 101 234 5678"
 */
function formatPhoneDisplay(phone) {
  if (!phone) return "غير معروف";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "غير معروف";
  // Add + prefix for display
  return "+" + digits;
}

function extractIncomingPhoneSync(msg) {
  const candidates = [
    msg?.from,
    msg?._data?.from,
    msg?._data?.author,
    msg?._data?.id?.remote,
    msg?._data?.id?.participant,
    msg?._data?.chatId,
    msg?.id?.remote
  ];
  for (const candidate of candidates) {
    const normalized = normalizePhone(candidate);
    if (normalized && /\d{8,}/.test(normalized)) {
      return normalized;
    }
  }
  return "";
}

async function resolveIncomingPhone(msg) {
  const directPhone = extractIncomingPhoneSync(msg);
  if (directPhone && !String(msg?.from || "").endsWith("@lid")) {
    return directPhone;
  }
  const chatId = msg?.from || msg?._data?.from || msg?._data?.id?.remote || msg?.id?.remote || "";
  try {
    if (chatId && String(chatId).endsWith("@lid") && typeof client.getContactLidAndPhone === "function") {
      const [lidInfo] = await client.getContactLidAndPhone([chatId]);
      const resolved = normalizePhone(lidInfo?.pn);
      if (resolved) return resolved;
    }
  } catch (err) {
    console.warn("Could not resolve lid:", err.message);
  }
  try {
    const contact = typeof msg?.getContact === "function" ? await msg.getContact() : null;
    const fromContact = normalizePhone(contact?.number);
    if (fromContact) return fromContact;
  } catch (err) {
    console.warn("Could not read contact number:", err.message);
  }
  return directPhone;
}

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function describeRelativeDate(value) {
  const date = safeDate(value);
  if (!date) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday - startOfDate) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}

function parseCookies(cookieHeader) {
  return (cookieHeader || "").split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function createSessionToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    exp: Date.now() + sessionMaxAgeMs
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readSessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", authSecret).update(encoded).digest("base64url");
  if (signature !== expectedSignature) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

function writeSessionCookie(res, token) {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const sameSite = process.env.NODE_ENV === "production" ? "Strict" : "Lax";
  const cookie = `${authCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${Math.floor(sessionMaxAgeMs / 1000)}${secureFlag}`;
  res.setHeader("Set-Cookie", cookie);
}

function clearSessionCookie(res) {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const sameSite = process.env.NODE_ENV === "production" ? "Strict" : "Lax";
  res.setHeader("Set-Cookie", `${authCookieName}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${secureFlag}`);
}

async function getCurrentUser(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const session = readSessionToken(cookies[authCookieName]);
  if (!session?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) return null;
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
}

async function requireAuth(req, res, next) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "هذه الصفحة متاحة للمدير فقط" });
  }
  next();
}

// ─── Format contact: FIXED phone display ─────────────────────────────────────
function filterContactsByUser(user, contacts) {
  if (!user || user.role === "ADMIN") {
    return contacts;
  }

  return contacts.filter(contact => contact.assignedEmployee === user.displayName);
}

function buildContactAccessWhere(user, where = {}) {
  if (!user || user.role === "ADMIN") {
    return where;
  }

  return {
    AND: [
      where,
      { assignedEmployee: user.displayName }
    ]
  };
}

function formatContact(contact) {
  const inboundCount = contact.inboundCount || 0;
  const leadCategory = inboundCount > 1 ? "returning" : "new";

  // Fix: use phone field first, fallback to identifier
  // Never show the id or identifier as the phone number
  const rawPhone = normalizePhone(contact.phone || "");
  const resolvedPhone = rawPhone ? formatPhoneDisplay(rawPhone) : "غير معروف";
  const fallbackName = rawPhone
    ? `عميل ${resolvedPhone}`
    : `عميل ${String(contact.identifier || contact.id || "").slice(0, 8)}`;
  const displayName = String(contact.name || "").trim() || fallbackName;

  return {
    id: contact.id,
    identifier: contact.identifier,
    leadNumber: contact.id,
    name: displayName,
    phoneNumber: resolvedPhone,          // ← always the actual phone
    phoneRaw: rawPhone,                   // ← raw digits for dialing
    lastMessage: contact.lastMessage,
    messagesCount: contact.messagesCount,
    inboundCount,
    leadCategory,
    isNewLead: leadCategory === "new",
    isReturningLead: leadCategory === "returning",
    stage: contact.stage,
    interestStatus: contact.interestStatus || null,
    contacted: contact.contacted,
    contactDate: contact.contactDate ? contact.contactDate.toISOString() : null,
    followUpAt: contact.followUpAt ? contact.followUpAt.toISOString() : null,
    notes: contact.notes || "",
    vip: Boolean(contact.vip),
    replyStatus: contact.replyStatus || "no_reply",
    whatsappTouched: Boolean(contact.whatsappTouched),
    assignedEmployee: contact.assignedEmployee || "",
    actionType: contact.actionType || "none",
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    createdAtLabel: describeRelativeDate(contact.createdAt),
    updatedAtLabel: describeRelativeDate(contact.updatedAt),
    unitIds: (contact.units || []).map(item => item.unitId),
    units: (contact.units || []).map(item => ({
      id: item.unit.id,
      title: item.unit.title,
      status: item.unit.status
    })),
    messages: (contact.messages || []).map(message => ({
      id: message.id,
      message: message.text,
      fromMe: message.fromMe,
      isoTime: message.createdAt
    }))
  };
}

function buildContactInclude(options = {}) {
  return {
    units: { include: { unit: true } },
    ...(options.includeMessages
      ? { messages: { orderBy: { createdAt: "desc" }, take: options.messageTake || 50 } }
      : {})
  };
}

async function getContacts(options = {}) {
  const contacts = await prisma.contact.findMany({
    where: buildContactAccessWhere(options.user, options.where || {}),
    include: buildContactInclude(options),
    orderBy: { updatedAt: "desc" }
  });
  return filterContactsByUser(options.user, contacts).map(formatContact);
}

async function getContactByIdentifier(identifier, options = {}) {
  const contact = await prisma.contact.findFirst({
    where: buildContactAccessWhere(options.user, { identifier }),
    include: buildContactInclude(options)
  });

  return contact ? formatContact(contact) : null;
}

async function getUnits() {
  return prisma.unit.findMany({ orderBy: [{ updatedAt: "desc" }, { title: "asc" }] });
}

async function getEmployees() {
  return prisma.employee.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
}

async function getUsers() {
  return prisma.user.findMany({ orderBy: [{ role: "asc" }, { username: "asc" }] });
}

async function getAdCampaigns() {
  return prisma.adCampaign.findMany({ orderBy: [{ active: "desc" }, { startDate: "desc" }] });
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function createCsv(contacts) {
  const rows = [["leadNumber", "name", "phoneNumber", "stage", "contacted", "replyStatus", "vip", "units", "lastMessage", "notes", "updatedAt"]];
  for (const contact of contacts) {
    rows.push([
      contact.leadNumber, contact.name || "", contact.phoneNumber || "",
      contact.stage || "", contact.contacted ? "yes" : "no",
      contact.replyStatus || "", contact.vip ? "yes" : "no",
      (contact.units || []).map(u => u.title).join(" | "),
      contact.lastMessage || "", contact.notes || "", contact.updatedAt || ""
    ]);
  }
  return rows.map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}

async function getBackupInfo() {
  ensureDirectory(backupDir);
  const entries = fs.readdirSync(backupDir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith(".json"))
    .map(e => {
      const fullPath = path.join(backupDir, e.name);
      return { name: e.name, filePath: fullPath, updatedAt: fs.statSync(fullPath).mtime };
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return { targetType: "local", targetDir: backupDir, count: entries.length, latestBackup: entries[0] || null };
}

async function buildDashboard(currentUser = null) {
  const [contacts, units, backup, employees, adCampaigns, users] = await Promise.all([
    getContacts({ user: currentUser }), getUnits(), getBackupInfo(), getEmployees(), getAdCampaigns(), getUsers()
  ]);
  const startOfToday = getStartOfToday();
  const activeUnits = units.filter(u => u.status === "active");
  const activeAdCampaigns = adCampaigns.filter(c => c.active);
  const unassignedContacts = contacts.filter(c => !(c.unitIds || []).length);

  const stats = {
    contactsCreatedToday: contacts.filter(c => new Date(c.createdAt).getTime() >= startOfToday.getTime()).length,
    contactedCount: contacts.filter(c => c.contacted).length,
    answeredCount: contacts.filter(c => c.replyStatus === "replied").length,
    pendingCount: contacts.filter(c => !c.contacted).length,
    featuredCount: contacts.filter(c => c.vip).length,
    notFeaturedCount: contacts.filter(c => !c.vip).length,
    viewingsCount: contacts.filter(c => c.actionType === "viewing").length,
    bookingsCount: contacts.filter(c => c.actionType === "booking").length,
    unitsCount: units.length,
    activeUnitsCount: activeUnits.length,
    activeAdsCount: activeAdCampaigns.length,
    newLeadsCount: contacts.filter(c => c.leadCategory === "new").length,
    returningLeadsCount: contacts.filter(c => c.leadCategory === "returning").length,
    unassignedCount: unassignedContacts.length,
    totalContacts: contacts.length
  };

  const followUps = contacts
    .filter(c => c.followUpAt)
    .sort((a, b) => new Date(a.followUpAt) - new Date(b.followUpAt))
    .slice(0, 8);

  const unitReports = units.map(unit => {
    const related = contacts.filter(c => (c.unitIds || []).includes(unit.id));
    return {
      id: unit.id, title: unit.title, status: unit.status,
      contactsCount: related.length,
      contactedCount: related.filter(c => c.contacted).length,
      pendingCount: related.filter(c => !c.contacted).length
    };
  });

  return {
    status: {
      status: whatsappState,
      enabled: whatsappEnabled,
      database: "connected",
      qr: whatsappQR,
      busy: whatsappBusy
    },
    stageOptions, stats,
    units, employees,
    users: currentUser?.role === "ADMIN"
      ? users.map(u => ({ id: u.id, username: u.username, displayName: u.displayName, role: u.role, active: u.active }))
      : [],
    adCampaigns, unitReports, followUps, backup
  };
}

async function saveContactUnits(contactId, unitIds) {
  await prisma.contactUnit.deleteMany({ where: { contactId } });
  if (!unitIds.length) return;
  await prisma.contactUnit.createMany({ data: unitIds.map(unitId => ({ contactId, unitId })) });
}

async function ensureContactByPhone(phone, name) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error("رقم العميل غير صالح");
  const existing = await prisma.contact.findUnique({ where: { phone: normalizedPhone } });
  if (existing) return existing;
  return prisma.contact.create({ data: { phone: normalizedPhone, name: name || "عميل جديد" } });
}

async function ensureSeeds() {
  const unitsCount = await prisma.unit.count();
  if (unitsCount === 0) {
    await prisma.unit.createMany({
      data: [
        { title: "وحدة أحمد محمد", status: "active" },
        { title: "وحدة سارة علي", status: "active" },
        { title: "وحدة محمود حسن", status: "active" }
      ]
    });
  }
  const employeesCount = await prisma.employee.count();
  if (employeesCount === 0) {
    await prisma.employee.createMany({ data: employeeSeed.map(name => ({ name, active: true })) });
  }
  const adsCount = await prisma.adCampaign.count();
  if (adsCount === 0) {
    await prisma.adCampaign.createMany({
      data: [
        { name: "إعلان فيسبوك", active: true, startDate: new Date() },
        { name: "إعلان إنستجرام", active: true, startDate: new Date() }
      ]
    });
  }
  const usersCount = await prisma.user.count();
  if (usersCount === 0) {
    const bootstrapUsername = String(process.env.BOOTSTRAP_USERNAME || "").trim().toLowerCase();
    const bootstrapPassword = String(process.env.BOOTSTRAP_PASSWORD || "");
    const bootstrapDisplayName = String(process.env.BOOTSTRAP_DISPLAY_NAME || "System Admin").trim().slice(0, 100);
    const bootstrapRole = process.env.BOOTSTRAP_ROLE === "AGENT" ? "AGENT" : "ADMIN";

    if (!bootstrapUsername || !bootstrapPassword) {
      console.warn("No bootstrap user created. Set BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD to create the first account.");
      return;
    }

    if (bootstrapPassword.length < 12) {
      console.warn("BOOTSTRAP_PASSWORD is too short. Skipping bootstrap user creation until a stronger password is provided.");
      return;
    }

    await prisma.user.create({
      data: {
        username: bootstrapUsername,
        displayName: bootstrapDisplayName,
        role: bootstrapRole,
        passwordHash: hashPassword(bootstrapPassword)
      }
    });

    console.log(`Bootstrap user created for ${bootstrapUsername}`);
  }
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيح" });
    }
    writeSessionCookie(res, createSessionToken(user));
    res.json({ user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: "تعذر تسجيل الدخول", details: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get("/api/auth/me", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "لا يوجد مستخدم مسجل" });
  res.json({ user });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      port,
      database: "connected",
      whatsapp: whatsappState,
      whatsappEnabled,
      qr: whatsappQR,
      busy: whatsappBusy
    });
  } catch (err) {
    res.status(503).json({ ok: false, port, database: "disconnected", error: err.message });
  }
});

// ─── WhatsApp QR ──────────────────────────────────────────────────────────────
app.get("/api/whatsapp/qr", requireAuth, (req, res) => {
  res.json({ state: whatsappState, enabled: whatsappEnabled, qr: whatsappQR, busy: whatsappBusy });
});

function isRecoverableWhatsAppError(err) {
  const message = String(err?.message || "").toLowerCase();
  return (
    message.includes("detached frame") ||
    message.includes("execution context was destroyed") ||
    message.includes("protocol error") ||
    message.includes("target closed") ||
    message.includes("session closed") ||
    message.includes("page has been closed")
  );
}

function getFrameDetachedState(frame) {
  if (!frame) return false;
  if (typeof frame.isDetached === "function") return frame.isDetached();
  if (typeof frame.detached === "boolean") return frame.detached;
  return false;
}

async function ensureWhatsAppReadyForSend() {
  if (!whatsappEnabled) {
    return { ok: false, status: 503, error: "WhatsApp is disabled" };
  }

  if (whatsappState !== "ready" || !client) {
    return { ok: false, status: 503, error: "WhatsApp not connected" };
  }

  try {
    if (client.pupPage?.isClosed?.()) {
      return { ok: false, status: 503, error: "WhatsApp browser page is closed" };
    }

    if (client.pupBrowser && typeof client.pupBrowser.isConnected === "function" && !client.pupBrowser.isConnected()) {
      return { ok: false, status: 503, error: "WhatsApp browser is disconnected" };
    }

    const frame = typeof client.pupPage?.mainFrame === "function" ? client.pupPage.mainFrame() : null;
    if (getFrameDetachedState(frame)) {
      return { ok: false, status: 503, error: "WhatsApp browser frame was detached" };
    }
  } catch (err) {
    return { ok: false, status: 503, error: "WhatsApp browser health check failed", details: err.message };
  }

  return { ok: true };
}

app.post("/api/whatsapp/send", requireAuth, async (req, res) => {
  try {
    const phone = String(req.body.phone || "");
    const message = String(req.body.message || "").trim();
    if (!phone || !message) {
      return res.status(400).json({ error: "Phone number and message are required" });
    }

    const storagePhone = normalizePhone(phone);
    const waPhone = toWhatsAppPhone(phone);
    if (!waPhone || !/^\d{8,15}$/.test(waPhone)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    const readiness = await ensureWhatsAppReadyForSend();
    if (!readiness.ok) {
      logWhatsApp("send_blocked", { phone: waPhone, reason: readiness.error, details: readiness.details || null });
      return res.status(readiness.status).json({
        error: readiness.error === "WhatsApp not connected" ? "WhatsApp not connected" : "WhatsApp session is not ready",
        details: readiness.error
      });
    }

    const chatId = `${waPhone}@c.us`;
    logWhatsApp("send_attempt", { phone: waPhone, chatId, byUser: req.user.username });
    await client.sendMessage(chatId, message);
    logWhatsApp("send_success", { phone: waPhone, chatId, byUser: req.user.username });

    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: storagePhone },
          { phone: waPhone }
        ]
      }
    });
    if (contact) {
      await prisma.message.create({ data: { text: message, fromMe: true, contactId: contact.id } });
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          phone: waPhone,
          lastMessage: message,
          messagesCount: { increment: 1 },
          whatsappTouched: true
        }
      });
    }

    res.json({ success: true, phone: waPhone, chatId });
  } catch (err) {
    logWhatsApp("send_error", {
      phone: req.body?.phone || null,
      byUser: req.user?.username || null,
      message: err.message,
      stack: err.stack
    });

    if (isRecoverableWhatsAppError(err)) {
      if (whatsappEnabled) {
        queueWhatsAppRestart(false);
      }
      return res.status(503).json({
        error: "WhatsApp session became unstable and is restarting",
        details: err.message
      });
    }

    if (/wid|invalid|number/i.test(String(err.message || ""))) {
      return res.status(400).json({ error: "Invalid phone number", details: err.message });
    }

    res.status(500).json({ error: "Message failed", details: err.message });
  }
});

app.post("/api/whatsapp/reconnect", requireAuth, requireAdmin, async (req, res) => {
  try {
    setWhatsAppEnabled(true);
    queueWhatsAppRestart(false);
    res.json({
      success: true,
      queued: true,
      enabled: whatsappEnabled,
      state: whatsappState,
      qr: whatsappQR,
      busy: whatsappBusy
    });
  } catch (err) {
    res.status(500).json({ error: "تعذر إعادة تشغيل واتساب", details: err.message });
  }
});

app.post("/api/whatsapp/logout", requireAuth, requireAdmin, async (req, res) => {
  try {
    setWhatsAppEnabled(true);
    queueWhatsAppRestart(true);
    res.json({
      success: true,
      queued: true,
      enabled: whatsappEnabled,
      state: whatsappState,
      qr: whatsappQR,
      busy: whatsappBusy
    });
  } catch (err) {
    res.status(500).json({ error: "تعذر تسجيل خروج واتساب", details: err.message });
  }
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
app.post("/api/whatsapp/start", requireAuth, requireAdmin, async (req, res) => {
  try {
    setWhatsAppEnabled(true);
    queueWhatsAppRestart(false);
    res.json({
      success: true,
      queued: true,
      enabled: whatsappEnabled,
      state: whatsappState,
      qr: whatsappQR,
      busy: whatsappBusy
    });
  } catch (err) {
    res.status(500).json({ error: "تعذر تشغيل واتساب", details: err.message });
  }
});

app.post("/api/whatsapp/stop", requireAuth, requireAdmin, async (req, res) => {
  try {
    setWhatsAppEnabled(false);
    whatsappBusy = true;
    whatsappState = "stopping";
    whatsappQR = null;
    await destroyWhatsAppClient();
    whatsappBusy = false;
    whatsappState = "disabled";
    whatsappQR = null;
    res.json({
      success: true,
      enabled: whatsappEnabled,
      state: whatsappState,
      qr: whatsappQR,
      busy: whatsappBusy
    });
  } catch (err) {
    whatsappBusy = false;
    whatsappState = "disabled";
    whatsappQR = null;
    res.status(500).json({ error: "تعذر إيقاف واتساب", details: err.message });
  }
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    const dashboard = await buildDashboard(req.user);
    res.json(dashboard);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "تعذر تحميل لوحة التحكم", details: err.message });
  }
});

// ─── Contacts ─────────────────────────────────────────────────────────────────
app.get("/api/contacts", requireAuth, async (req, res) => {
  try {
    const where = {};
    if (req.query.unitId) {
      where.units = { some: { unitId: String(req.query.unitId) } };
    }
    if (req.query.unassigned === "true") {
      where.units = { none: {} };
    }

    const contacts = await getContacts({ user: req.user, where });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: "تعذر تحميل العملاء", details: err.message });
  }
});

app.get("/api/contacts/:identifier", requireAuth, async (req, res, next) => {
  try {
    const identifier = String(req.params.identifier || "");
    if (identifier === "search") return next();
    if (!identifier) return res.status(400).json({ error: "ظ…ط¹ط±ظپ ط§ظ„ط¹ظ…ظٹظ„ ظ…ط·ظ„ظˆط¨" });

    const contact = await getContactByIdentifier(identifier, {
      user: req.user,
      includeMessages: true,
      messageTake: 50
    });
    if (!contact) return res.status(404).json({ error: "ط§ظ„ط¹ظ…ظٹظ„ ط؛ظٹط± ظ…ظˆط¬ظˆط¯" });

    res.json({ contact });
  } catch (err) {
    res.status(500).json({ error: "طھط¹ط°ط± طھط­ظ…ظٹظ„ طھظپط§طµظٹظ„ ط§ظ„ط¹ظ…ظٹظ„", details: err.message });
  }
});

app.get("/api/messages", requireAuth, async (req, res) => {
  try {
    const identifier = String(req.query.contactIdentifier || "");
    if (!identifier) return res.status(400).json({ error: "ظ…ط¹ط±ظپ ط§ظ„ط¹ظ…ظٹظ„ ظ…ط·ظ„ظˆط¨" });

    const contact = await prisma.contact.findFirst({
      where: buildContactAccessWhere(req.user, { identifier }),
      select: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: Number(req.query.limit || 50)
        }
      }
    });
    if (!contact) return res.status(404).json({ error: "ط§ظ„ط¹ظ…ظٹظ„ ط؛ظٹط± ظ…ظˆط¬ظˆط¯" });

    res.json({
      messages: contact.messages.map(message => ({
        id: message.id,
        message: message.text,
        fromMe: message.fromMe,
        isoTime: message.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: "طھط¹ط°ط± طھط­ظ…ظٹظ„ ط§ظ„ط±ط³ط§ط¦ظ„", details: err.message });
  }
});

app.get("/api/contacts/search", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);
    const contacts = await prisma.contact.findMany({
      where: buildContactAccessWhere(req.user, {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { notes: { contains: q, mode: "insensitive" } }
        ]
      }),
      include: buildContactInclude(),
      orderBy: { updatedAt: "desc" },
      take: 50
    });
    res.json(filterContactsByUser(req.user, contacts).map(formatContact));
  } catch (err) {
    res.status(500).json({ error: "خطأ في البحث", details: err.message });
  }
});

app.post("/api/contacts/create", requireAuth, async (req, res) => {
  try {
    const phoneNumber = normalizePhone(req.body.phoneNumber);
    const firstMessage = String(req.body.firstMessage || "").trim().slice(0, 2000);
    const name = String(req.body.name || "").trim().slice(0, 200) || "عميل جديد";
    const requestedUnitIds = Array.isArray(req.body.unitIds) ? req.body.unitIds.filter(Boolean) : [];

    if (!phoneNumber) return res.status(400).json({ error: "رقم العميل مطلوب" });
    if (!/^\d{8,15}$/.test(phoneNumber)) return res.status(400).json({ error: "رقم الهاتف يجب أن يكون بين 8 و 15 رقماً" });

    const existing = await prisma.contact.findUnique({ where: { phone: phoneNumber } });
    if (existing) return res.status(409).json({ error: "هذا الرقم موجود بالفعل" });

    const assignedEmployee = req.user.role === "ADMIN"
      ? (typeof req.body.assignedEmployee === "string" ? req.body.assignedEmployee : null)
      : req.user.displayName;

    const created = await prisma.contact.create({
      data: {
        phone: phoneNumber,
        name,
        assignedEmployee,
        lastMessage: firstMessage || null,
        messagesCount: firstMessage ? 1 : 0,
        inboundCount: firstMessage ? 1 : 0,
        contactDate: firstMessage ? new Date() : null
      }
    });

    if (firstMessage) {
      await prisma.message.create({ data: { text: firstMessage, fromMe: false, contactId: created.id } });
    }
    await saveContactUnits(created.id, requestedUnitIds);

    const contact = await prisma.contact.findUnique({
      where: { id: created.id },
      include: { messages: true, units: { include: { unit: true } } }
    });
    res.status(201).json({ contact: formatContact(contact) });
  } catch (err) {
    res.status(500).json({ error: "تعذر إضافة العميل", details: err.message });
  }
});

app.post("/api/contacts/update", requireAuth, async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "");
    if (!identifier) return res.status(400).json({ error: "معرف العميل مطلوب" });

    const contact = await prisma.contact.findFirst({
      where: buildContactAccessWhere(req.user, { identifier })
    });
    if (!contact) return res.status(404).json({ error: "العميل غير موجود" });

    const unitIds = Array.isArray(req.body.unitIds) ? req.body.unitIds.filter(Boolean) : null;

    const payload = {
      stage: stageOptions.includes(req.body.stage) ? req.body.stage : undefined,
      interestStatus: typeof req.body.interestStatus === "string" ? req.body.interestStatus : (req.body.interestStatus === null ? null : undefined),
      contacted: typeof req.body.contacted === "boolean" ? req.body.contacted : undefined,
      contactDate: req.body.contactDate === null ? null : (req.body.contactDate ? safeDate(req.body.contactDate) : (req.body.contacted === true ? new Date() : (req.body.contacted === false ? null : undefined))),
      followUpAt: req.body.followUpAt === null ? null : (req.body.followUpAt ? safeDate(req.body.followUpAt) : undefined),
      notes: typeof req.body.notes === "string" ? req.body.notes.slice(0, 5000) : undefined,
      vip: typeof req.body.vip === "boolean" ? req.body.vip : undefined,
      replyStatus: typeof req.body.replyStatus === "string" ? req.body.replyStatus : undefined,
      whatsappTouched: typeof req.body.whatsappTouched === "boolean" ? req.body.whatsappTouched : undefined,
      assignedEmployee: req.user.role === "ADMIN"
        ? (typeof req.body.assignedEmployee === "string" ? req.body.assignedEmployee : undefined)
        : req.user.displayName,
      actionType: typeof req.body.actionType === "string" ? req.body.actionType : undefined,
      name: typeof req.body.name === "string" ? req.body.name.slice(0, 200) : undefined,
      phone: typeof req.body.phoneNumber === "string" ? normalizePhone(req.body.phoneNumber) : undefined
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    await prisma.contact.update({ where: { id: contact.id }, data: payload });
    if (unitIds) await saveContactUnits(contact.id, unitIds);

    const updated = await getContactByIdentifier(identifier, {
      user: req.user,
      includeMessages: true,
      messageTake: 50
    });
    res.json({ contact: updated });
  } catch (err) {
    res.status(500).json({ error: "تعذر حفظ التعديل", details: err.message });
  }
});

app.post("/api/contacts/delete", requireAuth, async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "");
    if (!identifier) return res.status(400).json({ error: "معرف العميل مطلوب" });
    const contact = await prisma.contact.findFirst({
      where: buildContactAccessWhere(req.user, { identifier }),
      select: { id: true }
    });
    if (!contact) return res.status(404).json({ error: "العميل غير موجود" });

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { contactId: contact.id } }),
      prisma.contactUnit.deleteMany({ where: { contactId: contact.id } }),
      prisma.contact.delete({ where: { id: contact.id } })
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "تعذر حذف العميل", details: err.message });
  }
});

// ─── Units ────────────────────────────────────────────────────────────────────
app.post("/api/units/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim().slice(0, 200);
    if (!title) return res.status(400).json({ error: "اسم الوحدة مطلوب" });
    const unit = await prisma.unit.create({ data: { title, status: "active" } });
    res.status(201).json({ unit });
  } catch (err) {
    res.status(500).json({ error: "تعذر إضافة الوحدة", details: err.message });
  }
});

app.post("/api/units/update", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.body.id || "");
    if (!id) return res.status(400).json({ error: "معرف الوحدة مطلوب" });
    const unit = await prisma.unit.update({
      where: { id },
      data: {
        title: typeof req.body.title === "string" ? req.body.title.slice(0, 200) : undefined,
        status: typeof req.body.status === "string" ? req.body.status : undefined
      }
    });
    res.json({ unit });
  } catch (err) {
    res.status(500).json({ error: "تعذر تحديث الوحدة", details: err.message });
  }
});

app.post("/api/units/delete", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.body.id || "");
    if (!id) return res.status(400).json({ error: "معرف الوحدة مطلوب" });
    await prisma.unit.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "تعذر حذف الوحدة", details: err.message });
  }
});

// ─── Employees ────────────────────────────────────────────────────────────────
app.post("/api/employees/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim().slice(0, 200);
    if (!name) return res.status(400).json({ error: "اسم الموظف مطلوب" });
    const employee = await prisma.employee.create({ data: { name, active: true } });
    res.status(201).json({ employee });
  } catch (err) {
    res.status(500).json({ error: "تعذر إضافة الموظف", details: err.message });
  }
});

app.post("/api/employees/delete", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.body.id || "");
    if (!id) return res.status(400).json({ error: "معرف الموظف مطلوب" });
    await prisma.employee.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "تعذر حذف الموظف", details: err.message });
  }
});

// ─── Ads ──────────────────────────────────────────────────────────────────────
app.post("/api/ads/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim().slice(0, 200);
    const startDate = safeDate(req.body.startDate);
    if (!name || !startDate) return res.status(400).json({ error: "اسم الإعلان وتاريخ البداية مطلوبان" });
    const adCampaign = await prisma.adCampaign.create({ data: { name, startDate, active: true } });
    res.status(201).json({ adCampaign });
  } catch (err) {
    res.status(500).json({ error: "تعذر إضافة الإعلان", details: err.message });
  }
});

app.post("/api/ads/update", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.body.id || "");
    if (!id) return res.status(400).json({ error: "معرف الإعلان مطلوب" });
    const adCampaign = await prisma.adCampaign.update({
      where: { id },
      data: {
        name: typeof req.body.name === "string" ? req.body.name : undefined,
        active: typeof req.body.active === "boolean" ? req.body.active : undefined,
        startDate: req.body.startDate ? safeDate(req.body.startDate) : undefined
      }
    });
    res.json({ adCampaign });
  } catch (err) {
    res.status(500).json({ error: "تعذر تحديث الإعلان", details: err.message });
  }
});

app.post("/api/ads/delete", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.body.id || "");
    if (!id) return res.status(400).json({ error: "معرف الإعلان مطلوب" });
    await prisma.adCampaign.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "تعذر حذف الإعلان", details: err.message });
  }
});

// ─── Users (Admin) ────────────────────────────────────────────────────────────
app.post("/api/users/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const displayName = String(req.body.displayName || "").trim().slice(0, 100);
    const password = String(req.body.password || "");
    const role = req.body.role === "ADMIN" ? "ADMIN" : "AGENT";
    if (!username || !displayName || !password) return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    if (password.length < 6) return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(409).json({ error: "اسم المستخدم موجود بالفعل" });
    const user = await prisma.user.create({ data: { username, displayName, role, passwordHash: hashPassword(password) } });
    res.status(201).json({ user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, active: user.active } });
  } catch (err) {
    res.status(500).json({ error: "تعذر إضافة المستخدم", details: err.message });
  }
});

app.post("/api/users/update", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.body.id || "");
    if (!id) return res.status(400).json({ error: "معرف المستخدم مطلوب" });
    const data = {};
    if (req.body.displayName) data.displayName = String(req.body.displayName).slice(0, 100);
    if (req.body.role) data.role = req.body.role === "ADMIN" ? "ADMIN" : "AGENT";
    if (typeof req.body.active === "boolean") data.active = req.body.active;
    if (req.body.password) {
      if (req.body.password.length < 6) return res.status(400).json({ error: "كلمة المرور قصيرة جداً" });
      data.passwordHash = hashPassword(req.body.password);
    }
    const user = await prisma.user.update({ where: { id }, data });
    res.json({ user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, active: user.active } });
  } catch (err) {
    res.status(500).json({ error: "تعذر تحديث المستخدم", details: err.message });
  }
});

// ─── Export ───────────────────────────────────────────────────────────────────
app.get("/api/export/contacts.csv", requireAuth, async (req, res) => {
  try {
    const contacts = await getContacts({ user: req.user });
    const csv = createCsv(contacts);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="contacts.csv"');
    res.send("\uFEFF" + csv); // BOM for Excel Arabic support
  } catch (err) {
    res.status(500).json({ error: "تعذر تصدير البيانات", details: err.message });
  }
});

app.get("/api/export/backup.json", requireAuth, requireAdmin, async (req, res) => {
  try {
    const dashboard = await buildDashboard(req.user);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="backup.json"');
    res.send(JSON.stringify({ ...dashboard, contacts }, null, 2));
  } catch (err) {
    res.status(500).json({ error: "تعذر تجهيز النسخة", details: err.message });
  }
});

app.post("/api/backup/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    ensureDirectory(backupDir);
    const [dashboard, contacts] = await Promise.all([
      buildDashboard(req.user),
      getContacts({ user: req.user, includeMessages: true, messageTake: 200 })
    ]);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(backupDir, `backup-${stamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ ...dashboard, contacts }, null, 2), "utf8");
    res.json({ backup: { targetDir: filePath } });
  } catch (err) {
    res.status(500).json({ error: "تعذر إنشاء النسخة الاحتياطية", details: err.message });
  }
});

// ─── WhatsApp Client ──────────────────────────────────────────────────────────
const whatsappSessionDir = path.join(__dirname, ".wwebjs_auth");

function bindWhatsAppEvents(instance) {
  instance.on("qr", qr => {
    if (!whatsappEnabled) {
      return;
    }
    qrcode.generate(qr, { small: true });
    whatsappBusy = false;
    whatsappState = "qr";
    whatsappQR = qr;
    logWhatsApp("qr");
    console.log("📱 Scan the QR code above to connect WhatsApp");
  });

  instance.on("ready", () => {
    if (!whatsappEnabled) {
      destroyWhatsAppClient().catch(err => console.warn("Could not stop WhatsApp after disabling:", err.message));
      return;
    }
    whatsappBusy = false;
    whatsappState = "ready";
    whatsappQR = null;
    logWhatsApp("ready");
    console.log("✅ WhatsApp ready");
  });

  instance.on("auth_failure", err => {
    whatsappBusy = false;
    whatsappState = whatsappEnabled ? "offline" : "disabled";
    whatsappQR = null;
    logWhatsApp("auth_failure", { message: err?.message || String(err) });
    console.error("WhatsApp auth failure:", err);
  });

  instance.on("disconnected", reason => {
    whatsappBusy = false;
    whatsappState = whatsappEnabled ? "offline" : "disabled";
    whatsappQR = null;
    logWhatsApp("disconnected", { reason });
    console.warn("WhatsApp disconnected:", reason);
  });

  instance.on("message", async msg => {
    try {
      const contactInfo = typeof msg?.getContact === "function" ? await msg.getContact() : null;
      const displayName = msg._data?.notifyName || msg._data?.pushname || contactInfo?.pushname || contactInfo?.name || "عميل جديد";
      const resolvedPhone = await resolveIncomingPhone(msg);
      if (!resolvedPhone) return;
      const contact = await ensureContactByPhone(resolvedPhone, displayName);

      await prisma.message.create({ data: { text: msg.body || "", fromMe: false, contactId: contact.id } });
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          phone: resolvedPhone,
          name: contact.name || displayName,
          lastMessage: msg.body || "",
          messagesCount: { increment: 1 },
          inboundCount: { increment: 1 },
          replyStatus: "replied",
          contactDate: new Date()
        }
      });
    } catch (err) {
      console.error("Failed to save WhatsApp message:", err);
    }
  });
}

async function destroyWhatsAppClient() {
  if (!client) return;

  const activeClient = client;
  client = null;

  try {
    await Promise.race([
      activeClient.destroy(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("WhatsApp destroy timeout")), 15000))
    ]);
  } catch (err) {
    console.warn("Could not destroy WhatsApp client cleanly:", err.message);
  }
}

async function removeWhatsAppSessionDir() {
  if (!fs.existsSync(whatsappSessionDir)) return;

  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(whatsappSessionDir, { recursive: true, force: true });
      if (!fs.existsSync(whatsappSessionDir)) return;
    } catch (err) {
      lastError = err;
    }

    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  if (fs.existsSync(whatsappSessionDir)) {
    throw lastError || new Error("Failed to remove WhatsApp session directory");
  }
}

async function initializeWhatsAppClient() {
  if (!whatsappEnabled) {
    whatsappBusy = false;
    whatsappState = "disabled";
    whatsappQR = null;
    return;
  }

  whatsappBusy = true;
  whatsappState = "connecting";
  whatsappQR = null;

  const instance = new Client({
    authStrategy: new LocalAuth(),
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0
  });

  bindWhatsAppEvents(instance);
  client = instance;

  try {
    await instance.initialize();
  } catch (err) {
    whatsappBusy = false;
    whatsappState = whatsappEnabled ? "offline" : "disabled";
    whatsappQR = null;
    console.error("Failed to initialize WhatsApp:", err);
    throw err;
  }
}

async function restartWhatsAppClient(clearSession = false) {
  if (!whatsappEnabled) {
    await destroyWhatsAppClient();
    whatsappBusy = false;
    whatsappState = "disabled";
    whatsappQR = null;
    return;
  }

  whatsappBusy = true;
  whatsappState = clearSession ? "resetting" : "connecting";
  whatsappQR = null;

  if (client) {
    await destroyWhatsAppClient();
  }

  if (clearSession) {
    await removeWhatsAppSessionDir();
  }

  await initializeWhatsAppClient();
}

function queueWhatsAppRestart(clearSession = false) {
  if (!whatsappEnabled) {
    return Promise.resolve({ skipped: true, reason: "disabled" });
  }

  if (whatsappRestartPromise) return whatsappRestartPromise;

  whatsappRestartPromise = (async () => {
    try {
      await restartWhatsAppClient(clearSession);
    } catch (err) {
      whatsappBusy = false;
      whatsappState = whatsappEnabled ? "offline" : "disabled";
      whatsappQR = null;
      console.error("WhatsApp restart failed:", err);
    } finally {
      whatsappRestartPromise = null;
    }
  })();

  return whatsappRestartPromise;
}

if (whatsappEnabled) {
  initializeWhatsAppClient().catch(err => console.error("Failed to initialize WhatsApp:", err));
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  ensureDirectory(backupDir);
  ensureSeeds().catch(err => console.error("Seed error:", err));
  console.log(`🚀 Server running on port ${port}`);
});

