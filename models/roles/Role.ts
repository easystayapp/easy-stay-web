import { model, models, Schema } from "mongoose";

export interface IRole {
    name: string;
    description: string;
    createdAt?: Date;
    updatedAt?: Date;
}
const roleSchema = new Schema<IRole>(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
    },
    { timestamps: true }
)

const Role = models?.Role || model<IRole>("Role", roleSchema);
export default Role;