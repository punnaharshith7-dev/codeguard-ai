"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ArrowRight, 
  Bot, 
  Check, 
  CreditCard, 
  Globe, 
  HelpCircle, 
  Infinity as InfinityIcon, 
  RefreshCw, 
  Shield, 
  ShieldCheck, 
  Sparkles, 
  Zap 
} from "lucide-react";
import { Button } from "@/components/ui/button";

type BillingCycle = "monthly" | "yearly";
type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "AED";

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  exchangeMultiplier: number; // 1 INR = multiplier
}

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: "INR", symbol: "₹", name: "India (INR)", exchangeMultiplier: 1 },
  USD: { code: "USD", symbol: "$", name: "United States (USD)", exchangeMultiplier: 0.012 },
  EUR: { code: "EUR", symbol: "€", name: "Eurozone (EUR)", exchangeMultiplier: 0.011 },
  GBP: { code: "GBP", symbol: "£", name: "United Kingdom (GBP)", exchangeMultiplier: 0.0095 },
  AED: { code: "AED", symbol: "AED ", name: "UAE (AED)", exchangeMultiplier: 0.044 },
};

interface PlanTier {
  id: string;
  name: string;
  badge?: string;
  highlight?: boolean;
  description: string;
  monthlyINR: number;
  yearlyINR: number; // yearly price
  yearlyAnnualOfferDiscount: string; // e.g. "Save 10%" or "Save 27%"
  tokensMonthlyLabel: string;
  tokensYearlyLabel: string;
  features: string[];
  ctaText: string;
}

