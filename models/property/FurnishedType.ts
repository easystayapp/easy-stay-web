import { model, models, Schema } from "mongoose";

export interface IFurnishedType {
    name: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const furnishedTypeSchema = new Schema<IFurnishedType>(
    {
        name: { type: String, required: true },
        description: { type: String },
    },
    { timestamps: true }
)

const FurnishedType = models?.FurnishedType || model<IFurnishedType>("FurnishedType", furnishedTypeSchema);

export default FurnishedType;