import crypto from "crypto";
import { User, ROLES } from "../modules/users/user.model.js";
import { logger } from "./logger.js";

// Runs once at startup, after the DB connects, so there's never a manual "npm run seed"
// step standing between cloning the repo and having a working login. Idempotent — safe
// to run on every restart/redeploy, since it only ever creates the account once.
export async function ensureSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

  if (!email) {
    logger.warn(
      "SUPER_ADMIN_EMAIL is not set — skipping initial Super Admin creation. " +
        "Set SUPER_ADMIN_EMAIL (and optionally SUPER_ADMIN_PASSWORD) in your environment " +
        "and restart to bootstrap the first account."
    );
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return; // already bootstrapped — nothing to do on this and every subsequent boot
  }

  // If no password was supplied, generate a strong random one rather than shipping any
  // hardcoded default that could end up live in a real deployment. Only ever printed once,
  // at the moment the account is actually created.
  const generatedPassword = process.env.SUPER_ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");

  await User.create({ name, email, password: generatedPassword, role: ROLES.SUPER_ADMIN });

  logger.info(`Super Admin account created: ${email}`);
  if (!process.env.SUPER_ADMIN_PASSWORD) {
    logger.info(
      `Generated Super Admin password (shown once, not stored anywhere — save it now): ${generatedPassword}`
    );
  }
}
