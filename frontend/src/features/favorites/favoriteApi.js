import { axiosClient } from "../../api/axiosClient.js";

// Membership only — no counts anywhere. Toggling a favorite touches exactly one small
// record (add/remove), nothing else.
export const favoriteApi = {
  list: () => axiosClient.get("/favorites"),
  add: (subModuleId) => axiosClient.post(`/favorites/${subModuleId}`),
  remove: (subModuleId) => axiosClient.delete(`/favorites/${subModuleId}`),
};
