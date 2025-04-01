import { model, models, Schema } from "mongoose";

export interface IPropertyType {
    name: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const propertyTypeSchema = new Schema<IPropertyType>(
    {
        name: { type: String, required: true },
        description: { type: String },
    },
    { timestamps: true }
)

const PropertType = models?.PropertyType || model<IPropertyType>("PropertyType", propertyTypeSchema);

export default PropertType;