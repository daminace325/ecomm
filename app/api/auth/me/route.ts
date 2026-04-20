import { getUserFromNextRequest } from "@/lib/auth_server";
import { usersCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                addresses: user.addresses ?? []
            }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { name } = body;

        if (typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const users = await usersCollection();
        await users.updateOne(
            { _id: user._id },
            { $set: { name: name.trim() } }
        );

        const updated = await users.findOne({ _id: user._id });
        if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

        return NextResponse.json({
            user: {
                _id: updated._id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
                addresses: updated.addresses ?? []
            }
        });
    } catch (err) {
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}