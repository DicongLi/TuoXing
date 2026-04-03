import { eq, desc, and, sql, like, or, gte, lte, isNotNull, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  customers, Customer, InsertCustomer,
  subsidiaries, Subsidiary, InsertSubsidiary,
  opportunities, Opportunity, InsertOpportunity,
  deals, Deal, InsertDeal,
  newsItems, NewsItem, InsertNewsItem,
  dataImports, DataImport, InsertDataImport,
  aiAnalysisLogs, AiAnalysisLog, InsertAiAnalysisLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.email) {
    throw new Error("User email is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { email: user.email };
    const updateSet: Record<string, unknown> = {};

    if (user.openId) {
      values.openId = user.openId;
      updateSet.openId = user.openId;
    }
    if (user.name) {
      values.name = user.name;
      updateSet.name = user.name;
    }
    if (user.password) {
      values.password = user.password;
      updateSet.password = user.password;
    }
    if (user.loginMethod) {
      values.loginMethod = user.loginMethod;
      updateSet.loginMethod = user.loginMethod;
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function createUser(user: InsertUser): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(user);
  return result[0].insertId;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserLastSignIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ CUSTOMER QUERIES ============
export async function getCustomers(options?: { search?: string; limit?: number; offset?: number; userId?: number }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(customers);
  const conditions = [];
  if (options?.userId) conditions.push(eq(customers.createdBy, options.userId));
  if (options?.search) {
    conditions.push(or(
      like(customers.name, `%${options.search}%`),
      like(customers.registeredName, `%${options.search}%`),
      like(customers.industry, `%${options.search}%`)
    ));
  }
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  query = query.orderBy(desc(customers.updatedAt)) as typeof query;
  if (options?.limit) query = query.limit(options.limit) as typeof query;
  if (options?.offset) query = query.offset(options.offset) as typeof query;
  return await query;
}

export async function getCustomerById(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(customers.id, id)];
  if (userId) conditions.push(eq(customers.createdBy, userId));
  const result = await db.select().from(customers).where(and(...conditions)).limit(1);
  return result[0];
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(data);
  return result[0].insertId;
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customers).where(eq(customers.id, id));
}

export async function getCustomerCount(userId?: number) {
  const db = await getDb();
  if (!db) return 0;
  let query = db.select({ count: sql<number>`count(*)` }).from(customers);
  if (userId) query = query.where(eq(customers.createdBy, userId)) as typeof query;
  const result = await query;
  return result[0]?.count ?? 0;
}

// ============ SUBSIDIARY QUERIES ============
export async function getSubsidiariesByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(subsidiaries)
    .where(eq(subsidiaries.customerId, customerId))
    .orderBy(subsidiaries.name);
}

// Excel 导入辅助查找
export async function getSubsidiaryByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subsidiaries).where(eq(subsidiaries.name, name)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSubsidiaryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subsidiaries).where(eq(subsidiaries.id, id)).limit(1);
  return result[0];
}

export async function createSubsidiary(data: InsertSubsidiary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subsidiaries).values(data);
  return result[0].insertId;
}

export async function updateSubsidiary(id: number, data: Partial<InsertSubsidiary>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subsidiaries).set(data).where(eq(subsidiaries.id, id));
}

export async function deleteSubsidiary(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(subsidiaries).where(eq(subsidiaries.id, id));
}

export async function getSubsidiaryCount(customerId?: number) {
  const db = await getDb();
  if (!db) return 0;
  let query = db.select({ count: sql<number>`count(*)` }).from(subsidiaries);
  if (customerId) {
    query = query.where(eq(subsidiaries.customerId, customerId)) as typeof query;
  }
  const result = await query;
  return result[0]?.count ?? 0;
}

