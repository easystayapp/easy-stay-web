import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import SharingType, { ISharingType } from "@/models/property/SharingType";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        await connectToDatabase();
        const SharingTypes = await SharingType.find({}).sort({ createdAt: -1 }).lean();
        return NextResponse.json(
            {
                message: "User route",
                data: SharingTypes
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Sharing Types route error:", error);
        return NextResponse.json(
            { error: "Failed to load sharing type" },
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

        const body: ISharingType = await request.json();

        if (!body.name) {
            return NextResponse.json(
                { error: "Please fill required fields" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        await SharingType.create({
            ...body,
        });

        return NextResponse.json(
            { message: "Sharing type added successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("sharing type error:", error);
        return NextResponse.json(
            { error: "Failed to add sharing type" },
            { status: 500 }
        );
    }
}