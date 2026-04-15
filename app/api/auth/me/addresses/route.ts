import { getUserFromNextRequest } from "@/lib/auth_server";
import { usersCollection } from "@/lib/collections";
import { AddressSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        return NextResponse.json({ addresses: user.addresses ?? [] });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const parsed = AddressSchema.safeParse(body);
        if (!parsed.success) {
            const flattenedParsed = z.flattenError(parsed.error);
            return NextResponse.json({ error: flattenedParsed.fieldErrors }, { status: 400 });
        }

        const users = await usersCollection();
        await users.updateOne(
            { _id: user._id },
            { $push: { addresses: parsed.data } }
        );

        const updated = await users.findOne({ _id: user._id });
        return NextResponse.json({ addresses: updated?.addresses ?? [] }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: "Failed to add address" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const index = Number(url.searchParams.get("index"));

        if (isNaN(index) || index < 0 || !user.addresses || index >= user.addresses.length) {
            return NextResponse.json({ error: "Invalid address index" }, { status: 400 });
        }

        const body = await req.json();
        const parsed = AddressSchema.safeParse(body);
        if (!parsed.success) {
            const flattenedParsed = z.flattenError(parsed.error);
            return NextResponse.json({ error: flattenedParsed.fieldErrors }, { status: 400 });
        }

        const users = await usersCollection();
        await users.updateOne(
            { _id: user._id },
            { $set: { [`addresses.${index}`]: parsed.data } }
        );

        const updated = await users.findOne({ _id: user._id });
        return NextResponse.json({ addresses: updated?.addresses ?? [] });
    } catch (err) {
        return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const index = Number(url.searchParams.get("index"));

        if (isNaN(index) || index < 0 || !user.addresses || index >= user.addresses.length) {
            return NextResponse.json({ error: "Invalid address index" }, { status: 400 });
        }

        const addresses = [...user.addresses];
        addresses.splice(index, 1);

        const users = await usersCollection();
        await users.updateOne(
            { _id: user._id },
            { $set: { addresses } }
        );

        return NextResponse.json({ addresses });
    } catch (err) {
        return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
    }
}
