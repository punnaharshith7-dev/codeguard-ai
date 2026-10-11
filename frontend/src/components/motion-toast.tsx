"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";

export function MotionToast({ message, onDismiss, className = "" }: { message: string; onDismiss: () => void; className?: string }) {
  const [leaving, setLeaving] = useState(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    setLeaving(false);
    const timeout = window.setTimeout(() => setLeaving(true), 4600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!leaving) return;
    const timeout = window.setTimeout(() => dismissRef.current(), 260);
    return () => window.clearTimeout(timeout);
  }, [leaving]);

  return <div role="status" className={`cg-toast flex items-center justify-between gap-3 ${leaving ? "cg-toast--leaving" : ""} ${className}`}>
    <span className="flex min-w-0 items-center gap-2"><Check size={13} className="shrink-0" />{message}</span>
    <button onClick={() => setLeaving(true)} aria-label="Dismiss notification" className="shrink-0"><X size={13} /></button>
  </div>;
}