export async function getGeographicMarkers(customerId?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select({
    id: subsidiaries.id,
    name: subsidiaries.name,
    customerId: subsidiaries.customerId,
    country: subsidiaries.country,
    city: subsidiaries.city,
    latitude: subsidiaries.latitude,
    longitude: subsidiaries.longitude,
    entityType: subsidiaries.entityType,
    relationshipType: subsidiaries.relationshipType,
    operatingStatus: subsidiaries.operatingStatus,
  }).from(subsidiaries);

  if (customerId) {
    query = query.where(eq(subsidiaries.customerId, customerId)) as typeof query;
  }

  const results = await query;

  // ✅ 修复：不再过滤掉没有经纬度的记录
  // 有坐标的会显示在地图上，没有坐标的仍然显示在下方表格中
  return results.map(r => {
    const hasCoords = !!(
      r.latitude && r.longitude &&
      r.latitude.trim() !== "" && r.longitude.trim() !== "" &&
      !isNaN(parseFloat(r.latitude)) && !isNaN(parseFloat(r.longitude))
    );
    return {
      id: r.id,
      name: r.name,
      customerId: r.customerId,
      country: r.country || "Unknown",
      city: r.city || undefined,
      latitude: hasCoords ? parseFloat(r.latitude!) : null,
      longitude: hasCoords ? parseFloat(r.longitude!) : null,
      hasCoordinates: hasCoords,
      type: mapEntityTypeToMarkerType(r.entityType, r.relationshipType, r.operatingStatus),
    };
  });
}

function mapEntityTypeToMarkerType(
  entityType: string | null,
  relationshipType: string | null,
  operatingStatus: string | null
): string {
  if (operatingStatus === "inactive" || operatingStatus === "dissolved") {
    return "inactive";
  }

  if (entityType && entityType.trim() !== "") {
    const t = entityType.toLowerCase();
    if (t === 'headquarters' || t === 'hq') return 'hq';
    if (t === 'branch') return 'branch';
    if (t === 'subsidiary') return 'subsidiary';
    return t;
  }

  return "subsidiary";
}

export async function getAllSubsidiariesWithCustomer() {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    id: subsidiaries.id,
    name: subsidiaries.name,
    customerId: subsidiaries.customerId,
    customerName: customers.name,
    country: subsidiaries.country,
    city: subsidiaries.city,
    latitude: subsidiaries.latitude,
    longitude: subsidiaries.longitude,
    entityType: subsidiaries.entityType,
    relationshipType: subsidiaries.relationshipType,
    operatingStatus: subsidiaries.operatingStatus,
  })
  .from(subsidiaries)
  .leftJoin(customers, eq(subsidiaries.customerId, customers.id));

  return results;
}

// ============ OPPORTUNITY QUERIES ============
export async function getOpportunities(options?: {
  customerId?: number;
  status?: string;
  stage?: string;
  limit?: number;
  offset?: number;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({ opportunity: opportunities }).from(opportunities)
    .innerJoin(customers, eq(opportunities.customerId, customers.id));
  const conditions = [];
  if (options?.userId) conditions.push(eq(customers.createdBy, options.userId));
  if (options?.customerId) conditions.push(eq(opportunities.customerId, options.customerId));
  if (options?.status) conditions.push(eq(opportunities.status, options.status as any));
  if (options?.stage) conditions.push(eq(opportunities.stage, options.stage as any));
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  query = query.orderBy(desc(opportunities.createdAt)) as typeof query;
  if (options?.limit) query = query.limit(options.limit) as typeof query;
  if (options?.offset) query = query.offset(options.offset) as typeof query;
  const rows = await query;
  return rows.map(r => r.opportunity);
}

export async function getOpportunityById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
  return result[0];
}

export async function createOpportunity(data: InsertOpportunity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(opportunities).values(data);
  return result[0].insertId;
}

export async function updateOpportunity(id: number, data: Partial<InsertOpportunity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(opportunities).set(data).where(eq(opportunities.id, id));
}

export async function deleteOpportunity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(opportunities).where(eq(opportunities.id, id));
}

