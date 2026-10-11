import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { PageMotion } from "@/components/page-motion";

export const metadata: Metadata = {
  title: { default: "CodeGuard AI — Ship secure code, faster", template: "%s · CodeGuard AI" },
  description: "AI-assisted code security reviews, clear findings, and a calmer path from code to confidence.",
  keywords: ["code security", "secure coding", "vulnerability scanner", "developer tools"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider><PageMotion>{children}</PageMotion></AuthProvider></body></html>;
}
