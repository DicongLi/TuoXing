import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
const { hash, compare } = bcrypt;
import Parser from "rss-parser";
const parser = new Parser();
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { projects, aiRecommendations, subsidiaries } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { invokeLLM } from "./llm";

export const appRouter = router({
  system: systemRouter,

  // ============ AUTH ============
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input(z.object({
      email: z.string().email("请输入有效的邮箱地址"),
      password: z.string().min(6, "密码至少需要6位"),
      name: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const existingUser = await db.getUserByEmail(input.email);
      if (existingUser) throw new Error("该邮箱已被注册");
      const hashedPassword = await hash(input.password, 10);
      const userId = await db.createUser({
        email: input.email,
        password: hashedPassword,
        name: input.name || input.email.split('@')[0],
        role: "user",
        loginMethod: "local",
        openId: input.email,
        lastSignedIn: new Date()
      });
      const token = await sdk.signSession({
        openId: input.email,
        name: input.name || input.email.split('@')[0],
        appId: "local-dev-app"
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
      return { success: true, userId };
    }),
    login: publicProcedure.input(z.object({
      email: z.string().email(),
      password: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.password) throw new Error("邮箱或密码错误");
      const isValid = await compare(input.password, user.password);
      if (!isValid) throw new Error("邮箱或密码错误");
      const token = await sdk.signSession({
        openId: user.openId || user.email,
        name: user.name || "User",
        appId: "local-dev-app"
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
      await db.updateUserLastSignIn(user.id);
      return { success: true, token};
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ DASHBOARD ============
  dashboard: router({
    stats: publicProcedure.query(async () => { return await db.getDashboardStats(ctx.user?.id); }),
    recentDeals: publicProcedure.input(z.object({ limit: z.number().default(5) })).query(async ({ input }) => { return await db.getDeals({ limit: input.limit, userId: ctx.user?.id }); }),
    recentNews: publicProcedure.input(z.object({ limit: z.number().default(5) })).query(async ({ input }) => { return await db.getNewsItems({ limit: input.limit, userId: ctx.user?.id }); }),
    opportunityByStage: publicProcedure.query(async () => { return await db.getOpportunityByStage(ctx.user?.id); }),
    dealsByMonth: publicProcedure.input(z.object({ months: z.number().default(12) })).query(async ({ input }) => { return await db.getDealsByMonth(input.months, ctx.user?.id); }),
  }),

  // ============ CUSTOMER ============
  customer: router({
    list: publicProcedure.input(z.object({ search: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0), })).query(async ({ input }) => { return await db.getCustomers({ ...input, userId: ctx.user?.id }); }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => { return await db.getCustomerById(input.id, ctx.user?.id); }),
    create: protectedProcedure.input(z.object({ name: z.string().min(1), registeredName: z.string().optional(), localName: z.string().optional(), tradeName: z.string().optional(), globalOneId: z.string().optional(), industry: z.string().optional(), industryCode: z.string().optional(), businessType: z.string().optional(), foundedDate: z.string().optional(), operatingStatus: z.string().optional(), isIndependent: z.boolean().optional(), registrationCountry: z.string().optional(), registrationAddress: z.string().optional(), registrationNumber: z.string().optional(), registrationType: z.string().optional(), website: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), capitalAmount: z.number().optional(), capitalCurrency: z.string().optional(), annualRevenue: z.number().optional(), revenueCurrency: z.string().optional(), revenueYear: z.string().optional(), employeeCount: z.number().optional(), stockExchange: z.string().optional(), stockSymbol: z.string().optional(), riskLevel: z.string().optional(), riskDescription: z.string().optional(), ceoName: z.string().optional(), ceoTitle: z.string().optional(), tags: z.string().optional(), logoUrl: z.string().optional(), description: z.string().optional(), notes: z.string().optional(), })).mutation(async ({ input, ctx }) => { const id = await db.createCustomer({ ...input, createdBy: ctx.user.id }); return { id }; }),
    update: protectedProcedure.input(z.object({ id: z.number(), data: z.record(z.any()) })).mutation(async ({ input }) => { await db.updateCustomer(input.id, input.data as any); return { success: true }; }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await db.deleteCustomer(input.id); return { success: true }; }),
    count: publicProcedure.query(async () => { return await db.getCustomerCount(); }),
  }),

  // ============ SUBSIDIARY ============
  subsidiary: router({
    listByCustomer: publicProcedure.input(z.object({ customerId: z.number() })).query(async ({ input }) => { return await db.getSubsidiariesByCustomer(input.customerId); }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => { return await db.getSubsidiaryById(input.id); }),
    create: protectedProcedure.input(z.object({ customerId: z.number(), parentSubsidiaryId: z.number().optional(), globalOneId: z.string().optional(), name: z.string().min(1), localName: z.string().optional(), entityType: z.string().optional(), ownershipPercentage: z.number().min(0).max(100).optional(), country: z.string().optional(), region: z.string().optional(), city: z.string().optional(), address: z.string().optional(), latitude: z.string().optional(), longitude: z.string().optional(), industry: z.string().optional(), operatingStatus: z.string().optional(), employeeCount: z.number().optional(), annualRevenue: z.number().optional(), revenueCurrency: z.string().optional(), relationshipType: z.string().optional(), description: z.string().optional(), })).mutation(async ({ input }) => { const id = await db.createSubsidiary(input); return { id }; }),
    update: protectedProcedure.input(z.object({ id: z.number(), data: z.record(z.any()) })).mutation(async ({ input }) => { await db.updateSubsidiary(input.id, input.data as any); return { success: true }; }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await db.deleteSubsidiary(input.id); return { success: true }; }),
    count: publicProcedure.input(z.object({ customerId: z.number().optional() })).query(async ({ input }) => { return await db.getSubsidiaryCount(input.customerId); }),
  }),

  // ============ OPPORTUNITY ============
  opportunity: router({
    list: publicProcedure.input(z.object({ customerId: z.number().optional(), status: z.string().optional(), stage: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0), })).query(async ({ input }) => { return await db.getOpportunities({ ...input, userId: ctx.user?.id }); }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => { return await db.getOpportunityById(input.id); }),
    create: protectedProcedure.input(z.object({ customerId: z.number(), subsidiaryId: z.number().optional(), name: z.string().min(1), description: z.string().optional(), stage: z.string().optional(), status: z.string().optional(), probability: z.number().min(0).max(100).optional(), amount: z.number().optional(), currency: z.string().optional(), productType: z.string().optional(), productCategory: z.string().optional(), expectedCloseDate: z.date().optional(), sourceType: z.string().optional(), sourceDetail: z.string().optional(), ownerName: z.string().optional(), notes: z.string().optional(), })).mutation(async ({ input, ctx }) => { const id = await db.createOpportunity({ ...input, ownerId: ctx.user.id }); return { id }; }),
    update: protectedProcedure.input(z.object({ id: z.number(), data: z.record(z.any()) })).mutation(async ({ input }) => { await db.updateOpportunity(input.id, input.data as any); return { success: true }; }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await db.deleteOpportunity(input.id); return { success: true }; }),
    stats: publicProcedure.query(async () => { return await db.getOpportunityStats(ctx.user?.id); }),
    byStage: publicProcedure.query(async () => { return await db.getOpportunityByStage(ctx.user?.id); }),
    aiSearch: protectedProcedure.input(z.object({
      customerId: z.number(),
      language: z.enum(["en", "zh-CN", "zh-TW"]).default("en"),
    })).mutation(async ({ input }) => {
      const customer = await db.getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");
      const langInstr =
        input.language === "zh-CN" ? "请使用简体中文填写所有文字字段（name, description, productType）。\n" :
        input.language === "zh-TW" ? "請使用繁體中文填寫所有文字字段。\n" :
        "All text fields in English.\n";
      const prompt = `${langInstr}Identify 8-12 realistic sales opportunities for this company:
- Name: ${customer.name}
- Industry: ${customer.industry || "Technology"}
- Description: ${customer.description || "Enterprise company"}
- Country: ${customer.registrationCountry || "Unknown"}

Return ONLY valid JSON (no markdown, no code fences):
{
  "opportunities": [
    {
      "id": 1,
      "name": "Opportunity name",
      "description": "Why this is a real opportunity for this customer",
      "stage": "lead",
      "status": "active",
      "amount": 50000000,
      "probability": 30,
      "productType": "Product category name",
      "currency": "USD"
    }
  ],
  "stats": {
    "total": 10,
    "active": 8,
    "totalValue": 500000000
  }
}
stage must be one of: lead, qualified, proposal, negotiation, closed_won, closed_lost
amount is in cents (multiply dollar value by 100). Use realistic deal sizes for this industry.`;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a sales intelligence AI. Return only valid JSON objects, no markdown." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          maxTokens: 2000,
        });
        const raw = response.choices?.[0]?.message?.content || "{}";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let result: any = {};
        try { result = JSON.parse(cleaned); }
        catch { const m = cleaned.match(/\{[\s\S]*\}/); if (m) result = JSON.parse(m[0]); }
        return result;
      } catch (err) {
        console.error("[Opportunity AI] error:", err);
        throw new Error("AI opportunity search failed");
      }
    }),
  }),

  // ============ DEAL ============
  deal: router({
    list: publicProcedure.input(z.object({ customerId: z.number().optional(), status: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0), })).query(async ({ input }) => { return await db.getDeals({ ...input, userId: ctx.user?.id }); }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => { return await db.getDealById(input.id); }),
    create: protectedProcedure.input(z.object({ customerId: z.number(), subsidiaryId: z.number().optional(), opportunityId: z.number().optional(), dealNumber: z.string().optional(), name: z.string().min(1), description: z.string().optional(), amount: z.number(), currency: z.string().optional(), monthlyRecurring: z.number().optional(), oneTimeFee: z.number().optional(), productType: z.string().optional(), productCategory: z.string().optional(), contractStartDate: z.date().optional(), contractEndDate: z.date().optional(), contractDurationMonths: z.number().optional(), status: z.string().optional(), closedDate: z.date().optional(), closedByName: z.string().optional(), notes: z.string().optional(), })).mutation(async ({ input, ctx }) => { const id = await db.createDeal({ ...input, closedBy: ctx.user.id }); return { id }; }),
    update: protectedProcedure.input(z.object({ id: z.number(), data: z.record(z.any()) })).mutation(async ({ input }) => { await db.updateDeal(input.id, input.data as any); return { success: true }; }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await db.deleteDeal(input.id); return { success: true }; }),
    stats: publicProcedure.query(async () => { return await db.getDealStats(ctx.user?.id); }),
    byMonth: publicProcedure.input(z.object({ months: z.number().default(12) })).query(async ({ input }) => { return await db.getDealsByMonth(input.months, ctx.user?.id); }),
    seedDemoData: protectedProcedure.mutation(async ({ ctx }) => {
      const customerList = await db.getCustomers({ limit: 20 });
      if (customerList.length === 0) throw new Error("No customers found. Please create at least one customer first.");
      const productTypes = ["IDC", "IDC2.0", "Cloud Services", "IEPL", "ICTS", "IPT", "SMS", "Connectivity", "SD-WAN", "Security Services"];
      const statuses = ["active", "active", "active", "completed", "completed", "pending"];
      const now = new Date();
      let created = 0;
      for (let i = 0; i < 24; i++) {
        const customer = customerList[i % customerList.length];
        const monthsAgo = Math.floor(Math.random() * 18);
        const closedDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1);
        const baseAmount = Math.floor(Math.random() * 45000 + 5000);
        const productType = productTypes[Math.floor(Math.random() * productTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const quarter = `Q${Math.floor(closedDate.getMonth() / 3) + 1}`;
        await db.createDeal({
          customerId: customer.id,
          name: `${customer.name} - ${productType} ${closedDate.getFullYear()}-${quarter}`,
          amount: baseAmount * 100,
          productType,
          status,
          closedDate,
          closedBy: ctx.user.id,
          closedByName: ctx.user.name || "Demo User",
          currency: "USD",
          description: `Demo deal: ${productType} service agreement`,
        });
        created++;
      }
      return { success: true, created };
    }),
  }),

  // ============ ML & AI ============
  ml: router({
    getData: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];

      const allProjects = await drizzle
        .select()
        .from(projects)
        .orderBy(desc(projects.startDate))
        .limit(200);

      // 有数据走正常路径
      if (allProjects.length > 0) {
        const allRecs = await drizzle.select().from(aiRecommendations);
        const recsMap = new Map<string, any[]>();
        allRecs.forEach((r: any) => {
          const pid = r.projectId || "";
          if (!recsMap.has(pid)) recsMap.set(pid, []);
          recsMap.get(pid)!.push(r);
        });
        return allProjects.map((p: any) => ({
          id: p.id,
          originalId: p.originalId,
          projectName: p.name,
          investment: p.investment,
          country: p.country,
          sector: p.sector,
          stage: p.stage,
          startDate: p.startDate,
          contractor: p.contractor,
          summary: p.summary,
          recommendations: recsMap.get(p.originalId || "") || [],
        }));
      }

      // 数据库为空，调用 LLM 生成
      console.log("[ML] No project data, generating via LLM...");
      try {
        const today = new Date().toISOString().slice(0, 10);
        const prompt = `You are a business intelligence analyst for BHI (Belt and Highway Initiative) projects.
 
Generate 15 realistic infrastructure/industrial investment projects.
 
Return ONLY a JSON array (no markdown):
[
  {
    "originalId": "BHI-2024-001",
    "name": "Project full name",
    "investment": 85000,
    "country": "Indonesia",
    "sector": "Energy",
    "stage": "Construction",
    "startDate": "2024-03-15",
    "contractor": "China Energy Engineering Group",
    "summary": "Brief 1-2 sentence project description",
    "recommendations": [
      {"productName": "Industrial Switchgear", "rank": 1, "confidence": "High", "aiScore": 0.92},
      {"productName": "Power Transformers", "rank": 2, "confidence": "Medium", "aiScore": 0.78}
    ]
  }
]
 
Requirements:
- Mix countries: Southeast Asia, Middle East, Africa, Central Asia, South America
- Mix sectors: Energy, Transportation, Industrial, Water Treatment, Telecommunications
- Mix stages: Planning, Design, Procurement, Construction, Commissioning
- investment in 万元, range 5000-500000
- startDate within last 2 years from ${today}
- Each project has 2-4 recommendations
- confidence: "High" | "Medium" | "Low"
- aiScore: 0.50 to 0.98
- Return exactly 15 projects, pure JSON array only`;

        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: "You are a structured data generator. Return pure JSON arrays only, no markdown." },
            { role: "user", content: prompt }
          ],
          temperature: 0.8,
          maxTokens: 4000,
        });

        const rawContent = llmResponse.choices[0]?.message?.content || "[]";
        const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        let generatedProjects: any[] = [];
        try {
          generatedProjects = JSON.parse(cleanContent);
        } catch {
          const m = cleanContent.match(/\[\1\]/);
          if (m) generatedProjects = JSON.parse(m[0]);
        }

        if (!Array.isArray(generatedProjects) || generatedProjects.length === 0) {
          console.warn("[ML] LLM returned empty or invalid data");
          return [];
        }

        const result: any[] = [];
        for (const proj of generatedProjects) {
          try {
            const oid = proj.originalId || `BHI-AUTO-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

            // ✅ 使用 schema.ts 中的实际 JS 属性名（Drizzle ORM 会自动映射到下划线列名）
            await drizzle.insert(projects).values({
              originalId: oid,
              name: proj.name || "Unknown Project",
              investment: String(proj.investment || 0),
              country: proj.country || "Unknown",
              sector: proj.sector || "General",
              stage: proj.stage || "Planning",
              startDate: proj.startDate ? new Date(proj.startDate) : new Date(),
              contractor: proj.contractor || null,
              summary: proj.summary || null,
            });

            const recs: any[] = [];
            if (Array.isArray(proj.recommendations)) {
              for (const rec of proj.recommendations) {
                // ✅ 字段名严格对应 schema.ts 中 aiRecommendations 的 JS 属性名：
                //    projectId / productName / rank / confidence / aiScore
                //    （不存在 reason 字段，已删除）
                await drizzle.insert(aiRecommendations).values({
                  projectId: oid,
                  productName: rec.productName || "Unknown Product",
                  rank: typeof rec.rank === "number" ? rec.rank : 1,
                  confidence: rec.confidence || "Medium",
                  aiScore: String(typeof rec.aiScore === "number" ? rec.aiScore : 0.75),
                });
                recs.push({
                  projectId: oid,
                  productName: rec.productName,
                  rank: rec.rank,
                  confidence: rec.confidence,
                  aiScore: rec.aiScore,
                });
              }
            }

            result.push({
              id: 0,
              originalId: oid,
              projectName: proj.name,
              investment: proj.investment,
              country: proj.country,
              sector: proj.sector,
              stage: proj.stage,
              startDate: proj.startDate,
              contractor: proj.contractor,
              summary: proj.summary,
              recommendations: recs,
            });
          } catch (insertErr) {
            console.warn("[ML] Failed to insert project:", proj.name, (insertErr as Error).message);
          }
        }

        console.log(`[ML] Generated and saved ${result.length} projects via LLM`);
        return result;

      } catch (llmError) {
        console.error("[ML] LLM generation failed:", (llmError as Error).message);
        return [];
      }
    }),

    // ── AI 实时搜索 ────────────────────────────────────────────
    search: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const { query } = input;
        console.log(`[ML Search] Query: "${query}"`);

        const prompt = `You are a BHI (Belt and Highway Initiative) project database expert.

The user is searching for: "${query}"

Generate 8-12 realistic infrastructure/industrial investment projects HIGHLY RELEVANT to this search query.
- If user typed a country name, focus on that country
- If user typed a sector/industry, focus on that sector
- If user typed a company name, use it as contractor or related entity
- If user typed a product, find projects that would need that product

Return ONLY a JSON array (no markdown):
[
  {
    "originalId": "SEARCH-001",
    "name": "Full descriptive project name",
    "investment": 120000,
    "country": "Indonesia",
    "sector": "Energy",
    "stage": "Construction",
    "startDate": "2024-06-01",
    "contractor": "China Power Construction Group",
    "summary": "1-2 sentence description relevant to the search",
    "recommendations": [
      {"productName": "Power Transformers", "rank": 1, "confidence": "High", "aiScore": 0.91},
      {"productName": "Industrial Switchgear", "rank": 2, "confidence": "Medium", "aiScore": 0.76}
    ]
  }
]

Rules:
- investment in 万元, range 5000-800000
- startDate within the last 3 years
- Each project has 2-4 recommendations
- confidence: "High" | "Medium" | "Low"
- aiScore: 0.50-0.98
- Return pure JSON array only`;

        try {
          const llmResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are a structured data generator. Return pure JSON arrays only, no markdown." },
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
            maxTokens: 3000,
          });

          const rawContent = llmResponse.choices[0]?.message?.content || "[]";
          const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

          let results: any[] = [];
          try {
            results = JSON.parse(cleanContent);
          } catch {
            const m = cleanContent.match(/\[[\s\S]*\]/);
            if (m) results = JSON.parse(m[0]);
          }

          if (!Array.isArray(results)) results = [];
          console.log(`[ML Search] LLM returned ${results.length} results for "${query}"`);

          return results.map((proj: any, i: number) => ({
            id: -(i + 1),
            originalId: proj.originalId || `SEARCH-${Date.now()}-${i}`,
            projectName: proj.name || "Unknown Project",
            investment: proj.investment || 0,
            country: proj.country || "Unknown",
            sector: proj.sector || "General",
            stage: proj.stage || "Planning",
            startDate: proj.startDate || null,
            contractor: proj.contractor || null,
            summary: proj.summary || null,
            recommendations: Array.isArray(proj.recommendations)
              ? proj.recommendations.map((r: any) => ({
                  productName: r.productName || "Unknown",
                  rank: r.rank || 1,
                  confidence: r.confidence || "Medium",
                  aiScore: r.aiScore || 0.75,
                }))
              : [],
          }));
        } catch (err) {
          console.error("[ML Search] Failed:", (err as Error).message);
          throw new Error("AI search failed. Please check LLM API configuration.");
        }
      }),
  }),

  ai: router({
    getLogs: publicProcedure.input(z.object({ entityType: z.string(), entityId: z.number(), })).query(async ({ input }) => { return await db.getAiAnalysisLogs(input.entityType, input.entityId); }),
    analyzeCustomer: protectedProcedure.input(z.object({ language: z.enum(["en", "zh-CN", "zh-TW"]).optional(),customerId: z.number(), analysisType: z.enum(["summary", "product_match", "talking_points", "risk_assessment"]), })).mutation(async ({ input, ctx }) => {

      // 🛠️【自动修复】尝试修复数据库表结构
      // 强制设置默认值，以防 null 问题
      try {
        const drizzle = await db.getDb();
        if (drizzle) {
          // 注意：这里我们尝试添加默认值约束
          await drizzle.execute(sql`
            ALTER TABLE aiAnalysisLogs
            ADD COLUMN IF NOT EXISTS result TEXT DEFAULT '',
            ADD COLUMN IF NOT EXISTS errorMessage TEXT DEFAULT '';
          `);
        }
      } catch (e) {
        console.log("Auto-migration for aiAnalysisLogs skipped or failed", e);
      }

      const customer = await db.getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");

      // ✅✅✅ 终极修复：使用有意义的字符串 "Pending" 和 "None"
      // 这样可以避免数据库驱动把空字符串 "" 误判为 null 或 undefined
      const logId = await db.createAiAnalysisLog({
        entityType: "customer",
        entityId: input.customerId,
        analysisType: input.analysisType,
        requestedBy: ctx.user.id,
        status: "processing",
        prompt: "Analyzing...",
        response: "Waiting for AI...",
        result: "Pending", // 替换了 ""
        errorMessage: "None" // 替换了 ""，确保它是一个实际的字符串值
      });

      const langInstruction =
        input.language === "zh-CN" ? "请你全程使用简体中文进行回答，不要夹杂英文。\n" :
        input.language === "zh-TW" ? "請你全程使用繁體中文進行回答，不要夾雜英文。\n" :
        "Please respond entirely in English.\n";

      try {
        let prompt = "";
        const context = `Customer: ${customer.name}, Industry: ${customer.industry || "Unknown"}, Business: ${customer.description || "Unknown"}`;
        switch (input.analysisType) {
          case "summary": prompt = `Analyze this customer: ${context}.`; break;
          case "risk_assessment": prompt = `Evaluate risk for: ${context}.`; break;
          case "product_match": prompt = `Suggest products for: ${context}.`; break;
          case "talking_points": prompt = `Talking points for: ${context}.`; break;
        }
        await db.updateAiAnalysisLog(logId, { prompt });
        const response = await invokeLLM({ messages: [{ role: "system", content: langInstruction + "You are an enterprise business intelligence assistant. Always respond in the language specified at the beginning of this system prompt." }, { role: "user", content: prompt }], temperature: 0.7 });
        const analysisResult = response.choices[0]?.message?.content || "AI returned no content.";
        await db.updateAiAnalysisLog(logId, { result: analysisResult, response: analysisResult, status: "completed", completedAt: new Date() });
        return { analysis: analysisResult, logId };
      } catch (error) { await db.updateAiAnalysisLog(logId, { status: "failed", errorMessage: error instanceof Error ? error.message : "Unknown AI error", completedAt: new Date() }); throw new Error("AI Analysis failed"); }
    }),
  }),

  // ============ NEWS ============
  news: router({
    list: publicProcedure.input(z.object({ customerId: z.number().optional(), isHighlight: z.boolean().optional(), limit: z.number().default(50), offset: z.number().default(0), })).query(async ({ input }) => { return await db.getNewsItems({ ...input, userId: ctx.user?.id }); }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => { return await db.getNewsItemById(input.id); }),
    create: protectedProcedure.input(z.object({ customerId: z.number(), subsidiaryId: z.number().optional(), title: z.string().min(1), summary: z.string().optional(), content: z.string().optional(), sourceUrl: z.string().optional(), sourceName: z.string().optional(), publishedDate: z.date().optional(), category: z.string().optional(), sentiment: z.string().optional(), relevanceScore: z.number().min(0).max(100).optional(), isHighlight: z.boolean().optional(), })).mutation(async ({ input, ctx }) => { const id = await db.createNewsItem(input); return { id }; }),
    update: protectedProcedure.input(z.object({ id: z.number(), data: z.record(z.any()) })).mutation(async ({ input }) => { await db.updateNewsItem(input.id, input.data as any); return { success: true }; }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await db.deleteNewsItem(input.id); return { success: true }; }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await db.updateNewsItem(input.id, { isRead: true }); return { success: true }; }),
    unreadCount: publicProcedure.query(async () => { return await db.getUnreadNewsCount(); }),
    searchNews: protectedProcedure.input(z.object({
      customerId: z.number(),
      query: z.string().optional(),
      language: z.enum(["en", "zh-CN", "zh-TW"]).default("en").optional(),
    })).mutation(async ({ input, ctx }) => {
      const customer = await db.getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");

      // 清除旧新闻
      const oldNews = await db.getNewsItems({ customerId: input.customerId, limit: 100 });
      for (const item of oldNews) { await db.deleteNewsItem(item.id); }

      const keyword = input.query || customer.name;
      const insertedIds: number[] = [];

      // ─── 第一步：尝试 Google News RSS ───────────────────────
      const hasChinese = /[\u4e00-\u9fff]/.test(keyword);
      const buildUrl = (q: string, locale: string) =>
        `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${locale}`;

      const searchUrls = hasChinese
        ? [
            buildUrl(keyword, "zh-CN&gl=CN&ceid=CN:zh"),
            buildUrl(keyword, "en-US&gl=US&ceid=US:en"),
          ]
        : [
            buildUrl(keyword, "en-US&gl=US&ceid=US:en"),
            buildUrl(`${keyword} company news`, "en-US&gl=US&ceid=US:en"),
          ];

      for (const feedUrl of searchUrls) {
        if (insertedIds.length > 0) break;
        try {
          console.log(`[News] Trying RSS: ${feedUrl}`);
          const feed = await Promise.race([
            parser.parseURL(feedUrl),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("RSS timeout")), 8000)
            ),
          ]) as any;

          const items = (feed.items || []).slice(0, 10);
          if (items.length === 0) continue;

          // If user wants Chinese, translate via LLM after fetching
          const needsTranslation = input.language === "zh-CN" || input.language === "zh-TW";
          const translateInstr = input.language === "zh-CN"
            ? "将以下新闻标题和摘要翻译成简体中文，返回相同JSON结构："
            : input.language === "zh-TW"
            ? "將以下新聞標題和摘要翻譯成繁體中文，返回相同JSON結構："
            : null;

          let processedItems = items;
          if (needsTranslation && translateInstr) {
            try {
              const toTranslate = items.map((it: any, i: number) => ({
                i,
                title: it.title || "",
                summary: it.contentSnippet || it.content || "",
              }));
              const transResp = await invokeLLM({
                messages: [
                  { role: "system", content: "You are a professional translator. Return only valid JSON arrays." },
                  { role: "user", content: `${translateInstr}\n${JSON.stringify(toTranslate)}\nReturn ONLY a JSON array with same {i, title, summary} structure.` },
                ],
                temperature: 0.2,
                maxTokens: 2000,
              });
              const rawT = transResp.choices?.[0]?.message?.content || "[]";
              const cleanT = rawT.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              let translated: any[] = [];
              try { translated = JSON.parse(cleanT); }
              catch { const m = cleanT.match(/\[[\s\S]*\]/); if (m) translated = JSON.parse(m[0]); }
              if (Array.isArray(translated) && translated.length > 0) {
                processedItems = items.map((it: any, idx: number) => {
                  const tr = translated.find((t: any) => t.i === idx);
                  return tr ? { ...it, title: tr.title || it.title, contentSnippet: tr.summary || it.contentSnippet } : it;
                });
              }
            } catch (transErr) {
              console.warn("[News] Translation failed, using original:", transErr);
            }
          }

          for (const item of processedItems) {
            // Use the real article link directly (not a search redirect)
            const articleUrl = (item as any).link || (item as any).guid || "";
            const id = await db.createNewsItem({
              customerId: input.customerId,
              title: item.title || "No Title",
              summary: item.contentSnippet || item.content || "",
              content: item.content || "",
              sourceName: (item as any).source?.name || item.creator || "Google News",
              sourceUrl: articleUrl,
              publishedDate: item.pubDate ? new Date(item.pubDate) : new Date(),
              sentiment: "neutral",
              category: "General",
              isRead: false,
            });
            insertedIds.push(id);
          }
          if (insertedIds.length > 0) {
            console.log(`[News] RSS success: ${insertedIds.length} items`);
          }
        } catch (e) {
          console.warn(`[News] RSS failed: ${feedUrl}`, (e as Error).message);
        }
      }

      // ─── 第二步：RSS 失败时，fallback 到 LLM 生成新闻摘要 ────
      if (insertedIds.length === 0) {
        console.log(`[News] RSS unavailable, falling back to LLM for: ${keyword}`);
        try {
          const today = new Date().toISOString().slice(0, 10);
          const langInstr =
            input.language === "zh-CN" ? "请使用简体中文生成所有新闻标题和摘要内容。\n" :
            input.language === "zh-TW" ? "請使用繁體中文生成所有新聞標題和摘要內容。\n" :
            "Generate all news in English.\n";

          const llmPrompt = `${langInstr}You are a business news assistant. Generate 6 realistic and recent news article summaries about the company "${keyword}".
These should be the kinds of news items that would appear in a Google News search: business developments, financial results, partnerships, product launches, executive changes, regulatory news, etc.

Return your response as a JSON array (no markdown, pure JSON) with this exact structure:
[
  {
    "title": "Full news headline",
    "summary": "2-3 sentence summary of the news article",
    "sourceName": "News outlet name (e.g. Reuters, Bloomberg, South China Morning Post)",
    "sourceUrl": "https://www.reuters.com/",
    "publishedDate": "ISO date string within the last 30 days from ${today}",
    "sentiment": "positive",
    "category": "Business"
  }
]
sentiment: "positive" | "neutral" | "negative"
category: "Business" | "Finance" | "Technology" | "Regulatory" | "Executive"
sourceUrl: use the real homepage of the outlet (e.g. https://www.reuters.com/, https://www.bloomberg.com/)
Important: Return ONLY the JSON array, no other text.`;

          const llmResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are a financial news aggregator. Always respond with pure JSON arrays only, no markdown formatting." },
              { role: "user", content: llmPrompt }
            ],
            temperature: 0.7,
            maxTokens: 2000,
          });

          const rawContent = llmResponse.choices[0]?.message?.content || "[]";
          const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

          let newsItemsData: any[] = [];
          try { newsItemsData = JSON.parse(cleanContent); }
          catch {
            const match = cleanContent.match(/\[[\s\S]*\]/);
            if (match) newsItemsData = JSON.parse(match[0]);
          }

          if (Array.isArray(newsItemsData) && newsItemsData.length > 0) {
            for (const item of newsItemsData) {
              const id = await db.createNewsItem({
                customerId: input.customerId,
                title: item.title || "News Update",
                summary: item.summary || "",
                content: item.summary || "",
                sourceName: item.sourceName || "AI Generated",
                sourceUrl: item.sourceUrl || `https://news.google.com/search?q=${encodeURIComponent(keyword)}`,
                publishedDate: item.publishedDate ? new Date(item.publishedDate) : new Date(),
                sentiment: item.sentiment || "neutral",
                category: item.category || "General",
                isRead: false,
              });
              insertedIds.push(id);
            }
            console.log(`[News] LLM fallback success: ${insertedIds.length} items generated`);
          }
        } catch (llmError) {
          console.error("[News] LLM fallback also failed:", llmError);
        }
      }

      if (insertedIds.length === 0) {
        throw new Error(`无法获取"${keyword}"相关新闻。请检查 LLM API Key 配置，或稍后重试。`);
      }

      return { success: true, count: insertedIds.length, ids: insertedIds };
    }),
  }),

  // ============ COMPETITOR (AI-driven per customer) ============
  competitor: router({
    search: protectedProcedure.input(z.object({
      customerId: z.number(),
      language: z.enum(["en", "zh-CN", "zh-TW"]).default("en"),
    })).mutation(async ({ input }) => {
      const customer = await db.getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");
      const langInstr =
        input.language === "zh-CN" ? "请使用简体中文填写所有描述、洞察、冲突领域等文字字段。公司名称可保留英文。\n" :
        input.language === "zh-TW" ? "請使用繁體中文填寫所有描述性文字字段。\n" :
        "All descriptive text fields in English.\n";
      const prompt = `${langInstr}You are a competitive intelligence analyst.
The company we are analyzing:
- Name: ${customer.name}
- Industry: ${customer.industry || "Unknown"}
- Description: ${customer.description || "Not provided"}
- Country: ${customer.registrationCountry || "Unknown"}

Identify the top 5 most relevant and realistic direct competitors for this company.
Return ONLY a valid JSON array (no markdown, no code fences):
[
  {
    "id": 1,
    "name": "Competitor Name",
    "nameCn": "中文名称 or same as name",
    "shortName": "SHORT",
    "country": "Country",
    "headquarters": "City, Country",
    "website": "https://example.com",
    "stockSymbol": "TICK",
    "description": "What this company does and why they compete",
    "revenue": 5000000000,
    "revenueCurrency": "USD",
    "revenueYear": "2023",
    "employees": 50000,
    "marketPosition": "leader",
    "brandColor": "#3B82F6",
    "strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "weaknesses": ["Weakness 1", "Weakness 2"],
    "projects": [
      {
        "id": "p1",
        "name": "Project or initiative name",
        "status": "in_progress",
        "type": "technology",
        "investment": 200000000,
        "currency": "USD",
        "startDate": "2024-01",
        "endDate": "2025-12",
        "regions": ["Asia", "Pacific"],
        "description": "What this project does",
        "partners": ["Partner Name"],
        "ourOpportunity": "direct_competition"
      }
    ],
    "recentNews": [
      { "title": "News headline about this company", "date": "2024-12-01", "type": "expansion", "impact": "high" }
    ],
    "relationshipAnalysis": {
      "overallRelation": "competition",
      "competitionScore": 75,
      "cooperationScore": 30,
      "threatLevel": "high",
      "conflictAreas": ["Overlap area 1", "Overlap area 2"],
      "cooperationAreas": ["Potential cooperation area"],
      "opportunities": ["Opportunity 1 for us", "Opportunity 2"],
      "aiInsights": ["Strategic insight 1", "Strategic insight 2", "Strategic insight 3"]
    }
  }
]
ourOpportunity: direct_competition|cooperation|potential_partner|watch
threatLevel: high|medium|low
marketPosition: leader|challenger|follower|niche
project status: operational|in_progress|planning`;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Competitive intelligence expert. Return only valid JSON arrays, no markdown." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          maxTokens: 4000,
        });
        const raw = response.choices?.[0]?.message?.content || "[]";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let competitors: any[] = [];
        try { competitors = JSON.parse(cleaned); }
        catch { const m = cleaned.match(/\[[\s\S]*\]/); if (m) competitors = JSON.parse(m[0]); }
        return { success: true, competitors: Array.isArray(competitors) ? competitors : [] };
      } catch (err) {
        console.error("[Competitor] LLM error:", err);
        return { success: false, competitors: [] };
      }
    }),
  }),

  // ============ PIPELINE (AI-driven per customer + period) ============
  pipeline: router({
    analyze: protectedProcedure.input(z.object({
      customerId: z.number(),
      period: z.string().default("2025"),
      language: z.enum(["en", "zh-CN", "zh-TW"]).default("en"),
    })).mutation(async ({ input }) => {
      const customer = await db.getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");
      const langInstr =
        input.language === "zh-CN" ? "summary字段和stageDistribution的stage名称请使用简体中文，products的name字段使用中文。\n" :
        input.language === "zh-TW" ? "summary和stage名稱請使用繁體中文。\n" :
        "All text fields in English.\n";
      const prompt = `${langInstr}Generate a realistic ${input.period} sales pipeline analysis for:
- Customer: ${customer.name}
- Industry: ${customer.industry || "Technology"}
- Description: ${customer.description || "Enterprise company"}

Return ONLY valid JSON (no markdown, no code fences):
{
  "customerId": ${input.customerId},
  "customerName": "${customer.name}",
  "period": "${input.period}",
  "totalAmount": 85000000,
  "currency": "HKD",
  "totalCount": 42,
  "summary": "1-2 sentence AI insight about this pipeline in the specified language",
  "stageDistribution": [
    { "stage": "Lead", "count": 15, "percentage": 35.7, "color": "#9CA3AF" },
    { "stage": "Qualified", "count": 10, "percentage": 23.8, "color": "#3B82F6" },
    { "stage": "Proposal", "count": 8, "percentage": 19.0, "color": "#8B5CF6" },
    { "stage": "Negotiation", "count": 5, "percentage": 11.9, "color": "#F59E0B" },
    { "stage": "Won", "count": 4, "percentage": 9.5, "color": "#10B981" }
  ],
  "products": [
    { "code": "P1", "name": "Product category 1", "amount": 12500 },
    { "code": "P2", "name": "Product category 2", "amount": 9800 },
    { "code": "P3", "name": "Product category 3", "amount": 7200 },
    { "code": "P4", "name": "Product category 4", "amount": 5400 },
    { "code": "P5", "name": "Product category 5", "amount": 3800 }
  ],
  "trend": [
    { "month": "Jan", "amount": 5.2, "count": 8 },
    { "month": "Feb", "amount": 6.1, "count": 9 },
    { "month": "Mar", "amount": 7.3, "count": 11 },
    { "month": "Apr", "amount": 6.8, "count": 10 },
    { "month": "May", "amount": 8.5, "count": 13 },
    { "month": "Jun", "amount": 7.9, "count": 12 },
    { "month": "Jul", "amount": 9.2, "count": 14 },
    { "month": "Aug", "amount": 8.7, "count": 13 },
    { "month": "Sep", "amount": 10.1, "count": 16 },
    { "month": "Oct", "amount": 9.5, "count": 15 },
    { "month": "Nov", "amount": 11.3, "count": 18 },
    { "month": "Dec", "amount": 12.4, "count": 20 }
  ]
}
Use 5-8 realistic product categories for ${customer.industry || "technology"} industry.
trend amounts are in millions HKD. Make numbers realistic for this customer's scale.`;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Sales analytics AI. Return only valid JSON objects, no markdown." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          maxTokens: 2000,
        });
        const raw = response.choices?.[0]?.message?.content || "{}";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let data: any = {};
        try { data = JSON.parse(cleaned); }
        catch { const m = cleaned.match(/\{[\s\S]*\}/); if (m) data = JSON.parse(m[0]); }
        return data;
      } catch (err) {
        console.error("[Pipeline] LLM error:", err);
        throw new Error("Pipeline analysis failed");
      }
    }),
  }),


  geographic: router({
    getMarkers: publicProcedure
      .input(z.object({ customerId: z.number().optional() }))
      .query(async ({ input }) => {
        const markers = await db.getGeographicMarkers(input.customerId);
        const missingCoords = markers.filter(m => !m.hasCoordinates);

        if (missingCoords.length > 0) {
          try {
            const batch = missingCoords.slice(0, 20);
            const prompt = `You are a geography expert. For each company/entity below, provide the most accurate latitude and longitude for their primary office location.
 
Entities:
${batch.map((m, i) => `${i + 1}. Name: "${m.name}", Country: "${m.country}", City: "${m.city || 'unknown'}"`).join('\n')}
 
Return ONLY a JSON array, no markdown:
[{"index":1,"latitude":39.9042,"longitude":116.4074},{"index":2,"latitude":31.2304,"longitude":121.4737}]
 
Rules: decimal degrees only. If unknown, use the country capital. Return exactly ${batch.length} objects.`;

            // 用独立 timeout 代替 Promise.race，避免 TS2554
            let llmResult: any = null;
            const timeoutId = setTimeout(() => { /* no-op, handled below */ }, 8000);
            try {
              const llmResponse = await invokeLLM({
                messages: [
                  { role: "system", content: "You are a geocoding assistant. Return pure JSON arrays only." },
                  { role: "user", content: prompt }
                ],
                temperature: 0.1,
                maxTokens: 1000,
              });
              clearTimeout(timeoutId);
              llmResult = llmResponse;
            } catch (e) {
              clearTimeout(timeoutId);
              throw e;
            }

            const rawContent = llmResult?.choices?.[0]?.message?.content || "[]";
            const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

            let coordResults: Array<{ index: number; latitude: number; longitude: number }> = [];
            try {
              coordResults = JSON.parse(cleanContent);
            } catch {
              const match = cleanContent.match(/\[[\s\S]*\]/);
              if (match) coordResults = JSON.parse(match[0]);
            }

            for (const result of coordResults) {
              const entity = batch[result.index - 1];
              if (
                entity &&
                typeof result.latitude === "number" &&
                typeof result.longitude === "number" &&
                !isNaN(result.latitude) &&
                !isNaN(result.longitude)
              ) {
                await db.updateSubsidiary(entity.id, {
                  latitude: String(result.latitude),
                  longitude: String(result.longitude),
                } as any);
                const idx = markers.findIndex(m => m.id === entity.id);
                if (idx !== -1) {
                  markers[idx] = {
                    ...markers[idx],
                    latitude: result.latitude,
                    longitude: result.longitude,
                    hasCoordinates: true,
                  };
                }
              }
            }
            console.log(`[Geographic] LLM geocoded ${coordResults.length} entities`);
          } catch (geocodeError) {
            console.warn("[Geographic] LLM geocoding failed:", (geocodeError as Error).message);
          }
        }

        return markers;
      }),

    getAllWithCustomer: publicProcedure.query(async () => {
      return await db.getAllSubsidiariesWithCustomer();
    }),

    // AI auto-generate subsidiaries for a customer that has none
    autoFillSubsidiaries: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .mutation(async ({ input }) => {
        const customer = await db.getCustomerById(input.customerId);
        if (!customer) throw new Error("Customer not found");

        // Only auto-fill if there are no existing subsidiaries
        const existing = await db.getSubsidiariesByCustomer(input.customerId);
        if (existing.length > 0) {
          return { success: true, created: 0, message: "Already has subsidiary data" };
        }

        const prompt = `You are a corporate structure analyst.
Generate realistic global subsidiary/branch locations for this company:
- Name: ${customer.name}
- Industry: ${customer.industry || "Technology"}
- Country: ${customer.registrationCountry || "Unknown"}
- Description: ${customer.description || "Enterprise company"}

Return ONLY a valid JSON array (no markdown) of 6-12 subsidiaries/offices:
[
  {
    "name": "Entity name (e.g. Company Name - Singapore)",
    "entityType": "subsidiary",
    "country": "Singapore",
    "city": "Singapore",
    "latitude": 1.3521,
    "longitude": 103.8198,
    "employeeCount": 250,
    "operatingStatus": "active",
    "ownershipPercentage": 100,
    "industry": "${customer.industry || "Technology"}"
  }
]
entityType: headquarters|subsidiary|branch|affiliate
operatingStatus: active|inactive
Include the HQ (entityType: "headquarters") in the list.
Use accurate real-world coordinates for each city.
Mix of regions: Asia, Europe, Americas, Middle East if applicable.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "Corporate structure analyst. Return only valid JSON arrays." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            maxTokens: 2000,
          });

          const raw = response.choices?.[0]?.message?.content || "[]";
          const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          let subs: any[] = [];
          try { subs = JSON.parse(cleaned); }
          catch { const m = cleaned.match(/\[[\s\S]*\]/); if (m) subs = JSON.parse(m[0]); }

          if (!Array.isArray(subs) || subs.length === 0) {
            throw new Error("AI returned no subsidiary data");
          }

          let created = 0;
          for (const sub of subs) {
            await db.createSubsidiary({
              customerId: input.customerId,
              name: sub.name || `${customer.name} - ${sub.country}`,
              entityType: sub.entityType || "subsidiary",
              country: sub.country || null,
              city: sub.city || null,
              latitude: sub.latitude ? String(sub.latitude) : null,
              longitude: sub.longitude ? String(sub.longitude) : null,
              employeeCount: sub.employeeCount || null,
              operatingStatus: sub.operatingStatus || "active",
              ownershipPercentage: sub.ownershipPercentage || null,
              industry: sub.industry || customer.industry || null,
            });
            created++;
          }

          console.log(`[Geographic] AI created ${created} subsidiaries for customer ${input.customerId}`);
          return { success: true, created };
        } catch (err) {
          console.error("[Geographic autoFill] error:", err);
          throw new Error("AI subsidiary generation failed");
        }
      }),
  }),

  // ============ EXCEL IMPORT PROCESSING (ENHANCED) ============
  import: router({
    history: protectedProcedure.query(async () => { return await db.getDataImports({ limit: 50 }); }),
    uploadExcel: protectedProcedure.input(z.object({
      fileBase64: z.string(),
      dataType: z.enum(["customer", "subsidiary", "opportunity", "deal", "news", "project", "recommendation"]),
    })).mutation(async ({ input, ctx }) => {
      const { fileBase64, dataType } = input;
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("Database connection failed");

      // 1. Auto-migration (safe check)
      if (dataType === "customer") {
        try {
          await drizzle.execute(sql`
            ALTER TABLE customers
            ADD COLUMN IF NOT EXISTS businessType VARCHAR(128),
            ADD COLUMN IF NOT EXISTS foundedDate VARCHAR(32),
            ADD COLUMN IF NOT EXISTS registrationAddress TEXT,
            ADD COLUMN IF NOT EXISTS riskLevel VARCHAR(50),
            ADD COLUMN IF NOT EXISTS logoUrl VARCHAR(512),
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS employeeCount INT
          `);
        } catch (e) { console.log("Auto-migration skipped"); }
      }

      // 2. Create import record (Status: processing)
      const importRecordId = await db.createDataImport({
          fileName: `Import_${dataType}_${new Date().toISOString().slice(0, 10)}.xlsx`,
          fileType: "excel",
          importedBy: ctx.user.id,
          status: "processing"
      });

      // ✅✅✅ 3. Global Try-Catch to prevent "Processing" hang
      try {
        const buffer = Buffer.from(fileBase64, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        const fuzzyGetValue = (row: any, targetKeys: string[]) => {
          const actualKeys = Object.keys(row);
          for (const target of targetKeys) {
            const normalizedTarget = target.toLowerCase().replace(/[^a-z0-9]/g, "");
            const foundKey = actualKeys.find(ak =>
              ak.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedTarget
            );
            if (foundKey) {
              const val = row[foundKey];
              if (val !== undefined && val !== null) {
                const strVal = String(val).trim();
                if (strVal !== "" && strVal !== "NULL" && strVal !== "null") return strVal;
              }
            }
          }
          return undefined;
        };

        for (let i = 0; i < rawData.length; i++) {
          const row: any = rawData[i];
          try {
            // --- CUSTOMER ---
            if (dataType === "customer") {
              const name = fuzzyGetValue(row, ['name', 'Company Name', '公司名称']);
              if (!name) continue;

              let rawStatus = fuzzyGetValue(row, ['operatingStatus', 'Status', '运营状态']) || 'active';
              let rawRisk = fuzzyGetValue(row, ['riskLevel', 'Risk', '风险等级']) || 'unknown';
              let rawIndep = fuzzyGetValue(row, ['isIndependent', 'Independent']);
              let isIndep = true;
              if (rawIndep && (rawIndep.toUpperCase() === "NO" || rawIndep === "0" || rawIndep.toUpperCase() === "FALSE")) {
                  isIndep = false;
              }

              await db.createCustomer({
                name: String(name),
                globalOneId: fuzzyGetValue(row, ['globalOneId']),
                registeredName: fuzzyGetValue(row, ['registeredName']),
                localName: fuzzyGetValue(row, ['localName']),
                tradeName: fuzzyGetValue(row, ['tradeName']),
                industry: fuzzyGetValue(row, ['industry']),
                industryCode: fuzzyGetValue(row, ['industryCode']),
                businessType: fuzzyGetValue(row, ['businessType', 'Business Type']),
                foundedDate: fuzzyGetValue(row, ['foundedDate']),

                operatingStatus: rawStatus,
                riskLevel: rawRisk,
                isIndependent: isIndep,

                registrationCountry: fuzzyGetValue(row, ['registrationCountry']),
                registrationAddress: fuzzyGetValue(row, ['registrationAddress']),
                registrationNumber: fuzzyGetValue(row, ['registrationNumber']),
                registrationType: fuzzyGetValue(row, ['registrationType']),
                website: fuzzyGetValue(row, ['website']),
                phone: fuzzyGetValue(row, ['phone']),
                email: fuzzyGetValue(row, ['email']),
                annualRevenue: fuzzyGetValue(row, ['annualRevenue']) ? Number(fuzzyGetValue(row, ['annualRevenue'])) : undefined,
                capitalAmount: fuzzyGetValue(row, ['capitalAmount']) ? Number(fuzzyGetValue(row, ['capitalAmount'])) : undefined,
                employeeCount: fuzzyGetValue(row, ['employeeCount']) ? Number(fuzzyGetValue(row, ['employeeCount'])) : undefined,
                revenueYear: fuzzyGetValue(row, ['revenueYear']),
                revenueCurrency: fuzzyGetValue(row, ['revenueCurrency']),
                capitalCurrency: fuzzyGetValue(row, ['capitalCurrency']),
                stockExchange: fuzzyGetValue(row, ['stockExchange']),
                stockSymbol: fuzzyGetValue(row, ['stockSymbol']),
                riskDescription: fuzzyGetValue(row, ['riskDescription']),
                ceoName: fuzzyGetValue(row, ['ceoName']),
                ceoTitle: fuzzyGetValue(row, ['ceoTitle']),
                tags: fuzzyGetValue(row, ['tags']),
                logoUrl: fuzzyGetValue(row, ['logoUrl']),
                description: fuzzyGetValue(row, ['description']),
                notes: fuzzyGetValue(row, ['notes']),
                createdBy: ctx.user.id
              });
              successCount++;
            }

            // --- SUBSIDIARY (升级版：支持ID查找 + 多级嵌套查找) ---
            else if (dataType === "subsidiary") {
               const name = fuzzyGetValue(row, ['name', 'Name', '子公司名称']);
               const parent = fuzzyGetValue(row, ['parentName', 'Parent Company', '母公司名称']);
               const explicitCustId = fuzzyGetValue(row, ['customerId', 'Customer ID']);

               if (!name) throw new Error("Missing name");
               // 只要有 Parent Name 或 Customer ID 其中一个就行
               if (!parent && !explicitCustId) throw new Error("Must provide Customer ID or Parent Name");

               let parentCustomerId: number;
               let parentSubsidiaryId: number | undefined;

               if (explicitCustId) {
                  // 1. 如果 Excel 里填了 ID，直接用
                  parentCustomerId = parseInt(String(explicitCustId));
               } else {
                  // 2. 如果没填 ID，去客户表里找名字
                  const customers = await db.getCustomers({ search: String(parent), limit: 1 });
                  if (customers.length > 0) {
                    parentCustomerId = customers[0].id;
                  } else {
                     // 3. 【关键升级】客户表没找到？去子公司表里找找（也许它是孙子公司）
                     //
                     const parentSubs = await drizzle.select().from(subsidiaries).where(eq(subsidiaries.name, String(parent)));

                     if (parentSubs.length > 0) {
                        // 找到了！它爸爸也是个子公司。
                        parentCustomerId = parentSubs[0].customerId; // 继承爷爷的 ID
                        parentSubsidiaryId = parentSubs[0].id;       // 记录爸爸的 ID
                     } else {
                        throw new Error(`Parent company not found: ${parent}`);
                     }
                  }
               }

               await db.createSubsidiary({
                 customerId: parentCustomerId,
                 parentSubsidiaryId: parentSubsidiaryId,
                 name: String(name),
                 entityType: fuzzyGetValue(row, ['entityType', 'Type']) || "subsidiary",
                 country: fuzzyGetValue(row, ['country', 'Country']),
                 city: fuzzyGetValue(row, ['city', 'City']),
                 latitude: fuzzyGetValue(row, ['latitude', 'Lat']),
                 longitude: fuzzyGetValue(row, ['longitude', 'Lng']),
                 industry: fuzzyGetValue(row, ['industry']),
                 employeeCount: fuzzyGetValue(row, ['employeeCount']) ? Number(fuzzyGetValue(row, ['employeeCount'])) : undefined
               });
               successCount++;
            }

            // --- OPPORTUNITY ---
            else if (dataType === "opportunity") {
               const name = fuzzyGetValue(row, ['name', 'Name']);
               const customer = fuzzyGetValue(row, ['customerName', 'Customer']);
               if (!name || !customer) throw new Error("Missing name or customerName");
               const customers = await db.getCustomers({ search: String(customer), limit: 1 });
               if (customers.length === 0) throw new Error(`Customer not found: ${customer}`);

               await db.createOpportunity({
                 customerId: customers[0].id,
                 name: String(name),
                 amount: fuzzyGetValue(row, ['amount']) ? Number(fuzzyGetValue(row, ['amount'])) * 100 : 0,
                 stage: "lead",
                 status: "active",
                 ownerId: ctx.user.id
               });
               successCount++;
            }

            // --- DEAL ---
            else if (dataType === "deal") {
               const name = fuzzyGetValue(row, ['name', 'Name']);
               const customer = fuzzyGetValue(row, ['customerName', 'Customer']);
               if (!name || !customer) throw new Error("Missing name or customerName");
               const customers = await db.getCustomers({ search: String(customer), limit: 1 });
               if (customers.length === 0) throw new Error(`Customer not found: ${customer}`);

               await db.createDeal({
                 customerId: customers[0].id,
                 name: String(name),
                 amount: fuzzyGetValue(row, ['amount']) ? Number(fuzzyGetValue(row, ['amount'])) * 100 : 0,
                 status: "active",
                 closedDate: new Date(),
                 closedBy: ctx.user.id
               });
               successCount++;
            }

            // --- NEWS ---
            else if (dataType === "news") {
               const title = fuzzyGetValue(row, ['title', 'Title']);
               const customer = fuzzyGetValue(row, ['customerName', 'Customer']);
               if (!title || !customer) throw new Error("Missing title or customerName");
               const customers = await db.getCustomers({ search: String(customer), limit: 1 });
               if (customers.length === 0) throw new Error(`Customer not found: ${customer}`);
               await db.createNewsItem({
                 customerId: customers[0].id,
                 title: String(title),
                 summary: fuzzyGetValue(row, ['summary']),
                 content: fuzzyGetValue(row, ['content']),
                 sourceName: "Excel Import",
                 publishedDate: new Date(),
                 isRead: false
               });
               successCount++;
            }

          } catch (err) {
            failedCount++;
            errors.push(`Row ${i+1}: ${err instanceof Error ? err.message : "Error"}`);
          }
        }

        // Success - Update record
        await db.updateDataImport(importRecordId, {
          status: "completed", successRows: successCount, failedRows: failedCount, errorLog: errors.join('\n'), completedAt: new Date()
        });
        return { success: true, successCount, failedCount, errors };

      } catch (globalError) {
        // 🔴 Failure - Update record to 'failed' instead of leaving it 'processing'
        await db.updateDataImport(importRecordId, {
          status: "failed",
          errorLog: `Critical Import Error: ${globalError instanceof Error ? globalError.message : "Unknown error"}`,
          completedAt: new Date()
        });
        throw globalError;
      }
    }),
    processExcel: protectedProcedure.input(z.object({ importId: z.number(), dataType: z.enum(["customer", "subsidiary", "opportunity", "deal", "news"]), data: z.array(z.record(z.unknown())), })).mutation(async ({ input }) => { return { success: true }; }),
  }),
});

export type AppRouter = typeof appRouter;