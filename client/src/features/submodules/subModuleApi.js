import { axiosClient } from "../../api/axiosClient.js";

// A Sub Module IS a query (name/category/module + the query definition all live on the
// same record). No favorite/copy/view tracking here — those were removed because they
// grew storage on every read action as usage increased. `generate` builds the SQL from
// the template + supplied values; it's used for both previewing and the "Copy" action,
// since there's nothing left to distinguish them.
export const subModuleApi = {
  list: (params) => axiosClient.get("/submodules", { params }),
  get: (id) => axiosClient.get(`/submodules/${id}`),
  create: (payload) => axiosClient.post("/submodules", payload),
  update: (id, payload) => axiosClient.patch(`/submodules/${id}`, payload),
  remove: (id) => axiosClient.delete(`/submodules/${id}`),
  generate: (id, payload) => axiosClient.post(`/submodules/${id}/generate`, payload),
};
