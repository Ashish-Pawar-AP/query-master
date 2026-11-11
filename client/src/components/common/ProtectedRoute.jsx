import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../features/auth/useAuth.js";
import Spinner from "./Spinner.jsx";

// Guards a route subtree behind authentication, and optionally a set of allowed roles.
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, status, user } = useAuth();
  const location = useLocation();

  if (status === "idle" || status === "authenticating") {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <Spinner label="Checking session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
