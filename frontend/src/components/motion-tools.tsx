"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Command, Gauge, Search, Shield, X } from "lucide-react";
import { useMotionSettings } from "@/components/motion-system-provider";
import { MOTION, type MotionIntensity } from "@/lib/motion/tokens";

const commands = [
  { label: "Home", detail: "CodeGuard overview", href: "/", icon: Shield },
  { label: "Platform features", detail: "Static analysis and security review", href: "/#features", icon: Search },
  { label: "How it works", detail: "Review workflow", href: "/#workflow", icon: ArrowRight },
  { label: "Frequently asked questions", detail: "Answers about CodeGuard", href: "/#faq", icon: Search },
  { label: "Pricing", detail: "Plans and pricing", href: "/pricing", icon: Gauge },
  { label: "Sign in", detail: "Open your account", href: "/login", icon: ArrowRight },
  { label: "Create account", detail: "Get started with CodeGuard", href: "/register", icon: ArrowRight },
  { label: "Projects", detail: "Dashboard projects", href: "/dashboard/projects", icon: Shield },
  { label: "Agent Studio", detail: "Open the browser workspace", href: "/dashboard/agent", icon: Command },
  { label: "Trust Center", detail: "Review trust settings", href: "/dashboard/trust", icon: Shield },
  { label: "Privacy policy", detail: "Privacy details", href: "/privacy", icon: Shield },
  { label: "Terms of service", detail: "Terms and conditions", href: "/terms", icon: Shield },
];

const paletteVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: MOTION.duration.base, ease: MOTION.ease.standard } },
  exit: { opacity: 0, y: 7, scale: 0.99, filter: "blur(5px)", transition: { duration: MOTION.duration.fast, ease: MOTION.ease.exit } },
};

export function MotionTools() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { intensity, setIntensity, effectiveIntensity } = useMotionSettings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? commands.filter((item) => `${item.label} ${item.detail} ${item.href}`.toLowerCase().includes(normalized)) : commands;
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  const choose = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const handlePaletteKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex].href);
    }
  };

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  const transition = reducedMotion || effectiveIntensity === "minimal" ? { duration: MOTION.duration.fast } : paletteVariants.visible.transition;

  return (
    <>
      <div className="cg-motion-tools" aria-label="Motion and navigation tools">
        <button type="button" className="cg-command-launcher" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">
          <Search size={14} aria-hidden="true" /><span>Quick search</span><kbd><Command size={10} aria-hidden="true" /> K</kbd>
        </button>
        <label className="cg-motion-setting">
          <Gauge size={13} aria-hidden="true" />
          <span className="sr-only">Motion intensity</span>
          <select aria-label="Motion intensity" value={intensity} onChange={(event) => setIntensity(event.target.value as MotionIntensity)}>
            <option value="full">Full motion</option>
            <option value="balanced">Balanced</option>
            <option value="minimal">Minimal</option>
          </select>
        </label>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="cg-command-backdrop" initial="hidden" animate="visible" exit="exit" variants={paletteVariants} transition={transition} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
            <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cg-command-title" className="cg-command-dialog" onKeyDown={trapTab} variants={paletteVariants} transition={transition}>
              <h2 id="cg-command-title" className="sr-only">Quick search</h2>
              <div className="cg-command-input-wrap"><Search size={17} aria-hidden="true" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handlePaletteKeyDown} aria-label="Search pages and actions" placeholder="Search pages and actions…" autoComplete="off" /><kbd>ESC</kbd><button type="button" className="cg-command-close" onClick={() => setOpen(false)} aria-label="Close quick search"><X size={16} /></button></div>
              <p className="cg-command-label">PAGES &amp; WORKSPACE</p>
              <div className="cg-command-results" role="listbox" aria-label="Search results">
                {results.length ? results.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} role="option" aria-selected={index === activeIndex} className={`cg-command-result${index === activeIndex ? " is-active" : ""}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => { setOpen(false); setQuery(""); }}>
                      <span className="cg-command-icon"><Icon size={15} aria-hidden="true" /></span><span className="cg-command-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowRight className="cg-command-arrow" size={14} aria-hidden="true" />
                    </Link>
                  );
                }) : <p className="cg-command-empty">No matching pages.</p>}
              </div>
              <div className="cg-command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>ESC</kbd> to close</span></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
