import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

// Single tRPC React instance.
// The actual HTTP client is configured in main.tsx via trpc.createClient().
// Do NOT create a second trpcClient here — it causes duplicate React instances
// and the "Invalid hook call" error seen in production.
export const trpc = createTRPCReact<AppRouter>();