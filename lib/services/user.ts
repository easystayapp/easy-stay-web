import { IUser } from "@/models/user/User";
import { apiClient } from "../api-client";

type UserFormData = Omit<IUser, "_id">;

class user {
    async getUsers() {
        return apiClient.fetch<IUser[]>("/users");
    }

    async getUser(id: string) {
        return apiClient.fetch<IUser>(`/users/${id}`);
    }

    async createUser(userData: UserFormData) {
        return apiClient.fetch<IUser>("/users", {
            method: "POST",
            body: userData,
        });
    }
}

const userService = new user();
export default userService;