import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true, default: ROLES.USER },
    status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastLoginAt: { type: Date, default: null },
    // Most-recently-viewed queries, newest first. Kept as a small bounded list on the user
    // document itself rather than a growing log — opening a query is by far the highest-
    // frequency action in the app, so this stays capped instead of creating new records.
    recentlyViewed: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubModule" }], default: [] },
  },
  { timestamps: true }
);

// Async hooks resolve by returning (or throwing) — Mongoose 9 no longer passes a `next`
// callback to them, so calling next() here would throw "next is not a function".
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model("User", userSchema);
