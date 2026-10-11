import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };
const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const bridgeSecret = process.env.AUTH_BRIDGE_SECRET || "";
const publicPaths = new Set(["auth/password/forgot", "auth/password/reset"]);

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const route = path.join("/");
  const origin = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : "http://localhost:3000";
  if (request.method !== "GET" && request.headers.get("origin") !== origin) {
    return Response.json({ detail: "Request origin is not allowed" }, { status: 403 });
  }
  const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const apiToken = typeof session?.apiToken === "string" ? session.apiToken : "";
  if (!apiToken && !publicPaths.has(route)) {
    return Response.json({ detail: "Authentication required" }, { status: 401 });
  }

  const headers = new Headers({ "X-CodeGuard-Auth-Bridge": bridgeSecret });
  const contentType = request.headers.get("content-type");
  if (apiToken) headers.set("Authorization", `Bearer ${apiToken}`);
  if (contentType?.includes("application/json")) headers.set("Content-Type", "application/json");
  headers.set("Origin", origin);

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = contentType?.includes("multipart/form-data") ? await request.formData() : await request.text();
  }
  const target = `${backendUrl}/${route}${request.nextUrl.search}`;
  const upstream = await fetch(target, { method: request.method, headers, body, cache: "no-store" });
  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  const retryAfter = upstream.headers.get("retry-after");
  const contentDisposition = upstream.headers.get("content-disposition");
  if (upstreamType) responseHeaders.set("Content-Type", upstreamType);
  if (retryAfter) responseHeaders.set("Retry-After", retryAfter);
  if (contentDisposition) responseHeaders.set("Content-Disposition", contentDisposition);
  return new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
