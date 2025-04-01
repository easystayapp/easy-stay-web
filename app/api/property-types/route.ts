import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PropertType, { IPropertyType } from "@/models/property/PropertyType";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        await connectToDatabase();
        const propertyTypes = await PropertType.find({}).sort({ createdAt: -1 }).lean();
        return NextResponse.json(
            {
                message: "Property types are fetched",
                data: propertyTypes
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("property route error:", error);
        return NextResponse.json(
            { error: "Failed to load data" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {

        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: IPropertyType = await request.json();

        if (!body.name) {
            return NextResponse.json(
                { error: "Please fill required fields" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        await PropertType.create({
            ...body,
        });

        return NextResponse.json(
            { message: "Property Type added successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Property type error:", error);
        return NextResponse.json(
            { error: "Failed to add property type" },
            { status: 500 }
        );
    }
}