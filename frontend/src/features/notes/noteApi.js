import { axiosClient } from "../../api/axiosClient.js";

export const noteApi = {
  list: (subModuleId) => axiosClient.get("/notes", { params: { subModule: subModuleId } }),
  create: (subModuleId, text) => axiosClient.post("/notes", { subModule: subModuleId, text }),
  update: (id, text) => axiosClient.patch(`/notes/${id}`, { text }),
  remove: (id) => axiosClient.delete(`/notes/${id}`),
};
