"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight, Github, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

type Mode = "login" | "register" | "forgot" | "reset";

const copy = {
  login: { eyebrow: "Welcome back", title: "Sign in to your workspace", subtitle: "Your code review, right where you left it." },
  register: { eyebrow: "A better first review", title: "Create your workspace", subtitle: "Bring a file. Leave with a little more confidence." },
  forgot: { eyebrow: "Account recovery", title: "Reset your password", subtitle: "We’ll send a one-time link if an account exists." },
  reset: { eyebrow: "Account recovery", title: "Choose a new password", subtitle: "Use at least 10 characters for your new password." },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const { refresh } = useAuth();
  const text = copy[mode];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        const result = await signIn("credentials", { email, password, mode: "login", redirect: false });
        if (!result || result.error) throw new Error("Email or password is incorrect.");
        router.push("/dashboard");
      } else if (mode === "register") {
        const result = await signIn("credentials", { email, username, password, mode: "register", redirect: false });
        if (!result || result.error) throw new Error("Could not create your account. Check the details or try signing in.");
        router.push("/dashboard");
      } else if (mode === "forgot") {
        const result = await api.forgotPassword(email);
        setNotice(result.message);
      } else {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) throw new Error("This reset link is missing its token. Request a fresh link to continue.");
        await api.resetPassword(token, password);
        setNotice("Your password has been updated. You can sign in now.");
      }
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-24">
      <div aria-hidden className="grid-noise pointer-events-none absolute inset-x-0 top-0 h-[720px] opacity-30" />
      <div aria-hidden className="pointer-events-none absolute -top-64 left-1/2 size-[720px] -translate-x-1/2 rounded-full bg-violet-700/[.16] blur-[140px]" />
      <header className="absolute inset-x-0 top-0 z-10 border-b border-white/[.055] bg-[#080713]/45 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white"><Shield size={16} /></span><span className="text-sm font-semibold tracking-[-.04em] text-white">codeguard<span className="text-fuchsia-400">.</span>ai</span></Link>
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-zinc-400 transition hover:bg-white/[.05] hover:text-white"><ArrowLeft size={13} /> Back home</Link>
        </div>
      </header>
      <div className="relative z-10 w-full max-w-[460px] animate-fade-up pt-5">
        <div className="mb-7 flex flex-col items-center text-center">
          <Link href="/" className="mb-5 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white shadow-[0_0_36px_rgba(161,0,247,.3)]"><Shield size={22} /></Link>
          <span className="section-kicker">{text.eyebrow}</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-.055em] text-white">{text.title}</h1>
          <p className="mt-2 text-[13px] text-zinc-400">{text.subtitle}</p>
        </div>
        <Card className="p-6 sm:p-8">
          {(mode === "login" || mode === "register") && <>
            <button type="button" onClick={() => void signIn("github", { callbackUrl: "/dashboard" })} className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-violet-200/15 bg-white/[.045] text-[13px] font-medium text-zinc-100 transition hover:border-violet-200/30 hover:bg-white/[.08]"><Github size={16} /> Continue with GitHub</button>
            <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-white/[.07]" /><span className="text-[11px] text-zinc-600">or use email</span><span className="h-px flex-1 bg-white/[.07]" /></div>
          </>}
          <form onSubmit={onSubmit} className="space-y-5">
            {mode === "register" && <label className="block"><span className="mb-2 block text-[13px] font-medium text-zinc-300">Your name</span><Input autoComplete="name" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Alex Morgan" minLength={2} maxLength={80} required /></label>}
            {mode !== "reset" && <label className="block"><span className="mb-2 block text-[13px] font-medium text-zinc-300">Email address</span><Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" maxLength={320} required /></label>}
            {mode !== "forgot" && <label className="block"><span className="mb-2 block text-[13px] font-medium text-zinc-300">{mode === "reset" ? "New password" : "Password"}</span><Input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" minLength={10} maxLength={128} required /></label>}
            {mode === "login" && <div className="-mt-1 flex justify-end"><Link className="text-[12px] text-zinc-500 transition hover:text-purple-300" href="/forgot-password">Forgot password?</Link></div>}
            {error && <p role="alert" className="rounded-lg border border-rose-400/15 bg-rose-400/[.07] px-3 py-2.5 text-[12px] leading-5 text-rose-200">{error}</p>}
            {notice && <p role="status" className="rounded-lg border border-purple-400/15 bg-purple-400/[.06] px-3 py-2.5 text-[12px] leading-5 text-purple-200">{notice}</p>}
            <Button className="w-full" disabled={submitting} type="submit">{submitting ? <><Sparkles size={14} className="animate-pulse" /> Working…</> : <>{mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}<ArrowRight size={15} /></>}</Button>
          </form>
        </Card>
        <p className="mt-5 text-center text-[13px] text-zinc-600">
          {mode === "login" ? <>New to CodeGuard? <Link className="text-zinc-300 hover:text-purple-300" href="/register">Create an account</Link></> : mode === "register" ? <>Already have a workspace? <Link className="text-zinc-300 hover:text-purple-300" href="/login">Sign in</Link></> : <Link className="text-zinc-300 hover:text-purple-300" href="/login">Return to sign in</Link>}
        </p>
        {(mode === "login" || mode === "register") && <p className="mx-auto mt-8 max-w-[340px] text-center text-[11px] leading-5 text-zinc-700">By continuing, you agree to our <Link className="underline decoration-zinc-700 underline-offset-2 hover:text-zinc-400" href="/terms">Terms</Link> and <Link className="underline decoration-zinc-700 underline-offset-2 hover:text-zinc-400" href="/privacy">Privacy Policy</Link>.</p>}
      </div>
      <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-1.5 text-[11px] text-zinc-700"><ShieldCheck size={12} /> Your source code stays private</div>
    </main>
  );
}

