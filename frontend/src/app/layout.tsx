import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { PageMotion } from "@/components/page-motion";
import { MotionSystemProvider } from "@/components/motion-system-provider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: { default: "CodeGuard AI — Ship secure code, faster", template: "%s · CodeGuard AI" },
  description: "AI-assisted code security reviews, clear findings, and a calmer path from code to confidence.",
  keywords: ["code security", "secure coding", "vulnerability scanner", "developer tools"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="overflow-x-hidden min-w-[320px]"><AuthProvider><MotionSystemProvider><PageMotion>{children}</PageMotion></MotionSystemProvider></AuthProvider></body></html>;
}
