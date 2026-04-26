import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { cache } from "react";
import jwt from "jsonwebtoken";
import { usersCollection } from "./collections";
import type { User } from "../models/types";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");
const cookieName = "token";

export async function getUserFromNextRequest(req: NextRequest): Promise<User | null> {
  const tokenCookie = req.cookies.get(cookieName)?.value;
  const authHeader = req.headers.get("authorization") ?? undefined;
  const bearer = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  const token = tokenCookie ?? bearer;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as { userId: string; role: string };
    const users = await usersCollection();
    const user = await users.findOne({ _id: decoded.userId });
    return user ?? null;
  } catch (err) {
    return null;
  }
}

// Wrapped in React's cache() so multiple server components in the same render
// pass share a single DB lookup (e.g. layout + page + nested server component).
export const getUserFromCookies = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as { userId: string; role: string };
    const users = await usersCollection();
    const user = await users.findOne({ _id: decoded.userId });
    return user ?? null;
  } catch {
    return null;
  }
});

export function requireAdminFromNextRequestSync(user: User | null) {
  if (!user || user.role !== "admin") {
    const res = new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    throw res;
  }
}
