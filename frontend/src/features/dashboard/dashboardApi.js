import { axiosClient } from "../../api/axiosClient.js";

export const dashboardApi = {
  get: () => axiosClient.get("/dashboard"),
};
