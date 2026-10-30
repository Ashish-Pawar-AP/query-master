import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../users/user.model.js";
import {
  signAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  cookieOptions,
} from "../../utils/tokens.js";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "This account has been disabled");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user);
  res.cookie("refreshToken", refreshToken, cookieOptions());

  res.json({ success: true, data: { accessToken, user: user.toSafeObject() } });
});

export const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (!raw) {
    throw new ApiError(401, "Refresh token missing");
  }

  const verified = await verifyRefreshToken(raw).catch(() => null);
  if (!verified) {
    throw new ApiError(401, "Refresh token invalid or expired");
  }

  const user = await User.findById(verified.payload.sub);
  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(401, "Account not found or disabled");
  }

  const accessToken = signAccessToken(user);
  res.json({ success: true, data: { accessToken, user: user.toSafeObject() } });
});

export const logout = asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (raw) {
    await revokeRefreshToken(raw);
  }
  res.clearCookie("refreshToken", cookieOptions());
  res.json({ success: true, message: "Logged out" });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current and new password are required");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: "Password updated successfully" });
});
