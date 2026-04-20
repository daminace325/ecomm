import { getUserFromNextRequest } from "@/lib/auth_server";
import { usersCollection } from "@/lib/collections";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || typeof currentPassword !== "string") {
            return NextResponse.json({ error: "Current password is required" }, { status: 400 });
        }
        if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
            return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
        }
        if (currentPassword === newPassword) {
            return NextResponse.json({ error: "New password must be different from current password" }, { status: 400 });
        }

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const users = await usersCollection();
        await users.updateOne(
            { _id: user._id },
            { $set: { passwordHash } }
        );

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
    }
}
