import { axiosClient } from "../../api/axiosClient.js";

export const userApi = {
  list: (params) => axiosClient.get("/users", { params }),
  get: (id) => axiosClient.get(`/users/${id}`),
  create: (payload) => axiosClient.post("/users", payload),
  update: (id, payload) => axiosClient.patch(`/users/${id}`, payload),
  remove: (id) => axiosClient.delete(`/users/${id}`),
};