export async function getOpportunityStats(userId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, totalValue: 0 };
  const userFilter = userId
    ? sql`INNER JOIN customers ON opportunities.customerId = customers.id AND customers.createdBy = ${userId}`
    : sql``;
  const baseQ = userId
    ? db.select({ count: sql<number>`count(*)` }).from(opportunities)
        .innerJoin(customers, and(eq(opportunities.customerId, customers.id), eq(customers.createdBy, userId)))
    : db.select({ count: sql<number>`count(*)` }).from(opportunities);
  const activeQ = userId
    ? db.select({ count: sql<number>`count(*)` }).from(opportunities)
        .innerJoin(customers, and(eq(opportunities.customerId, customers.id), eq(customers.createdBy, userId)))
        .where(eq(opportunities.status, 'active'))
    : db.select({ count: sql<number>`count(*)` }).from(opportunities).where(eq(opportunities.status, 'active'));
  const valueQ = userId
    ? db.select({ sum: sql<number>`COALESCE(SUM(opportunities.amount), 0)` }).from(opportunities)
        .innerJoin(customers, and(eq(opportunities.customerId, customers.id), eq(customers.createdBy, userId)))
        .where(eq(opportunities.status, 'active'))
    : db.select({ sum: sql<number>`COALESCE(SUM(amount), 0)` }).from(opportunities).where(eq(opportunities.status, 'active'));
  const [total, active, value] = await Promise.all([baseQ, activeQ, valueQ]);
  return {
    total: total[0]?.count ?? 0,
    active: active[0]?.count ?? 0,
    totalValue: value[0]?.sum ?? 0
  };
}

export async function getOpportunityByStage(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
    stage: opportunities.stage,
    count: sql<number>`count(*)`,
    totalAmount: sql<number>`COALESCE(SUM(opportunities.amount), 0)`
  }).from(opportunities) as any;
  if (userId) {
    query = query.innerJoin(customers, and(eq(opportunities.customerId, customers.id), eq(customers.createdBy, userId)));
    query = query.where(eq(opportunities.status, 'active'));
  } else {
    query = query.where(eq(opportunities.status, 'active'));
  }
  query = query.groupBy(opportunities.stage);
  return query;
}

// ============ DEAL QUERIES ============
export async function getDeals(options?: {
  customerId?: number;
  status?: string;
  limit?: number;
  offset?: number;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({ deal: deals }).from(deals)
    .innerJoin(customers, eq(deals.customerId, customers.id));
  const conditions = [];
  if (options?.userId) conditions.push(eq(customers.createdBy, options.userId));
  if (options?.customerId) conditions.push(eq(deals.customerId, options.customerId));
  if (options?.status) conditions.push(eq(deals.status, options.status as any));
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  query = query.orderBy(desc(deals.closedDate)) as typeof query;
  if (options?.limit) query = query.limit(options.limit) as typeof query;
  if (options?.offset) query = query.offset(options.offset) as typeof query;
  const rows = await query;
  return rows.map(r => r.deal);
}

export async function getDealById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  return result[0];
}

export async function createDeal(data: InsertDeal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deals).values(data);
  return result[0].insertId;
}

export async function updateDeal(id: number, data: Partial<InsertDeal>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deals).set(data).where(eq(deals.id, id));
}

export async function deleteDeal(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(deals).where(eq(deals.id, id));
}

