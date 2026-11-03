import { axiosClient } from "../../api/axiosClient.js";

export const authApi = {
  login: (email, password) => axiosClient.post("/auth/login", { email, password }),
  refresh: () => axiosClient.post("/auth/refresh"),
  logout: () => axiosClient.post("/auth/logout"),
  me: () => axiosClient.get("/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    axiosClient.post("/auth/change-password", { currentPassword, newPassword }),
};
