import { Routes, Route, Navigate } from "react-router";
import { useAuthBootstrap } from "./features/auth/useAuth.js";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import { ROLES } from "./lib/roles.js";

import Login from "./features/auth/Login.jsx";
import Dashboard from "./features/dashboard/Dashboard.jsx";
import AdminPanel from "./features/admin/AdminPanel.jsx";
import SubModuleList from "./features/submodules/SubModuleList.jsx";
import SubModuleDetail from "./features/submodules/SubModuleDetail.jsx";
import SubModuleForm from "./features/submodules/SubModuleForm.jsx";
import Favorites from "./features/favorites/Favorites.jsx";
import Users from "./features/users/Users.jsx";
import Admins from "./features/users/Admins.jsx";
import Permissions from "./features/permissions/Permissions.jsx";
import Settings from "./features/settings/Settings.jsx";
import NotFound from "./components/common/NotFound.jsx";

// Content management (Categories/Modules/Queries, browsing, favoriting, permissions) is
// Admin-only. Super Admin's scope is intentionally limited to Admins + Users — with many
// Admins creating Categories/Modules/Queries, Super Admin doesn't need (and shouldn't
// need) visibility into all of it; that's exactly what Admin is for.
export default function App() {
  const ready = useAuthBootstrap();

  if (!ready) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />

          {/* Content: browsing, generating SQL, favoriting — Admin and User, not Super Admin */}
          <Route element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.USER]} />}>
            <Route path="/submodules" element={<SubModuleList />} />
            <Route path="/submodules/:id" element={<SubModuleDetail />} />
            <Route path="/favorites" element={<Favorites />} />
          </Route>

          {/* Content management — Admin only */}
          <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/submodules/new" element={<SubModuleForm />} />
            <Route path="/submodules/:id/edit" element={<SubModuleForm />} />
            <Route path="/permissions" element={<Permissions />} />
            <Route path="/permissions/:userId" element={<Permissions />} />
          </Route>

          {/* User management — Super Admin retains this */}
          <Route element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]} />}>
            <Route path="/users" element={<Users />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN]} />}>
            <Route path="/admins" element={<Admins />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
