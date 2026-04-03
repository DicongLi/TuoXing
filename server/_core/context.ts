import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyToken } from "../auth";
import { getUserById } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // ── Step 1: Try cookie-based session (Manus SDK) ──────────────────────────
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // ── Step 2: Fallback — verify Bearer JWT from Authorization header ─────────
  // This handles the local email/password login flow which stores a JWT in
  // localStorage and sends it as "Authorization: Bearer <token>".
  if (!user) {
    try {
      const authHeader = opts.req.headers["authorization"] as string | undefined;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7).trim();
        const payload = await verifyToken(token);
        if (payload && payload.userId) {
          const dbUser = await getUserById(payload.userId);
          if (dbUser) {
            user = dbUser;
          }
        }
      }
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}