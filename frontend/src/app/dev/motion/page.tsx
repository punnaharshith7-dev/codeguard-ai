import { notFound } from "next/navigation";
import { MotionShowcase } from "@/components/motion-showcase";

export default function MotionPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <MotionShowcase />;
}
