import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import cloudinary from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
                { status: 400 }
            );
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: "File too large. Max 5MB" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    { folder: "ecomm/products", resource_type: "image" },
                    (error, result) => {
                        if (error || !result) return reject(error);
                        resolve({ secure_url: result.secure_url, public_id: result.public_id });
                    }
                )
                .end(buffer);
        });

        return NextResponse.json(
            { url: result.secure_url, publicId: result.public_id },
            { status: 201 }
        );
    } catch (err) {
        if (err instanceof Response) throw err;

        return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
        );
    }
}