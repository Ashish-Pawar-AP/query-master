import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null, // { id, name, email, role, status }
  status: "idle", // idle | authenticating | authenticated | unauthenticated
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.status = action.payload ? "authenticated" : "unauthenticated";
    },
    setAuthStatus(state, action) {
      state.status = action.payload;
    },
    clearAuth(state) {
      state.user = null;
      state.status = "unauthenticated";
    },
  },
});

export const { setUser, setAuthStatus, clearAuth } = authSlice.actions;
export default authSlice.reducer;

export const selectUser = (state) => state.auth.user;
export const selectAuthStatus = (state) => state.auth.status;
export const selectRole = (state) => state.auth.user?.role;
