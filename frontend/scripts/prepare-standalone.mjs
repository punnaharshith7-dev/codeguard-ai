import { cp, mkdir } from "node:fs/promises";

await mkdir(".next/standalone/public", { recursive: true });
await cp("public", ".next/standalone/public", { recursive: true, force: true });
await mkdir(".next/standalone/.next/static", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true, force: true });

