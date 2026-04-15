import { getUserFromNextRequest } from "@/lib/auth_server";
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