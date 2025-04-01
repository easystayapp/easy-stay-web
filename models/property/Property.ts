import mongoose, { Schema, model, models } from "mongoose";

export interface IProperty {
    title: string;
    description: string;
    price: number;
    location: string;
    propertyType: mongoose.Types.ObjectId[];
    areaSize?: number; // in square feet or meters
    floors?: number;
    roomsPerFloor?: number;
    furnishedType?: mongoose.Types.ObjectId[];
    amenities?: mongoose.Types.ObjectId[];
    pgType?: "boys" | "girls" | "co-living";
    securityDeposit?: number;
    policies?: string;
    extraCharges?: number;
    contactDetails?: { name: string; phone: string; email?: string };
    images?: string[];
    owner: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const propertySchema = new Schema<IProperty>(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        location: { type: String, required: true },
        propertyType: { type: [Schema.Types.ObjectId], ref: "PropertyType", required: true },
        areaSize: { type: Number },
        floors: { type: Number, default: 1 },
        roomsPerFloor: { type: Number, default: 1 },
        furnishedType: { type: [Schema.Types.ObjectId], ref: "FurnishedType" },
        amenities: { type: [Schema.Types.ObjectId], ref: "Amenties" },
        pgType: { type: String, enum: ["boys", "girls", "co-living"] },
        securityDeposit: { type: Number, default: 0 },
        policies: { type: String },
        extraCharges: { type: Number, default: 0 },
        contactDetails: {
            name: { type: String, required: true },
            phone: { type: String, required: true },
            email: { type: String }
        },
        images: { type: [String], default: [] },
        owner: { type: String, ref: "User", required: true },
    },
    { timestamps: true }
);

const Property = models?.Property || model<IProperty>("Property", propertySchema);

export default Property;
