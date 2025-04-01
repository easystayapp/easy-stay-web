import mongoose from "mongoose";
import dotenv from "dotenv";
import Amenties from "@/models/property/Amenties";
import FurnishedType from "@/models/property/FurnishedType";
import PropertType from "@/models/property/PropertyType";
import SharingType from "@/models/property/SharingType";
import { connectToDatabase } from "@/lib/db";


dotenv.config(); // Load environment variables

const seedData = async () => {
    try {
        await connectToDatabase(); // Connect to MongoDB

        console.log("Connected to MongoDB ✅");

        // Define seeding data
        const amenities = [
            { name: "WiFi", description: "High-speed internet connection" },
            { name: "Parking", description: "Ample parking space available" },
            { name: "Swimming Pool", description: "Access to a private swimming pool" },
        ];

        const furnishedTypes = [
            { name: "Fully Furnished", description: "Includes all necessary furniture" },
            { name: "Semi Furnished", description: "Some essential furniture included" },
            { name: "Unfurnished", description: "No furniture provided" },
        ];

        const propertyTypes = [
            { name: "Apartment", description: "Self-contained residential unit" },
            { name: "Villa", description: "Independent luxurious house" },
            { name: "PG", description: "Paying guest accommodation" },
        ];

        const sharingTypes = [
            { name: "Single Occupancy", description: "Room for one person" },
            { name: "Double Occupancy", description: "Room shared between two people" },
            { name: "Triple Occupancy", description: "Room shared between three people" },
        ];

        // Insert Data
        await Amenties.insertMany(amenities);
        await FurnishedType.insertMany(furnishedTypes);
        await PropertType.insertMany(propertyTypes);
        await SharingType.insertMany(sharingTypes);

        console.log("Data seeded successfully 🎉");
        mongoose.connection.close();
    } catch (error) {
        console.error("Error seeding data ❌:", error);
        mongoose.connection.close();
    }
};

seedData();
