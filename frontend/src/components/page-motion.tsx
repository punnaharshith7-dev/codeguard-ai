"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (!entry.isIntersecting) continue;
        element.classList.remove("cg-scroll-pending");
        element.classList.add("cg-scroll-visible");
        observer.unobserve(element);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    const observeTargets = () => {
      root.querySelectorAll<HTMLElement>("[data-scroll-reveal]").forEach((element) => {
        if (element.classList.contains("cg-scroll-visible")) return;
        element.classList.add("cg-scroll-pending");
        observer.observe(element);
      });
    };
    observeTargets();
    const mutationObserver = new MutationObserver(observeTargets);
    mutationObserver.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutationObserver.disconnect(); };
  }, [pathname]);

  return <div key={pathname} ref={rootRef} className="cg-page-enter cg-motion-shell">{children}</div>;
}
