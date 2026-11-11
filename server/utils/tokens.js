import jwt from "jsonwebtoken";
import crypto from "crypto";
import { RefreshToken } from "../modules/auth/refreshToken.model.js";
import { logger } from "./logger.js";

function accessExpiryMs() {
  return process.env.JWT_ACCESS_EXPIRES || "15m";
}

function refreshExpiryMs() {
  return process.env.JWT_REFRESH_EXPIRES || "7d";
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: accessExpiryMs() }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(user) {
  const raw = jwt.sign(
    { sub: user._id.toString(), jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: refreshExpiryMs() }
  );
  const decoded = jwt.decode(raw);
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(raw),
    expiresAt: new Date(decoded.exp * 1000),
  });
  return raw;
}

export async function verifyRefreshToken(raw) {
  const payload = jwt.verify(raw, process.env.JWT_REFRESH_SECRET);
  const record = await RefreshToken.findOne({
    user: payload.sub,
    tokenHash: hashToken(raw),
    revoked: false,
  });
  if (!record || record.expiresAt < new Date()) {
    return null;
  }
  return { payload, record };
}

export async function revokeRefreshToken(raw) {
  const hash = hashToken(raw);
  await RefreshToken.updateMany({ tokenHash: hash }, { $set: { revoked: true } });
}

// Checked once at startup, not per-request — this is an env var misconfiguration, not
// something that changes at runtime. A misconfigured combo fails silently in the browser
// (the cookie is just never set, no error visible anywhere) and looks exactly like a
// login bug, so it's worth surfacing loudly here instead of leaving it to be debugged
// blind later.
if (process.env.COOKIE_SAMESITE === "none" && process.env.COOKIE_SECURE !== "true") {
  logger.warn(
    "COOKIE_SAMESITE=none requires COOKIE_SECURE=true — browsers silently reject the cookie otherwise. " +
      "Check these two env vars if login/refresh isn't working after deploy."
  );
}

export function cookieOptions() {
  // Local dev serves frontend and backend from different ports on http://localhost — that
  // still counts as "cross-site" to a browser, but sameSite=none is rejected outright
  // unless secure=true, which http:// can't satisfy. "lax" works over plain http locally
  // because both ports share the same site (localhost). In a real deployment (frontend on
  // Vercel, backend on Render — different domains entirely, both on https), sameSite=lax
  // would silently stop the refresh cookie from being sent on cross-origin fetch/XHR calls,
  // breaking the whole silent-refresh login flow. Set COOKIE_SAMESITE=none in production.
  const sameSite = process.env.COOKIE_SAMESITE || "lax";
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite,
    path: "/api/auth",
  };
}
