import { getUserFromCookies } from "@/lib/auth_server";
import AddressesManager from "@/components/AddressesManager";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
    const user = (await getUserFromCookies())!;
    return (
        <div>
            <h1 className="mb-6 text-2xl font-semibold text-white">Your Addresses</h1>
            <AddressesManager initialAddresses={user.addresses ?? []} />
        </div>
    );
}
