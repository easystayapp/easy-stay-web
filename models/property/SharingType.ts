import { model, models, Schema } from "mongoose";

export interface ISharingType {
    name: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const sharingTypeSchema = new Schema<ISharingType>(
    {
        name: { type: String, required: true },
        description: { type: String },
    },
    { timestamps: true }
)

const SharingType = models?.SharingType || model<ISharingType>("SharingType", sharingTypeSchema);

export default SharingType;