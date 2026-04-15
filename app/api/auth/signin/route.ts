import { usersCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");
const cookieName = "token";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        if (!password || typeof password !== "string") {
            return NextResponse.json({ error: "Password is required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const users = await usersCollection();

        const user = await users.findOne({ email: normalizedEmail });
        if (!user) {
            return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        const res = NextResponse.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

        res.cookies.set(cookieName, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7
        });

        return res;
    } catch (error) {
        return NextResponse.json({ error: "Failed to signin" }, { status: 500 });
    }
}