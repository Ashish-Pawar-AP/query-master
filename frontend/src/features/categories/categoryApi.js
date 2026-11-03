import { axiosClient } from "../../api/axiosClient.js";

export const categoryApi = {
  list: (params) => axiosClient.get("/categories", { params }),
  sidebar: () => axiosClient.get("/categories/sidebar"),
  get: (id) => axiosClient.get(`/categories/${id}`),
  create: (payload) => axiosClient.post("/categories", payload),
  update: (id, payload) => axiosClient.patch(`/categories/${id}`, payload),
  remove: (id) => axiosClient.delete(`/categories/${id}`),
};
