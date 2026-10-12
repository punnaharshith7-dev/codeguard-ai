"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AmbientScene } from "@/components/ambient-scene";

const dashboardRoute = (pathname: string) => pathname.startsWith("/dashboard");
const publicSceneRoutes = new Set(["/", "/pricing", "/login", "/register", "/forgot-password", "/reset-password", "/privacy", "/terms"]);

export function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion || !("IntersectionObserver" in window)) return;
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
  }, [pathname, prefersReducedMotion]);

  useEffect(() => {
    const shell = rootRef.current;
    if (!shell) return;
    const progress = shell.querySelector<HTMLElement>("[data-cg-scroll-progress]");
    const header = shell.querySelector<HTMLElement>("[data-cg-header]");
    if (!progress && !header) return;

    let frame = 0;
    const updateScrollChrome = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const available = document.documentElement.scrollHeight - window.innerHeight;
        const fraction = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
        if (progress) progress.style.transform = `scaleX(${fraction})`;
        header?.classList.toggle("cg-nav--compact", window.scrollY > 32);
      });
    };
    updateScrollChrome();
    window.addEventListener("scroll", updateScrollChrome, { passive: true });
    window.addEventListener("resize", updateScrollChrome, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScrollChrome);
      window.removeEventListener("resize", updateScrollChrome);
    };
  }, [pathname]);

  useEffect(() => {
    const shell = rootRef.current;
    if (!shell || pathname !== "/" || prefersReducedMotion || window.matchMedia("(pointer: coarse)").matches) return;
    let alive = true;
    let lenis: import("lenis").default | undefined;
    let ticker: ((time: number) => void) | undefined;
    let scrollTriggerModule: typeof import("gsap/ScrollTrigger").ScrollTrigger | undefined;
    let mediaQueries: { add: (conditions: string, callback: () => void) => unknown; revert: () => void } | undefined;

    void Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]).then(([lenisModule, gsapModule, triggerModule]) => {
      if (!alive) return;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      lenis = new lenisModule.default({ lerp: 0.11, smoothWheel: true, anchors: true });
      lenis.on("scroll", ScrollTrigger.update);
      ticker = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
      scrollTriggerModule = ScrollTrigger;
      mediaQueries = gsap.matchMedia();
      mediaQueries.add("(min-width: 900px) and (min-height: 750px) and (prefers-reduced-motion: no-preference)", () => {
        const stations = gsap.utils.toArray<HTMLElement>("[data-cg-workflow-station]", shell);
        const workflowPin = shell.querySelector<HTMLElement>("[data-cg-workflow-pin]");
        const workflowSection = shell.querySelector<HTMLElement>("[data-cg-workflow-section]");
        if (workflowSection && workflowPin && stations.length === 3) {
          const beam = shell.querySelector<SVGPathElement>("[data-cg-beam-path]");
          const timeline = gsap.timeline({
            scrollTrigger: { trigger: workflowSection, pin: workflowPin, start: "top top+=50", end: "+=980", scrub: 0.8, pinSpacing: true, invalidateOnRefresh: true },
          });
          timeline.fromTo(stations[0], { autoAlpha: 0.62, y: 24, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3 }, 0)
            .to(stations[0], { autoAlpha: 0.75, scale: 0.98, duration: 0.28 }, 0.38)
            .fromTo(stations[1], { autoAlpha: 0.62, y: 24, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.34 }, 0.34)
            .to(stations[1], { autoAlpha: 0.76, scale: 0.98, duration: 0.3 }, 0.7)
            .fromTo(stations[2], { autoAlpha: 0.62, y: 24, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.34 }, 0.66);
          if (beam) timeline.fromTo(beam, { strokeDashoffset: 100, autoAlpha: 0.35 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.9 }, 0.06);
        }

        const workspace = shell.querySelector<HTMLElement>(".cg-workspace-section");
        const workspacePin = shell.querySelector<HTMLElement>("[data-cg-workspace-pin]");
        const viewport = shell.querySelector<HTMLElement>("[data-cg-workspace-viewport]");
        const track = shell.querySelector<HTMLElement>("[data-cg-workspace-track]");
        if (workspace && workspacePin && viewport && track) {
          const horizontalDistance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
          if (horizontalDistance() > 48) {
            gsap.to(track, {
              x: () => -horizontalDistance(),
              ease: "none",
              scrollTrigger: {
                trigger: workspace,
                pin: workspacePin,
                start: "top top+=36",
                end: () => `+=${horizontalDistance() + 620}`,
                scrub: 0.85,
                pinSpacing: true,
                invalidateOnRefresh: true,
              },
            });
          }
        }
      });
      ScrollTrigger.refresh();
    }).catch(() => {
      // Native browser scrolling remains available if an optional motion chunk fails to load.
    });

    return () => {
      alive = false;
      if (ticker) {
        import("gsap").then(({ gsap }) => gsap.ticker.remove(ticker!));
      }
      mediaQueries?.revert();
      lenis?.destroy();
      scrollTriggerModule?.getAll().forEach((trigger) => trigger.kill());
    };
  }, [pathname, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !window.matchMedia("(pointer: fine)").matches) return;
    const shell = rootRef.current;
    if (!shell) return;
    const cursor = shell.querySelector<HTMLElement>("[data-cg-cursor-dot]");
    const trail = shell.querySelector<HTMLElement>("[data-cg-cursor-trail]");
    if (!cursor || !trail) return;

    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let trailX = x;
    let trailY = y;
    const render = () => {
      trailX += (x - trailX) * 0.18;
      trailY += (y - trailY) * 0.18;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      trail.style.transform = `translate3d(${trailX}px, ${trailY}px, 0)`;
      frame = requestAnimationFrame(render);
    };
    const onPointerMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [pathname, prefersReducedMotion]);

  const isDashboard = dashboardRoute(pathname);
  const showPublicScene = publicSceneRoutes.has(pathname);

  return (
    <div ref={rootRef} className={`cg-site-shell${isDashboard ? " cg-site-shell--dashboard" : ""}`}>
      {showPublicScene && <AmbientScene mode={pathname === "/" ? "hero" : "ambient"} />}
      {isDashboard && <div aria-hidden="true" className="cg-dashboard-ambient" />}
      <div className="cg-scroll-progress" data-cg-scroll-progress aria-hidden="true" />
      <div className="cg-custom-cursor cg-custom-cursor--trail" data-cg-cursor-trail aria-hidden="true" />
      <div className="cg-custom-cursor cg-custom-cursor--dot" data-cg-cursor-dot aria-hidden="true" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          className="cg-page-content"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: [0.2, 0.72, 0.22, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