export async function getDealStats(userId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, totalValue: 0, activeValue: 0 };
  const totalQ = userId
    ? db.select({ count: sql<number>`count(*)` }).from(deals)
        .innerJoin(customers, and(eq(deals.customerId, customers.id), eq(customers.createdBy, userId)))
    : db.select({ count: sql<number>`count(*)` }).from(deals);
  const valueQ = userId
    ? db.select({ sum: sql<number>`COALESCE(SUM(deals.amount), 0)` }).from(deals)
        .innerJoin(customers, and(eq(deals.customerId, customers.id), eq(customers.createdBy, userId)))
    : db.select({ sum: sql<number>`COALESCE(SUM(amount), 0)` }).from(deals);
  const activeQ = userId
    ? db.select({ sum: sql<number>`COALESCE(SUM(deals.amount), 0)` }).from(deals)
        .innerJoin(customers, and(eq(deals.customerId, customers.id), eq(customers.createdBy, userId)))
        .where(eq(deals.status, 'active'))
    : db.select({ sum: sql<number>`COALESCE(SUM(amount), 0)` }).from(deals).where(eq(deals.status, 'active'));
  const [total, value, activeValue] = await Promise.all([totalQ, valueQ, activeQ]);
  return {
    total: total[0]?.count ?? 0,
    totalValue: value[0]?.sum ?? 0,
    activeValue: activeValue[0]?.sum ?? 0
  };
}

export async function getDealsByMonth(months: number = 12, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
    month: sql<string>`DATE_FORMAT(deals.closedDate, '%Y-%m')`,
    count: sql<number>`count(*)`,
    totalAmount: sql<number>`COALESCE(SUM(deals.amount), 0)`
  }).from(deals) as any;
  if (userId) {
    query = query.innerJoin(customers, and(eq(deals.customerId, customers.id), eq(customers.createdBy, userId)));
    query = query.where(and(
      gte(deals.closedDate, sql`DATE_SUB(NOW(), INTERVAL ${months} MONTH)`),
    ));
  } else {
    query = query.where(gte(deals.closedDate, sql`DATE_SUB(NOW(), INTERVAL ${months} MONTH)`));
  }
  query = query.groupBy(sql`DATE_FORMAT(deals.closedDate, '%Y-%m')`);
  query = query.orderBy(sql`DATE_FORMAT(deals.closedDate, '%Y-%m')`);
  return query;
}

// ============ NEWS QUERIES ============
export async function getNewsItems(options?: {
  customerId?: number;
  isHighlight?: boolean;
  limit?: number;
  offset?: number;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({ newsItem: newsItems }).from(newsItems)
    .innerJoin(customers, eq(newsItems.customerId, customers.id));
  const conditions = [];

  conditions.push(
    and(
      isNotNull(newsItems.sourceUrl),
      ne(newsItems.sourceUrl, "")
    )
  );

  if (options?.userId) conditions.push(eq(customers.createdBy, options.userId));
  if (options?.customerId) conditions.push(eq(newsItems.customerId, options.customerId));
  if (options?.isHighlight !== undefined) conditions.push(eq(newsItems.isHighlight, options.isHighlight));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  query = query.orderBy(desc(newsItems.publishedDate)) as typeof query;
  if (options?.limit) query = query.limit(options.limit) as typeof query;
  if (options?.offset) query = query.offset(options.offset) as typeof query;
  const rows = await query;
  return rows.map(r => r.newsItem);
}

export async function getNewsItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(newsItems).where(eq(newsItems.id, id)).limit(1);
  return result[0];
}

export async function createNewsItem(data: InsertNewsItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(newsItems).values(data);
  return result[0].insertId;
}

export async function updateNewsItem(id: number, data: Partial<InsertNewsItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(newsItems).set(data).where(eq(newsItems.id, id));
}

export async function deleteNewsItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(newsItems).where(eq(newsItems.id, id));
}

export async function getUnreadNewsCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(newsItems)
    .where(eq(newsItems.isRead, false));
  return result[0]?.count ?? 0;
}

// ============ DATA IMPORT QUERIES ============
export async function getDataImports(options?: { status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(dataImports);
  if (options?.status) {
    query = query.where(eq(dataImports.status, options.status as any)) as typeof query;
  }
  query = query.orderBy(desc(dataImports.createdAt)) as typeof query;
  if (options?.limit) query = query.limit(options.limit) as typeof query;
  return await query;
}

export async function getDataImportById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dataImports).where(eq(dataImports.id, id)).limit(1);
  return result[0];
}

