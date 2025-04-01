import mongoose, { model, models, Schema } from "mongoose";

export interface IRoom {
    name: string;
    number: number;
    floor: number;
    size: {
        width: number;
        height: number;
    };
    furnishedTypeId: mongoose.Types.ObjectId[];
    bathroomType: 'attached' | 'common';
    sharingWith?: number;
    description: string;
    rent: number;
    electricityBill: 'included' | 'excluded';
    electricityChargeType: 'fixed' | 'unit';
    electricityCharge: number;
    waterBill: 'included' | 'excluded';
    waterChargeType: 'fixed' | 'ltr';
    waterCharge: number;
    extraCharge: number;
    propertyId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const roomSchema = new Schema<IRoom>(
    {
        name: { type: String },
        number: { type: Number, required: true },
        floor: { type: Number, required: true },
        size: {
            width: { type: Number },
            length: { type: Number },
        },
        furnishedTypeId: { type: [String], required: true },
        bathroomType: { type: String, enum: ["attached", "common"], default: "attached" },
        sharingWith: { type: Number },
        description: { type: String },
        rent: { type: Number, required: true },
        electricityBill: { type: String, enum: ["included", "excluded"], default: "included" },
        electricityChargeType: { type: String, enum: ["fixed", "unit"], default: "fixed" },
        electricityCharge: { type: Number },
        waterBill: { type: String, enum: ["included", "excluded"], default: "included" },
        waterChargeType: { type: String, enum: ["fixed", "ltr"], default: "fixed" },
        waterCharge: { type: Number },
        extraCharge: { type: Number },
        propertyId: { type: Schema.Types.String, ref: "Property", required: true }
    },
    { timestamps: true }
);

const Room = models?.Room || model<IRoom>("Room", roomSchema);

export default Room;