const PLANS: PlanTier[] = [
  {
    id: "developer-pro",
    name: "Developer Pro",
    badge: "Most Popular for Builders",
    description: "Ideal for individual developers & indie hackers seeking consistent AI fixes and vulnerability scans.",
    monthlyINR: 1200,
    yearlyINR: 13000,
    yearlyAnnualOfferDiscount: "Save ₹1,400 (10% OFF)",
    tokensMonthlyLabel: "1,500,000 AI Tokens / month",
    tokensYearlyLabel: "20,000,000 AI Tokens / year (Bonus 2M Included)",
    features: [
      "1,500,000 Tokens added every month",
      "Full AST & Secret Scanning across 30+ languages",
      "AI Patch generation & automated diff previews",
      "Unlimited manual code & config reviews",
      "Standard agent response speed with Groq / Llama 3.3",
      "SARIF report exports & CWE vulnerability badges",
      "Email support within 24 hours"
    ],
    ctaText: "Start Developer Pro",
  },
  {
    id: "team-scale",
    name: "Team Scale",
    badge: "Best Value for Teams",
    highlight: true,
    description: "Designed for scaling startups, engineering teams, and collaborative repository workflows.",
    monthlyINR: 2500,
    yearlyINR: 22000,
    yearlyAnnualOfferDiscount: "Save ₹8,000 (27% OFF)",
    tokensMonthlyLabel: "4,000,000 AI Tokens / month",
    tokensYearlyLabel: "55,000,000 AI Tokens / year (Massive Annual Bonus)",
    features: [
      "4,000,000 Tokens added every month",
      "Up to 10 shared team workspace seats",
      "Multi-file AI Agent refactor & architecture planning",
      "Automated GitHub Pull Request security checks",
      "Scheduled repo scans (daily / 6-hourly automated runs)",
      "Role-based access control (Admin, Member, Viewer)",
      "Priority inference latency & higher rate limits",
      "Priority engineering support"
    ],
    ctaText: "Upgrade to Team Scale",
  },
  {
    id: "enterprise-unlimited",
    name: "Enterprise Unlimited",
    badge: "Unlimited AI Power",
    description: "For high-velocity product teams and organizations that require unmetered AI operations.",
    monthlyINR: 5000,
    yearlyINR: 52000, // ₹5,000/mo or discounted annual
    yearlyAnnualOfferDiscount: "Save ₹8,000 (13% OFF)",
    tokensMonthlyLabel: "Unlimited AI Tokens every month",
    tokensYearlyLabel: "Unlimited AI Tokens with zero caps",
    features: [
      "Unlimited AI Tokens (Refreshes dynamically every month)",
      "Unrestricted AI Agent Studio prompts & multi-file patches",
      "Unlimited repository connections & branch tracking",
      "Unlimited team members & shared workspaces",
      "Custom rule suppression & compliance audits",
      "GitHub App continuous pull request gating",
      "Zero log retention enterprise privacy compliance",
      "Dedicated account manager & private Discord/Slack channel"
    ],
    ctaText: "Get Enterprise Unlimited",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("yearly");
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [autoPayEnabled, setAutoPayEnabled] = useState<boolean>(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const activeCurrency = CURRENCIES[currency];

  const formatPrice = (inrAmount: number) => {
    const converted = inrAmount * activeCurrency.exchangeMultiplier;
    if (activeCurrency.code === "INR") {
      return `${activeCurrency.symbol}${Math.round(converted).toLocaleString("en-IN")}`;
    }
    return `${activeCurrency.symbol}${converted.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const calculateMonthlyEquivalent = (yearlyInr: number) => {
    const perMonthInr = Math.round(yearlyInr / 12);
    return formatPrice(perMonthInr);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080713] text-white">
      {/* Background Aurora & Grid */}
      <div aria-hidden className="cg-aurora pointer-events-none absolute inset-x-0 top-0 h-[800px] bg-[radial-gradient(ellipse_54%_58%_at_50%_0%,rgba(106,33,220,.42),transparent_78%)]" />
      <div aria-hidden className="cg-grid-drift grid-noise pointer-events-none absolute inset-x-0 top-0 h-[800px] opacity-30" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[.055] bg-[#080713]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white shadow-[0_0_26px_rgba(161,0,247,.36)]">
              <Shield size={18} strokeWidth={2.3} />
            </span>
            <span className="text-[15px] font-semibold tracking-[-.04em]">codeguard<span className="text-fuchsia-400">.</span>ai</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden text-[13px] text-zinc-300 transition hover:text-white sm:inline-flex items-center gap-1.5">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <Link href="/login">
              <Button size="sm" variant="outline" className="h-9 rounded-lg border-white/[.12] bg-white/[.03] text-zinc-200">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        {/* Title & Kicker */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="section-kicker">
            <Sparkles size={12} className="text-violet-300" /> Flexible Pricing & Token Plans
          </span>
          <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-.055em] text-white">
            Supercharge your security reviews.<br />
            <span className="bg-gradient-to-r from-violet-200 via-fuchsia-300 to-purple-300 bg-clip-text text-transparent">
              Pay monthly or save annually.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-7 text-zinc-400 sm:text-[16px]">
            Every plan includes our unlimited static code & AST scanner. Upgrade to empower your AI Agent Studio with monthly tokens and automated GitHub gates.
          </p>
        </div>

        {/* Currency & Region Selector + Monthly/Yearly Toggle */}
        <div className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8">
          {/* Monthly / Yearly Switcher */}
          <div className="flex items-center rounded-2xl border border-white/[.09] bg-[#100d22]/90 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,.4)] backdrop-blur-xl">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${
                billing === "monthly" 
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,.35)]" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`relative rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${
                billing === "yearly" 
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,.35)]" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Annual Billing
              <span className="ml-2 rounded-full border border-amber-300/30 bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                Save up to 27%
              </span>
            </button>
          </div>

          {/* Region / Currency Dropdown */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/[.08] bg-[#120f26]/80 px-3.5 py-2">
            <Globe size={15} className="text-violet-300" />
            <label htmlFor="currency-select" className="text-[12px] font-medium text-zinc-400">Currency:</label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="bg-transparent text-[13px] font-medium text-white outline-none cursor-pointer"
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code} className="bg-[#120f26] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Autopay Toggle Notice */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-zinc-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={autoPayEnabled} 
              onChange={(e) => setAutoPayEnabled(e.target.checked)} 
              className="accent-fuchsia-500 rounded" 
            />
            <span className="flex items-center gap-1.5">
              <RefreshCw size={12} className={autoPayEnabled ? "text-emerald-400" : "text-zinc-500"} />
              Enable Auto-Renewal & Recurring Payment (Cancel anytime with 1 click)
            </span>
          </label>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isHighlight = plan.highlight;
            const price = billing === "monthly" ? formatPrice(plan.monthlyINR) : formatPrice(plan.yearlyINR);
            const tokenText = billing === "monthly" ? plan.tokensMonthlyLabel : plan.tokensYearlyLabel;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-[24px] border p-6 sm:p-8 transition-all duration-300 ${
                  isHighlight
                    ? "border-violet-300/40 bg-gradient-to-b from-[#1c123b]/95 to-[#0e0920]/95 shadow-[0_20px_70px_rgba(139,92,246,.25)] ring-1 ring-violet-400/30"
                    : "border-white/[.08] bg-[#0f0c20]/80 hover:border-violet-300/20 hover:shadow-[0_16px_50px_rgba(0,0,0,.45)]"
                }`}
              >
                {/* Highlight Badge */}
                {plan.badge && (
                  <div className="mb-4 inline-flex items-center gap-1.5 self-start rounded-full border border-violet-300/25 bg-violet-400/[.12] px-3 py-1 text-[11px] font-semibold text-violet-200">
                    <Sparkles size={11} /> {plan.badge}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">{plan.name}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-zinc-400 min-h-10">{plan.description}</p>

                  {/* Price Block */}
                  <div className="mt-6 border-b border-white/[.07] pb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{price}</span>
                      <span className="text-[13px] text-zinc-400 font-medium">
                        {billing === "monthly" ? "/ month" : "/ year"}
                      </span>
                    </div>

                    {/* Annual Offer Savings Tag */}
                    {billing === "yearly" && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-block rounded-md bg-emerald-400/15 border border-emerald-400/25 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          {plan.yearlyAnnualOfferDiscount}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          (approx. {calculateMonthlyEquivalent(plan.yearlyINR)}/mo)
                        </span>
                      </div>
                    )}

                    {/* Token Allowance Tag */}
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/[.08] p-3 text-[12px] text-violet-200">
                      {plan.id === "enterprise-unlimited" ? <InfinityIcon size={16} /> : <Zap size={16} className="text-amber-300" />}
                      <span className="font-semibold">{tokenText}</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-6 space-y-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">What’s included:</p>
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2.5 text-[13px] text-zinc-300">
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-300">
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call To Action Button */}
                <div className="mt-8 pt-4 border-t border-white/[.06]">
                  <Link href={`/login?plan=${plan.id}&cycle=${billing}`}>
                    <Button
                      size="lg"
                      className={`w-full h-12 rounded-xl text-[14px] font-semibold transition-all ${
                        isHighlight
                          ? "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white shadow-[0_8px_30px_rgba(168,85,247,.4)] hover:brightness-110"
                          : "border border-violet-300/25 bg-white/[.04] text-white hover:bg-white/[.09] hover:border-violet-300/40"
                      }`}
                    >
                      <CreditCard size={15} /> {plan.ctaText} <ArrowRight size={15} />
                    </Button>
                  </Link>

                  <p className="mt-2.5 text-center text-[10px] text-zinc-500">
                    {autoPayEnabled ? "Auto-renews dynamically · Cancel anytime" : "One-time cycle payment"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Free Plan Callout */}
        <div className="mt-12 rounded-2xl border border-white/[.07] bg-[#0c091a]/80 p-6 text-center sm:p-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:text-left">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-200">
                Always Free Forever
              </div>
              <h4 className="mt-2 text-lg font-bold text-white">Starter Free Tier</h4>
              <p className="mt-1 text-[12px] text-zinc-400">
                20,000 AI tokens reset every 24 hours automatically. Unlimited static AST & regex scans for all 30+ supported languages.
              </p>
            </div>
            <Link href="/register">
              <Button variant="outline" className="h-10 rounded-xl border-white/[.15] bg-white/[.03] text-zinc-200 px-6">
                Current Free Plan
              </Button>
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <div className="text-center">
            <span className="section-kicker">Billing Details</span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">Frequently Asked Questions</h2>
          </div>

          <div className="mx-auto mt-8 max-w-3xl divide-y divide-white/[.07] rounded-2xl border border-white/[.07] bg-[#0d0a1b]/60 p-6">
            <div className="py-4">
              <h4 className="text-[14px] font-semibold text-zinc-200">What happens when monthly tokens are exhausted?</h4>
              <p className="mt-1.5 text-[12px] leading-6 text-zinc-400">
                Your AST, secret, and OSV dependency scans remain 100% active and unlimited. The AI Agent will pause until the next monthly billing cycle, or you can purchase an instant token booster pack.
              </p>
            </div>
            <div className="py-4">
              <h4 className="text-[14px] font-semibold text-zinc-200">How does AutoPay / recurring subscription work?</h4>
              <p className="mt-1.5 text-[12px] leading-6 text-zinc-400">
                With AutoPay enabled, your subscription renews seamlessly at the end of each billing cycle (monthly or yearly). You can cancel your subscription at any time with a single click in your account settings.
              </p>
            </div>
            <div className="py-4">
              <h4 className="text-[14px] font-semibold text-zinc-200">Are payments processed securely?</h4>
              <p className="mt-1.5 text-[12px] leading-6 text-zinc-400">
                Yes. We integrate with PCI-DSS Level 1 certified payment gateways (Razorpay & Stripe). CodeGuard does not store your card or banking credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[.07] bg-[#070610]/75 py-8 text-center text-[11px] text-zinc-600">
        <p>© 2026 CodeGuard AI. All payments processed with end-to-end encryption.</p>
      </footer>
    </main>
  );
}
