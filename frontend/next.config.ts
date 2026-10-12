import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["three"],
  // Only use standalone output when building in Docker, not Vercel
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" } : {}),
};

export default nextConfig;

