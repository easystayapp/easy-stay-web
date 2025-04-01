import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Property, { IProperty } from "@/models/property/Property";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        await connectToDatabase();
        const property = await Property.find({}).sort({ createdAt: -1 }).lean();
        return NextResponse.json(
            {
                message: "User route",
                data: property
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("property route error:", error);
        return NextResponse.json(
            { error: "Failed to load user route" },
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

        const body: IProperty = await request.json();

        if (!body.title || !body.description || !body.price || !body.location) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        await Property.create({
            ...body,
        });

        return NextResponse.json(
            { message: "Property added successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Property error:", error);
        return NextResponse.json(
            { error: "Failed to add property" },
            { status: 500 }
        );
    }
}