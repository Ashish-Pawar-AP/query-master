export const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
});

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.USER]: "User",
};

export const QUERY_TYPES = ["INSERT", "UPDATE", "DELETE", "SELECT"];

export const DATA_TYPES = [
  "STRING",
  "INTEGER",
  "DECIMAL",
  "BOOLEAN",
  "DATE",
  "DATETIME",
  "ARRAY",
  "JSON",
  "NULL",
  "CUSTOM",
];

export const PERMISSION_ACTIONS = ["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE"];
