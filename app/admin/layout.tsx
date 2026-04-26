import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/lib/auth_server";
import AdminSidebar from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getUserFromCookies();
    if (!user) redirect("/signin?next=/admin");
    if (user.role !== "admin") redirect("/");

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100">
            <AdminSidebar user={{ name: user.name, email: user.email }} />
            <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
    );
}
