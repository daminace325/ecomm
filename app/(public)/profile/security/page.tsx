import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default function SecurityPage() {
    return (
        <div>
            <h1 className="mb-2 text-2xl font-semibold text-white">Login & Security</h1>
            <p className="mb-6 text-sm text-slate-400">
                Change the password used to sign in to your account.
            </p>
            <ChangePasswordForm />
        </div>
    );
}
