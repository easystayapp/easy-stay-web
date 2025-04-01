import { IProperty } from "@/models/property/Property";
import { apiClient } from "../api-client";

type PropertyFormData = Omit<IProperty, "_id">;

class property {
    async getProperties() {
        return apiClient.fetch<IProperty[]>("/properties");
    }

    async getProperty(id: string) {
        return apiClient.fetch<IProperty>(`/properties/${id}`);
    }

    async createProperty(propertyData: PropertyFormData) {
        return apiClient.fetch<IProperty>("/properties", {
            method: "POST",
            body: propertyData,
        });
    }
}

const propertyService = new property();
export default propertyService;