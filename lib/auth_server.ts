import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { usersCollection } from "./collections";
import type { User } from "../models/types";

const JWT_SECRET = process.env.JWT_SECRET!;
const cookieName = "token";

export async function getUserFromNextRequest(req: NextRequest): Promise<User | null> {
  const tokenCookie = req.cookies.get(cookieName)?.value;
  const authHeader = req.headers.get("authorization") ?? undefined;
  const bearer = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  const token = tokenCookie ?? bearer;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    const users = await usersCollection();
    const user = await users.findOne({ _id: decoded.userId });
    return user ?? null;
  } catch (err) {
    return null;
  }
}

export function requireAdminFromNextRequestSync(user: User | null) {
  if (!user || user.role !== "admin") {
    const res = new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    throw res;
  }
}
