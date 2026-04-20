import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import cloudinary from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const body = await req.json();
        const { publicId } = body;

        if (!publicId || typeof publicId !== "string") {
            return NextResponse.json({ error: "publicId is required" }, { status: 400 });
        }

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result !== "ok") {
            return NextResponse.json({ error: "Image not found or already deleted" }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
    }
}