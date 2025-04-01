import { model, models, Schema } from "mongoose";

export interface IAmenties {
    name: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
const amentiesSchema = new Schema<IAmenties>(
    {
        name: { type: String, required: true },
        description: { type: String },
    },
    { timestamps: true }
)

const Amenties = models?.Amenties || model<IAmenties>("Amenties", amentiesSchema);
export default Amenties;