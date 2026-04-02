import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

// ✅ 正确创建 client（关键）
export const trpcClient = createTRPCClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers() {
        const token = localStorage.getItem("token");
        return {
          Authorization: token ? `Bearer ${token}` : "",
        };
      },
    }),
  ],
});