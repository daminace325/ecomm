"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton({ className }: { className?: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleClick() {
        setLoading(true);
        try {
            await fetch("/api/auth/signout", { method: "POST" });
            router.push("/");
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className={className}
        >
            {loading ? "Signing out..." : "Sign out"}
        </button>
    );
}
