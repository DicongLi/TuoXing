import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

const redirectToLogin = () => {
  // Clear any stale token
  localStorage.removeItem("token");
  if (window.location.pathname !== "/login" && window.location.pathname !== "/auth") {
    window.location.href = "/login";
  }
};

const handleError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (error.message === UNAUTHED_ERR_MSG) {
    redirectToLogin();
  }
};

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    handleError(event.query.state.error);
    console.error("[API Query Error]", event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    handleError(event.mutation.state.error);
    console.error("[API Mutation Error]", event.mutation.state.error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      // Relative URL: works both locally (Vite proxy) and in production (Nginx/same-origin)
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        // Always include cookies for session-based auth
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
      headers() {
        // Also send token as Bearer header as fallback (server returns token on login)
        const token = localStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);