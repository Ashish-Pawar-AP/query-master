import { axiosClient } from "../../api/axiosClient.js";

export const moduleApi = {
  list: (params) => axiosClient.get("/modules", { params }),
  create: (payload) => axiosClient.post("/modules", payload),
  update: (id, payload) => axiosClient.patch(`/modules/${id}`, payload),
  remove: (id) => axiosClient.delete(`/modules/${id}`),
};
