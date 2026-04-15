import { usersCollection } from "@/lib/collections";
import { newId } from "@/lib/id";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password } = body;

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }
        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }
        if (!password || typeof password !== "string" || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const users = await usersCollection();

        const existing = await users.findOne({ email: normalizedEmail });
        if (existing) {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 })
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const now = new Date().toISOString();
        const _id = newId();

        const user = {
            _id,
            name,
            email: normalizedEmail,
            passwordHash,
            role: "user" as const,
            createdAt: now
        }

        await users.insertOne(user);

        return NextResponse.json(
            {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            },
            { status: 201 }
        )
    } catch (err) {
        return NextResponse.json({ error: "Failed to signup" }, { status: 500 });
    }
}