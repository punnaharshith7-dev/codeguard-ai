import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";

const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const bridgeSecret = process.env.AUTH_BRIDGE_SECRET || "";

type ApiAuthUser = NextAuthUser & {
  apiToken: string;
  avatar_url: string | null;
};

async function backendCredentials(path: string, payload: Record<string, string>) {
  const response = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CodeGuard-Auth-Bridge": bridgeSecret },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = await response.json();
  const cookie = response.headers.get("set-cookie") || "";
  const cookiePair = cookie.split(";", 1)[0].trim();
  const token = cookiePair.startsWith("codeguard_session=") ? cookiePair.slice("codeguard_session=".length) : "";
  if (!token) return null;
  return { id: user.id, email: user.email, name: user.username, image: user.avatar_url, avatar_url: user.avatar_url, apiToken: token } as ApiAuthUser;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        username: { label: "Name", type: "text" },
        mode: { label: "Action", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const register = credentials.mode === "register";
        if (register && !credentials.username) return null;
        return backendCredentials(register ? "/auth/register" : "/auth/login", {
          email: credentials.email,
          password: credentials.password,
          ...(register ? { username: credentials.username } : {}),
        });
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        const authUser = user as ApiAuthUser;
        if (authUser.apiToken) token.apiToken = authUser.apiToken;
      }
      if (account?.provider === "github" && account.access_token) {
        const response = await fetch(`${backendUrl}/auth/github/exchange`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "X-CodeGuard-Auth-Bridge": bridgeSecret,
          },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("GitHub account could not be linked to CodeGuard");
        const result = await response.json();
        token.apiToken = result.access_token;
        token.sub = result.user.id;
        token.email = result.user.email;
        token.name = result.user.username;
        token.picture = result.user.avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.name = token.name || null;
        session.user.email = token.email || null;
        session.user.image = token.picture || null;
      }
      return session;
    },
  },
};

