// frontend/src/services/userService.js
import apiClient from "./api";

export async function getUsers() {
    const res = await apiClient.get("/users");
    return res.data;
}

export async function activateUser(id) {
    const res = await apiClient.patch(`/users/${id}/activate`);
    return res.data;
}