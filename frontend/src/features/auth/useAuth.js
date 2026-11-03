import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authApi } from "./authApi.js";
import { setAccessToken, setUnauthorizedHandler } from "../../api/axiosClient.js";
import { setUser, clearAuth, setAuthStatus, selectUser, selectAuthStatus } from "./authSlice.js";

// Bootstraps the session on app load by attempting a silent refresh (the httpOnly cookie
// carries the refresh token). Also exposes login/logout that keep Redux + axios in sync.
export function useAuthBootstrap() {
  const dispatch = useDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(clearAuth());
    });

    async function bootstrap() {
      dispatch(setAuthStatus("authenticating"));
      try {
        const { data } = await authApi.refresh();
        setAccessToken(data.data.accessToken);
        dispatch(setUser(data.data.user));
      } catch {
        setAccessToken(null);
        dispatch(clearAuth());
      } finally {
        setReady(true);
      }
    }
    bootstrap();
  }, [dispatch]);

  return ready;
}

export function useAuth() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const status = useSelector(selectAuthStatus);

  const login = useCallback(
    async (email, password) => {
      const { data } = await authApi.login(email, password);
      setAccessToken(data.data.accessToken);
      dispatch(setUser(data.data.user));
      return data.data.user;
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      dispatch(clearAuth());
    }
  }, [dispatch]);

  return { user, status, login, logout, isAuthenticated: status === "authenticated" };
}
