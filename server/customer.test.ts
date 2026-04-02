import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("customer router", () => {
  it("customer.list returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.customer.list({ limit: 10 });
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("dashboard.stats returns stats object", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.dashboard.stats();
    
    expect(result).toHaveProperty("customerCount");
    expect(result).toHaveProperty("activeOpportunities");
    expect(result).toHaveProperty("totalDeals");
    expect(typeof result.customerCount).toBe("number");
  });

  it("opportunity.list returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.opportunity.list({ limit: 10 });
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("deal.list returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.deal.list({ limit: 10 });
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("news.list returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.news.list({ limit: 10 });
    
    expect(Array.isArray(result)).toBe(true);
  });
});
