import { NextResponse } from "next/server";

const cookieName = "token";

export async function POST() {
    try {
        const res = NextResponse.json({ ok: true });

        res.cookies.set(cookieName, "", {
            httpOnly: true,
            expires: new Date(0),
            path: "/"
        });

        return res;
    } catch (err) {
        return NextResponse.json({ error: "Failed to signout" }, { status: 500 });
    }
}