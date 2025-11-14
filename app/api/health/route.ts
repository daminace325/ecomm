import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
    try {
        const db = await getDb();
        await db.command({ping: 1});
        return NextResponse.json({ok: true, mongo: "up"});
    } catch (e: any) {
        return NextResponse.json({ok: false, error: e?.message || "mongo error"}, {status: 500});
    }
}