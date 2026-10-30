import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User, ROLES } from "../users/user.model.js";
import { Note } from "../notes/note.model.js";

// GET /api/users?role=USER|ADMIN
// Admin sees only the Users they personally created — not Users created by other Admins.
// Super Admin sees everyone (Admins + Users, across all Admins) — that's their whole job.
export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) {
    filter.role = req.query.role;
  } else if (req.user.role === ROLES.ADMIN) {
    filter.role = ROLES.USER;
  } else {
    filter.role = { $ne: ROLES.SUPER_ADMIN };
  }

  if (req.user.role === ROLES.ADMIN) {
    filter.createdBy = req.user._id;
  }

  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: users.map(({ password, ...u }) => u) });
});

// Throws unless the requesting Admin created this specific user account. Super Admin
// bypasses this (they manage everyone); Admin only ever touches their own.
function assertOwnsUser(requester, targetUser) {
  if (requester.role === ROLES.ADMIN && (!targetUser.createdBy || !targetUser.createdBy.equals(requester._id))) {
    throw new ApiError(403, "You do not have access to this user account");
  }
}

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  assertOwnsUser(req.user, user);
  res.json({ success: true, data: user.toSafeObject() });
});

// Admin can only create USER role. Super Admin can create USER or ADMIN role.
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }
  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  let targetRole = ROLES.USER;
  if (req.user.role === ROLES.SUPER_ADMIN && role === ROLES.ADMIN) {
    targetRole = ROLES.ADMIN;
  } else if (role && role !== ROLES.USER) {
    throw new ApiError(403, "Only a Super Admin can create Admin accounts");
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new ApiError(409, "A user with this email already exists");

  const user = await User.create({ name, email, password, role: targetRole, createdBy: req.user._id });

  res.status(201).json({ success: true, data: user.toSafeObject() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.role === ROLES.ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Only a Super Admin can modify Admin accounts");
  }
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Super Admin accounts cannot be modified here");
  }
  assertOwnsUser(req.user, user);

  const { name, status } = req.body;
  if (name) user.name = name;
  if (status) user.status = status;
  await user.save();
  res.json({ success: true, data: user.toSafeObject() });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.role === ROLES.ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Only a Super Admin can remove Admin accounts");
  }
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Super Admin accounts cannot be deleted");
  }
  assertOwnsUser(req.user, user);

  await user.deleteOne();
  await Note.deleteMany({ user: user._id });
  res.json({ success: true, message: "User removed" });
});
