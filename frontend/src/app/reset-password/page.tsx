import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export default function ResetPasswordPage() { return <Suspense fallback={<main className="grid min-h-screen place-items-center text-sm text-zinc-500">Loading…</main>}><AuthForm mode="reset" /></Suspense>; }