export async function createDataImport(data: InsertDataImport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dataImports).values(data);
  return result[0].insertId;
}

export async function updateDataImport(id: number, data: Partial<InsertDataImport>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dataImports).set(data).where(eq(dataImports.id, id));
}

// ============ AI ANALYSIS QUERIES (Clean Version) ============

// ✅ 现在可以使用标准的 Drizzle 插入了
export async function createAiAnalysisLog(data: Partial<InsertAiAnalysisLog> & { entityType: string; entityId: number; analysisType: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiAnalysisLogs).values({
    entityType: data.entityType,
    entityId: data.entityId,
    analysisType: data.analysisType,
    requestedBy: data.requestedBy,
    status: data.status || "pending",
    prompt: data.prompt,
    response: data.response,
    // 因为表结构已经是 TEXT 了，这里就算传入 "" 也不会报错了
    // 依然保留简单的防空处理，作为良好的编程习惯
    result: data.result || "",
    errorMessage: data.errorMessage || "",
  });
  return result[0].insertId;
}

export async function updateAiAnalysisLog(id: number, data: Partial<InsertAiAnalysisLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(aiAnalysisLogs).set(data).where(eq(aiAnalysisLogs.id, id));
}

export async function getAiAnalysisLogs(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiAnalysisLogs)
    .where(and(
      eq(aiAnalysisLogs.entityType, entityType as any),
      eq(aiAnalysisLogs.entityId, entityId)
    ))
    .orderBy(desc(aiAnalysisLogs.createdAt));
}

// ============ DASHBOARD STATS ============
export async function getDashboardStats(userId?: number) {
  const db = await getDb();
  if (!db) return {
    customerCount: 0,
    subsidiaryCount: 0,
    activeOpportunities: 0,
    opportunityValue: 0,
    totalDeals: 0,
    dealValue: 0,
    unreadNews: 0
  };

  const [customerCount] = await db.select({ count: sql<number>`count(*)` }).from(customers)
    .where(userId ? eq(customers.createdBy, userId) : sql`1=1`);
  const [subsidiaryCount] = await db.select({ count: sql<number>`count(*)` }).from(subsidiaries)
    .innerJoin(customers, eq(subsidiaries.customerId, customers.id))
    .where(userId ? eq(customers.createdBy, userId) : sql`1=1`);
  const [activeOpps] = await db.select({
    count: sql<number>`count(*)`,
    value: sql<number>`COALESCE(SUM(${opportunities.amount}), 0)`
  }).from(opportunities)
    .innerJoin(customers, eq(opportunities.customerId, customers.id))
    .where(and(
      eq(opportunities.status, 'active'),
      userId ? eq(customers.createdBy, userId) : sql`1=1`
    ));
  const [dealStats] = await db.select({
    count: sql<number>`count(*)`,
    value: sql<number>`COALESCE(SUM(${deals.amount}), 0)`
  }).from(deals)
    .innerJoin(customers, eq(deals.customerId, customers.id))
    .where(userId ? eq(customers.createdBy, userId) : sql`1=1`);
  const [unreadNews] = await db.select({ count: sql<number>`count(*)` }).from(newsItems)
    .innerJoin(customers, eq(newsItems.customerId, customers.id))
    .where(and(
      eq(newsItems.isRead, false),
      userId ? eq(customers.createdBy, userId) : sql`1=1`
    ));

  return {
    customerCount: customerCount?.count ?? 0,
    subsidiaryCount: subsidiaryCount?.count ?? 0,
    activeOpportunities: activeOpps?.count ?? 0,
    opportunityValue: activeOpps?.value ?? 0,
    totalDeals: dealStats?.count ?? 0,
    dealValue: dealStats?.value ?? 0,
    unreadNews: unreadNews?.count ?? 0
  };
}