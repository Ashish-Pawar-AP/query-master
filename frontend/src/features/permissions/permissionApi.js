import { axiosClient } from "../../api/axiosClient.js";

export const permissionApi = {
  list: (userId) => axiosClient.get(`/permissions/${userId}`),
  set: (userId, grants) => axiosClient.put(`/permissions/${userId}`, { grants }),
};
