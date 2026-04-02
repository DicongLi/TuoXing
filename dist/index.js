// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, desc, and, sql, like, or, gte, isNotNull, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlTable, text, timestamp, varchar, boolean, bigint, decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  globalOneId: varchar("globalOneId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  registeredName: varchar("registeredName", { length: 255 }),
  localName: varchar("localName", { length: 255 }),
  tradeName: varchar("tradeName", { length: 255 }),
  industry: varchar("industry", { length: 128 }),
  industryCode: varchar("industryCode", { length: 32 }),
  businessType: varchar("businessType", { length: 128 }),
  foundedDate: varchar("foundedDate", { length: 32 }),
  operatingStatus: varchar("operatingStatus", { length: 100 }).default("active"),
  isIndependent: boolean("isIndependent").default(true),
  registrationCountry: varchar("registrationCountry", { length: 64 }),
  registrationAddress: text("registrationAddress"),
  registrationNumber: varchar("registrationNumber", { length: 64 }),
  registrationType: varchar("registrationType", { length: 64 }),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 64 }),
  email: varchar("email", { length: 255 }),
  capitalAmount: bigint("capitalAmount", { mode: "number" }),
  capitalCurrency: varchar("capitalCurrency", { length: 8 }).default("USD"),
  annualRevenue: bigint("annualRevenue", { mode: "number" }),
  revenueCurrency: varchar("revenueCurrency", { length: 8 }).default("USD"),
  revenueYear: varchar("revenueYear", { length: 8 }),
  employeeCount: int("employeeCount"),
  stockExchange: varchar("stockExchange", { length: 64 }),
  stockSymbol: varchar("stockSymbol", { length: 32 }),
  riskLevel: varchar("riskLevel", { length: 50 }).default("unknown"),
  riskDescription: text("riskDescription"),
  ceoName: varchar("ceoName", { length: 128 }),
  ceoTitle: varchar("ceoTitle", { length: 128 }),
  tags: text("tags"),
  logoUrl: varchar("logoUrl", { length: 512 }),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy")
});
var subsidiaries = mysqlTable("subsidiaries", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  parentSubsidiaryId: int("parentSubsidiaryId"),
  globalOneId: varchar("globalOneId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  localName: varchar("localName", { length: 255 }),
  entityType: varchar("entityType", { length: 50 }).default("subsidiary"),
  ownershipPercentage: int("ownershipPercentage"),
  country: varchar("country", { length: 64 }),
  region: varchar("region", { length: 64 }),
  city: varchar("city", { length: 64 }),
  address: text("address"),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  industry: varchar("industry", { length: 128 }),
  operatingStatus: varchar("operatingStatus", { length: 50 }).default("active"),
  employeeCount: int("employeeCount"),
  annualRevenue: bigint("annualRevenue", { mode: "number" }),
  revenueCurrency: varchar("revenueCurrency", { length: 8 }).default("USD"),
  relationshipType: varchar("relationshipType", { length: 50 }).default("customer"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var opportunities = mysqlTable("opportunities", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  subsidiaryId: int("subsidiaryId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  stage: varchar("stage", { length: 50 }).default("lead"),
  status: varchar("status", { length: 50 }).default("active"),
  probability: int("probability").default(0),
  amount: bigint("amount", { mode: "number" }),
  currency: varchar("currency", { length: 8 }).default("USD"),
  productType: varchar("productType", { length: 128 }),
  productCategory: varchar("productCategory", { length: 128 }),
  expectedCloseDate: timestamp("expectedCloseDate"),
  createdDate: timestamp("createdDate").defaultNow(),
  lastActivityDate: timestamp("lastActivityDate"),
  sourceType: varchar("sourceType", { length: 64 }),
  sourceDetail: varchar("sourceDetail", { length: 255 }),
  ownerId: int("ownerId"),
  ownerName: varchar("ownerName", { length: 128 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  subsidiaryId: int("subsidiaryId"),
  opportunityId: int("opportunityId"),
  dealNumber: varchar("dealNumber", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  amount: bigint("amount", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 8 }).default("USD"),
  monthlyRecurring: bigint("monthlyRecurring", { mode: "number" }),
  oneTimeFee: bigint("oneTimeFee", { mode: "number" }),
  productType: varchar("productType", { length: 128 }),
  productCategory: varchar("productCategory", { length: 128 }),
  contractStartDate: timestamp("contractStartDate"),
  contractEndDate: timestamp("contractEndDate"),
  contractDurationMonths: int("contractDurationMonths"),
  status: varchar("status", { length: 50 }).default("active"),
  closedDate: timestamp("closedDate"),
  closedBy: int("closedBy"),
  closedByName: varchar("closedByName", { length: 128 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var newsItems = mysqlTable("newsItems", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  subsidiaryId: int("subsidiaryId"),
  title: varchar("title", { length: 512 }).notNull(),
  summary: text("summary"),
  content: text("content"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  sourceName: varchar("sourceName", { length: 128 }),
  publishedDate: timestamp("publishedDate"),
  fetchedDate: timestamp("fetchedDate").defaultNow(),
  aiAnalysis: text("aiAnalysis"),
  aiAnalyzedAt: timestamp("aiAnalyzedAt"),
  category: varchar("category", { length: 64 }),
  sentiment: varchar("sentiment", { length: 50 }).default("unknown"),
  relevanceScore: int("relevanceScore"),
  isHighlight: boolean("isHighlight").default(false),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var dataImports = mysqlTable("dataImports", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }),
  fileSize: int("fileSize"),
  status: varchar("status", { length: 50 }).default("pending"),
  totalRows: int("totalRows"),
  successRows: int("successRows"),
  failedRows: int("failedRows"),
  fieldMapping: text("fieldMapping"),
  errorLog: text("errorLog"),
  importedBy: int("importedBy"),
  importedByName: varchar("importedByName", { length: 128 }),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var aiAnalysisLogs = mysqlTable("aiAnalysisLogs", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  analysisType: varchar("analysisType", { length: 64 }).notNull(),
  prompt: text("prompt"),
  response: text("response"),
  // ✅ 关键修改：从 json 改为 text，因为 AI 返回的是纯文本摘要，不是 json 对象
  result: text("result"),
  status: varchar("status", { length: 50 }).default("pending"),
  errorMessage: text("errorMessage"),
  requestedBy: int("requestedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt")
});
var projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  originalId: varchar("original_id", { length: 50 }),
  name: varchar("name", { length: 255 }),
  investment: decimal("investment", { precision: 20, scale: 2 }),
  country: varchar("country", { length: 100 }),
  sector: varchar("sector", { length: 100 }),
  stage: varchar("stage", { length: 50 }),
  contractor: varchar("contractor", { length: 255 }),
  startDate: timestamp("start_date"),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow()
});
var aiRecommendations = mysqlTable("ai_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: varchar("project_id", { length: 50 }),
  productName: varchar("product_name", { length: 255 }),
  rank: int("rank"),
  confidence: varchar("confidence", { length: 20 }),
  aiScore: decimal("ai_score", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow()
});
var customersRelations = relations(customers, ({ many }) => ({
  subsidiaries: many(subsidiaries),
  opportunities: many(opportunities),
  deals: many(deals),
  newsItems: many(newsItems)
}));
var subsidiariesRelations = relations(subsidiaries, ({ one, many }) => ({
  customer: one(customers, {
    fields: [subsidiaries.customerId],
    references: [customers.id]
  }),
  opportunities: many(opportunities),
  deals: many(deals)
}));
var opportunitiesRelations = relations(opportunities, ({ one }) => ({
  customer: one(customers, {
    fields: [opportunities.customerId],
    references: [customers.id]
  }),
  subsidiary: one(subsidiaries, {
    fields: [opportunities.subsidiaryId],
    references: [subsidiaries.id]
  })
}));
var dealsRelations = relations(deals, ({ one }) => ({
  customer: one(customers, {
    fields: [deals.customerId],
    references: [customers.id]
  }),
  subsidiary: one(subsidiaries, {
    fields: [deals.subsidiaryId],
    references: [subsidiaries.id]
  })
}));
var newsItemsRelations = relations(newsItems, ({ one }) => ({
  customer: one(customers, {
    fields: [newsItems.customerId],
    references: [customers.id]
  })
}));

// server/db.ts
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.email) {
    throw new Error("User email is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = { email: user.email };
    const updateSet = {};
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
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function createUser(user) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(user);
  return result[0].insertId;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateUserLastSignIn(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getCustomers(options) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(customers);
  if (options?.search) {
    query = query.where(or(
      like(customers.name, `%${options.search}%`),
      like(customers.registeredName, `%${options.search}%`),
      like(customers.industry, `%${options.search}%`)
    ));
  }
  query = query.orderBy(desc(customers.updatedAt));
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.offset(options.offset);
  return await query;
}
async function getCustomerById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}
async function createCustomer(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(data);
  return result[0].insertId;
}
async function updateCustomer(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set(data).where(eq(customers.id, id));
}
async function deleteCustomer(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customers).where(eq(customers.id, id));
}
async function getCustomerCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql`count(*)` }).from(customers);
  return result[0]?.count ?? 0;
}
async function getSubsidiariesByCustomer(customerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(subsidiaries).where(eq(subsidiaries.customerId, customerId)).orderBy(subsidiaries.name);
}
async function getSubsidiaryById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(subsidiaries).where(eq(subsidiaries.id, id)).limit(1);
  return result[0];
}
async function createSubsidiary(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subsidiaries).values(data);
  return result[0].insertId;
}
async function updateSubsidiary(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subsidiaries).set(data).where(eq(subsidiaries.id, id));
}
async function deleteSubsidiary(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(subsidiaries).where(eq(subsidiaries.id, id));
}
async function getSubsidiaryCount(customerId) {
  const db = await getDb();
  if (!db) return 0;
  let query = db.select({ count: sql`count(*)` }).from(subsidiaries);
  if (customerId) {
    query = query.where(eq(subsidiaries.customerId, customerId));
  }
  const result = await query;
  return result[0]?.count ?? 0;
}
async function getGeographicMarkers(customerId) {
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
    operatingStatus: subsidiaries.operatingStatus
  }).from(subsidiaries);
  if (customerId) {
    query = query.where(eq(subsidiaries.customerId, customerId));
  }
  const results = await query;
  return results.map((r) => {
    const hasCoords = !!(r.latitude && r.longitude && r.latitude.trim() !== "" && r.longitude.trim() !== "" && !isNaN(parseFloat(r.latitude)) && !isNaN(parseFloat(r.longitude)));
    return {
      id: r.id,
      name: r.name,
      customerId: r.customerId,
      country: r.country || "Unknown",
      city: r.city || void 0,
      latitude: hasCoords ? parseFloat(r.latitude) : null,
      longitude: hasCoords ? parseFloat(r.longitude) : null,
      hasCoordinates: hasCoords,
      type: mapEntityTypeToMarkerType(r.entityType, r.relationshipType, r.operatingStatus)
    };
  });
}
function mapEntityTypeToMarkerType(entityType, relationshipType, operatingStatus) {
  if (operatingStatus === "inactive" || operatingStatus === "dissolved") {
    return "inactive";
  }
  if (entityType && entityType.trim() !== "") {
    const t2 = entityType.toLowerCase();
    if (t2 === "headquarters" || t2 === "hq") return "hq";
    if (t2 === "branch") return "branch";
    if (t2 === "subsidiary") return "subsidiary";
    return t2;
  }
  return "subsidiary";
}
async function getAllSubsidiariesWithCustomer() {
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
    operatingStatus: subsidiaries.operatingStatus
  }).from(subsidiaries).leftJoin(customers, eq(subsidiaries.customerId, customers.id));
  return results;
}
async function getOpportunities(options) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(opportunities);
  const conditions = [];
  if (options?.customerId) conditions.push(eq(opportunities.customerId, options.customerId));
  if (options?.status) conditions.push(eq(opportunities.status, options.status));
  if (options?.stage) conditions.push(eq(opportunities.stage, options.stage));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  query = query.orderBy(desc(opportunities.createdAt));
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.offset(options.offset);
  return await query;
}
async function getOpportunityById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
  return result[0];
}
async function createOpportunity(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(opportunities).values(data);
  return result[0].insertId;
}
async function updateOpportunity(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(opportunities).set(data).where(eq(opportunities.id, id));
}
async function deleteOpportunity(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(opportunities).where(eq(opportunities.id, id));
}
async function getOpportunityStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, totalValue: 0 };
  const total = await db.select({ count: sql`count(*)` }).from(opportunities);
  const active = await db.select({ count: sql`count(*)` }).from(opportunities).where(eq(opportunities.status, "active"));
  const value = await db.select({ sum: sql`COALESCE(SUM(amount), 0)` }).from(opportunities).where(eq(opportunities.status, "active"));
  return {
    total: total[0]?.count ?? 0,
    active: active[0]?.count ?? 0,
    totalValue: value[0]?.sum ?? 0
  };
}
async function getOpportunityByStage() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    stage: opportunities.stage,
    count: sql`count(*)`,
    totalAmount: sql`COALESCE(SUM(amount), 0)`
  }).from(opportunities).where(eq(opportunities.status, "active")).groupBy(opportunities.stage);
  return result;
}
async function getDeals(options) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(deals);
  const conditions = [];
  if (options?.customerId) conditions.push(eq(deals.customerId, options.customerId));
  if (options?.status) conditions.push(eq(deals.status, options.status));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  query = query.orderBy(desc(deals.closedDate));
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.offset(options.offset);
  return await query;
}
async function getDealById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  return result[0];
}
async function createDeal(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deals).values(data);
  return result[0].insertId;
}
async function updateDeal(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deals).set(data).where(eq(deals.id, id));
}
async function deleteDeal(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(deals).where(eq(deals.id, id));
}
async function getDealStats() {
  const db = await getDb();
  if (!db) return { total: 0, totalValue: 0, activeValue: 0 };
  const total = await db.select({ count: sql`count(*)` }).from(deals);
  const value = await db.select({ sum: sql`COALESCE(SUM(amount), 0)` }).from(deals);
  const activeValue = await db.select({ sum: sql`COALESCE(SUM(amount), 0)` }).from(deals).where(eq(deals.status, "active"));
  return {
    total: total[0]?.count ?? 0,
    totalValue: value[0]?.sum ?? 0,
    activeValue: activeValue[0]?.sum ?? 0
  };
}
async function getDealsByMonth(months = 12) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    month: sql`DATE_FORMAT(closedDate, '%Y-%m')`,
    count: sql`count(*)`,
    totalAmount: sql`COALESCE(SUM(amount), 0)`
  }).from(deals).where(gte(deals.closedDate, sql`DATE_SUB(NOW(), INTERVAL ${months} MONTH)`)).groupBy(sql`DATE_FORMAT(closedDate, '%Y-%m')`).orderBy(sql`DATE_FORMAT(closedDate, '%Y-%m')`);
  return result;
}
async function getNewsItems(options) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(newsItems);
  const conditions = [];
  conditions.push(
    and(
      isNotNull(newsItems.sourceUrl),
      ne(newsItems.sourceUrl, "")
    )
  );
  if (options?.customerId) conditions.push(eq(newsItems.customerId, options.customerId));
  if (options?.isHighlight !== void 0) conditions.push(eq(newsItems.isHighlight, options.isHighlight));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  query = query.orderBy(desc(newsItems.publishedDate));
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.offset(options.offset);
  return await query;
}
async function getNewsItemById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(newsItems).where(eq(newsItems.id, id)).limit(1);
  return result[0];
}
async function createNewsItem(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(newsItems).values(data);
  return result[0].insertId;
}
async function updateNewsItem(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(newsItems).set(data).where(eq(newsItems.id, id));
}
async function deleteNewsItem(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(newsItems).where(eq(newsItems.id, id));
}
async function getUnreadNewsCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql`count(*)` }).from(newsItems).where(eq(newsItems.isRead, false));
  return result[0]?.count ?? 0;
}
async function getDataImports(options) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(dataImports);
  if (options?.status) {
    query = query.where(eq(dataImports.status, options.status));
  }
  query = query.orderBy(desc(dataImports.createdAt));
  if (options?.limit) query = query.limit(options.limit);
  return await query;
}
async function createDataImport(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dataImports).values(data);
  return result[0].insertId;
}
async function updateDataImport(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dataImports).set(data).where(eq(dataImports.id, id));
}
async function createAiAnalysisLog(data) {
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
    errorMessage: data.errorMessage || ""
  });
  return result[0].insertId;
}
async function updateAiAnalysisLog(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(aiAnalysisLogs).set(data).where(eq(aiAnalysisLogs.id, id));
}
async function getAiAnalysisLogs(entityType, entityId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiAnalysisLogs).where(and(
    eq(aiAnalysisLogs.entityType, entityType),
    eq(aiAnalysisLogs.entityId, entityId)
  )).orderBy(desc(aiAnalysisLogs.createdAt));
}
async function getDashboardStats() {
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
  const [customerCount] = await db.select({ count: sql`count(*)` }).from(customers);
  const [subsidiaryCount] = await db.select({ count: sql`count(*)` }).from(subsidiaries);
  const [activeOpps] = await db.select({
    count: sql`count(*)`,
    value: sql`COALESCE(SUM(amount), 0)`
  }).from(opportunities).where(eq(opportunities.status, "active"));
  const [dealStats] = await db.select({
    count: sql`count(*)`,
    value: sql`COALESCE(SUM(amount), 0)`
  }).from(deals);
  const [unreadNews] = await db.select({ count: sql`count(*)` }).from(newsItems).where(eq(newsItems.isRead, false));
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

// server/_core/cookies.ts
function getSessionCookieOptions(req) {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    // 保持 true，防止 JavaScript 偷取 Cookie
    path: "/",
    // 整个网站都有效
    // 【关键修改 1】本地开发必须用 "lax"，不能用 "none"
    sameSite: "lax",
    // 【关键修改 2】本地开发强制 false (HTTP)，线上才用 true (HTTPS)
    secure: isProduction
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/sdk.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email || `${userInfo.openId}@oauth.local`,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? "oauth",
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId || void 0,
      email: user.email,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email || `${userInfo.openId}@oauth.local`,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? "oauth",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import Parser from "rss-parser";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { eq as eq2, desc as desc2, sql as sql2 } from "drizzle-orm";

// server/llm.ts
function getConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
    apiUrl: process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions",
    model: process.env.LLM_MODEL || "gpt-4o-mini"
  };
}
async function invokeLLM(options) {
  const config = getConfig();
  console.log("--------------------------------------------------");
  console.log("\u{1F916} [LLM] \u6B63\u5728\u53D1\u8D77 AI \u8BF7\u6C42...");
  console.log("   \u{1F449} \u76EE\u6807 URL:", config.apiUrl);
  console.log("   \u{1F449} \u4F7F\u7528\u6A21\u578B:", config.model);
  console.log("   \u{1F449} API Key:", config.apiKey ? `\u2705 \u5DF2\u52A0\u8F7D (\u5C3E\u53F7: ${config.apiKey.slice(-4)})` : "\u274C \u672A\u627E\u5230 Key!");
  console.log("--------------------------------------------------");
  if (!config.apiKey) {
    console.warn("[LLM] \u274C \u4E25\u91CD\u9519\u8BEF: \u6CA1\u6709\u627E\u5230 API Key\uFF0C\u8BF7\u68C0\u67E5 .env \u6587\u4EF6");
    return {
      choices: [{
        message: {
          content: JSON.stringify({
            summary: "\u7CFB\u7EDF\u672A\u68C0\u6D4B\u5230 API Key\uFF0C\u8FD9\u662F\u6A21\u62DF\u7684\u56DE\u590D\u3002",
            recommendations: ["\u8BF7\u5728 .env \u6587\u4EF6\u4E2D\u914D\u7F6E LLM_API_KEY"]
          }),
          role: "assistant"
        },
        finish_reason: "stop"
      }]
    };
  }
  const requestBody = {
    model: config.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7
  };
  if (options.maxTokens) {
    requestBody.max_tokens = options.maxTokens;
  }
  if (options.responseFormat) {
    requestBody.response_format = options.responseFormat;
  }
  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLM] \u274C \u8BF7\u6C42\u88AB\u62D2\u7EDD! \u72B6\u6001\u7801: ${response.status}`);
      console.error(`[LLM] \u9519\u8BEF\u8BE6\u60C5: ${errorText}`);
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log("\u2705 [LLM] \u8BF7\u6C42\u6210\u529F! AI \u5DF2\u56DE\u590D\u3002");
    return data;
  } catch (error) {
    console.error("[LLM] \u274C \u7F51\u7EDC\u6216\u8BF7\u6C42\u53D1\u751F\u5F02\u5E38:", error);
    throw error;
  }
}

// server/routers.ts
var { hash, compare } = bcrypt;
var parser = new Parser();
var appRouter = router({
  system: systemRouter,
  // ============ AUTH ============
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(z2.object({
      email: z2.string().email("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u90AE\u7BB1\u5730\u5740"),
      password: z2.string().min(6, "\u5BC6\u7801\u81F3\u5C11\u9700\u89816\u4F4D"),
      name: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const existingUser = await getUserByEmail(input.email);
      if (existingUser) throw new Error("\u8BE5\u90AE\u7BB1\u5DF2\u88AB\u6CE8\u518C");
      const hashedPassword = await hash(input.password, 10);
      const userId = await createUser({
        email: input.email,
        password: hashedPassword,
        name: input.name || input.email.split("@")[0],
        role: "user",
        loginMethod: "local",
        openId: input.email,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const token = await sdk.signSession({
        openId: input.email,
        name: input.name || input.email.split("@")[0],
        appId: "local-dev-app"
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
      return { success: true, userId };
    }),
    login: publicProcedure.input(z2.object({
      email: z2.string().email(),
      password: z2.string()
    })).mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.password) throw new Error("\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF");
      const isValid = await compare(input.password, user.password);
      if (!isValid) throw new Error("\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF");
      const token = await sdk.signSession({
        openId: user.openId || user.email,
        name: user.name || "User",
        appId: "local-dev-app"
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
      await updateUserLastSignIn(user.id);
      return { success: true, token };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ============ DASHBOARD ============
  dashboard: router({
    stats: publicProcedure.query(async () => {
      return await getDashboardStats();
    }),
    recentDeals: publicProcedure.input(z2.object({ limit: z2.number().default(5) })).query(async ({ input }) => {
      return await getDeals({ limit: input.limit });
    }),
    recentNews: publicProcedure.input(z2.object({ limit: z2.number().default(5) })).query(async ({ input }) => {
      return await getNewsItems({ limit: input.limit });
    }),
    opportunityByStage: publicProcedure.query(async () => {
      return await getOpportunityByStage();
    }),
    dealsByMonth: publicProcedure.input(z2.object({ months: z2.number().default(12) })).query(async ({ input }) => {
      return await getDealsByMonth(input.months);
    })
  }),
  // ============ CUSTOMER ============
  customer: router({
    list: publicProcedure.input(z2.object({ search: z2.string().optional(), limit: z2.number().default(50), offset: z2.number().default(0) })).query(async ({ input }) => {
      return await getCustomers(input);
    }),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getCustomerById(input.id);
    }),
    create: protectedProcedure.input(z2.object({ name: z2.string().min(1), registeredName: z2.string().optional(), localName: z2.string().optional(), tradeName: z2.string().optional(), globalOneId: z2.string().optional(), industry: z2.string().optional(), industryCode: z2.string().optional(), businessType: z2.string().optional(), foundedDate: z2.string().optional(), operatingStatus: z2.string().optional(), isIndependent: z2.boolean().optional(), registrationCountry: z2.string().optional(), registrationAddress: z2.string().optional(), registrationNumber: z2.string().optional(), registrationType: z2.string().optional(), website: z2.string().optional(), phone: z2.string().optional(), email: z2.string().optional(), capitalAmount: z2.number().optional(), capitalCurrency: z2.string().optional(), annualRevenue: z2.number().optional(), revenueCurrency: z2.string().optional(), revenueYear: z2.string().optional(), employeeCount: z2.number().optional(), stockExchange: z2.string().optional(), stockSymbol: z2.string().optional(), riskLevel: z2.string().optional(), riskDescription: z2.string().optional(), ceoName: z2.string().optional(), ceoTitle: z2.string().optional(), tags: z2.string().optional(), logoUrl: z2.string().optional(), description: z2.string().optional(), notes: z2.string().optional() })).mutation(async ({ input, ctx }) => {
      const id = await createCustomer({ ...input, createdBy: ctx.user.id });
      return { id };
    }),
    update: protectedProcedure.input(z2.object({ id: z2.number(), data: z2.record(z2.any()) })).mutation(async ({ input }) => {
      await updateCustomer(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteCustomer(input.id);
      return { success: true };
    }),
    count: publicProcedure.query(async () => {
      return await getCustomerCount();
    })
  }),
  // ============ SUBSIDIARY ============
  subsidiary: router({
    listByCustomer: publicProcedure.input(z2.object({ customerId: z2.number() })).query(async ({ input }) => {
      return await getSubsidiariesByCustomer(input.customerId);
    }),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getSubsidiaryById(input.id);
    }),
    create: protectedProcedure.input(z2.object({ customerId: z2.number(), parentSubsidiaryId: z2.number().optional(), globalOneId: z2.string().optional(), name: z2.string().min(1), localName: z2.string().optional(), entityType: z2.string().optional(), ownershipPercentage: z2.number().min(0).max(100).optional(), country: z2.string().optional(), region: z2.string().optional(), city: z2.string().optional(), address: z2.string().optional(), latitude: z2.string().optional(), longitude: z2.string().optional(), industry: z2.string().optional(), operatingStatus: z2.string().optional(), employeeCount: z2.number().optional(), annualRevenue: z2.number().optional(), revenueCurrency: z2.string().optional(), relationshipType: z2.string().optional(), description: z2.string().optional() })).mutation(async ({ input }) => {
      const id = await createSubsidiary(input);
      return { id };
    }),
    update: protectedProcedure.input(z2.object({ id: z2.number(), data: z2.record(z2.any()) })).mutation(async ({ input }) => {
      await updateSubsidiary(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteSubsidiary(input.id);
      return { success: true };
    }),
    count: publicProcedure.input(z2.object({ customerId: z2.number().optional() })).query(async ({ input }) => {
      return await getSubsidiaryCount(input.customerId);
    })
  }),
  // ============ OPPORTUNITY ============
  opportunity: router({
    list: publicProcedure.input(z2.object({ customerId: z2.number().optional(), status: z2.string().optional(), stage: z2.string().optional(), limit: z2.number().default(50), offset: z2.number().default(0) })).query(async ({ input }) => {
      return await getOpportunities(input);
    }),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getOpportunityById(input.id);
    }),
    create: protectedProcedure.input(z2.object({ customerId: z2.number(), subsidiaryId: z2.number().optional(), name: z2.string().min(1), description: z2.string().optional(), stage: z2.string().optional(), status: z2.string().optional(), probability: z2.number().min(0).max(100).optional(), amount: z2.number().optional(), currency: z2.string().optional(), productType: z2.string().optional(), productCategory: z2.string().optional(), expectedCloseDate: z2.date().optional(), sourceType: z2.string().optional(), sourceDetail: z2.string().optional(), ownerName: z2.string().optional(), notes: z2.string().optional() })).mutation(async ({ input, ctx }) => {
      const id = await createOpportunity({ ...input, ownerId: ctx.user.id });
      return { id };
    }),
    update: protectedProcedure.input(z2.object({ id: z2.number(), data: z2.record(z2.any()) })).mutation(async ({ input }) => {
      await updateOpportunity(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteOpportunity(input.id);
      return { success: true };
    }),
    stats: publicProcedure.query(async () => {
      return await getOpportunityStats();
    }),
    byStage: publicProcedure.query(async () => {
      return await getOpportunityByStage();
    }),
    aiSearch: protectedProcedure.input(z2.object({
      customerId: z2.number(),
      language: z2.enum(["en", "zh-CN", "zh-TW"]).default("en")
    })).mutation(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");
      const langInstr = input.language === "zh-CN" ? "\u8BF7\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u586B\u5199\u6240\u6709\u6587\u5B57\u5B57\u6BB5\uFF08name, description, productType\uFF09\u3002\n" : input.language === "zh-TW" ? "\u8ACB\u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u586B\u5BEB\u6240\u6709\u6587\u5B57\u5B57\u6BB5\u3002\n" : "All text fields in English.\n";
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
            { role: "user", content: prompt }
          ],
          temperature: 0.4,
          maxTokens: 2e3
        });
        const raw = response.choices?.[0]?.message?.content || "{}";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let result = {};
        try {
          result = JSON.parse(cleaned);
        } catch {
          const m = cleaned.match(/\{[\s\S]*\}/);
          if (m) result = JSON.parse(m[0]);
        }
        return result;
      } catch (err) {
        console.error("[Opportunity AI] error:", err);
        throw new Error("AI opportunity search failed");
      }
    })
  }),
  // ============ DEAL ============
  deal: router({
    list: publicProcedure.input(z2.object({ customerId: z2.number().optional(), status: z2.string().optional(), limit: z2.number().default(50), offset: z2.number().default(0) })).query(async ({ input }) => {
      return await getDeals(input);
    }),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getDealById(input.id);
    }),
    create: protectedProcedure.input(z2.object({ customerId: z2.number(), subsidiaryId: z2.number().optional(), opportunityId: z2.number().optional(), dealNumber: z2.string().optional(), name: z2.string().min(1), description: z2.string().optional(), amount: z2.number(), currency: z2.string().optional(), monthlyRecurring: z2.number().optional(), oneTimeFee: z2.number().optional(), productType: z2.string().optional(), productCategory: z2.string().optional(), contractStartDate: z2.date().optional(), contractEndDate: z2.date().optional(), contractDurationMonths: z2.number().optional(), status: z2.string().optional(), closedDate: z2.date().optional(), closedByName: z2.string().optional(), notes: z2.string().optional() })).mutation(async ({ input, ctx }) => {
      const id = await createDeal({ ...input, closedBy: ctx.user.id });
      return { id };
    }),
    update: protectedProcedure.input(z2.object({ id: z2.number(), data: z2.record(z2.any()) })).mutation(async ({ input }) => {
      await updateDeal(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteDeal(input.id);
      return { success: true };
    }),
    stats: publicProcedure.query(async () => {
      return await getDealStats();
    }),
    byMonth: publicProcedure.input(z2.object({ months: z2.number().default(12) })).query(async ({ input }) => {
      return await getDealsByMonth(input.months);
    }),
    seedDemoData: protectedProcedure.mutation(async ({ ctx }) => {
      const customerList = await getCustomers({ limit: 20 });
      if (customerList.length === 0) throw new Error("No customers found. Please create at least one customer first.");
      const productTypes = ["IDC", "IDC2.0", "Cloud Services", "IEPL", "ICTS", "IPT", "SMS", "Connectivity", "SD-WAN", "Security Services"];
      const statuses = ["active", "active", "active", "completed", "completed", "pending"];
      const now = /* @__PURE__ */ new Date();
      let created = 0;
      for (let i = 0; i < 24; i++) {
        const customer = customerList[i % customerList.length];
        const monthsAgo = Math.floor(Math.random() * 18);
        const closedDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1);
        const baseAmount = Math.floor(Math.random() * 45e3 + 5e3);
        const productType = productTypes[Math.floor(Math.random() * productTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const quarter = `Q${Math.floor(closedDate.getMonth() / 3) + 1}`;
        await createDeal({
          customerId: customer.id,
          name: `${customer.name} - ${productType} ${closedDate.getFullYear()}-${quarter}`,
          amount: baseAmount * 100,
          productType,
          status,
          closedDate,
          closedBy: ctx.user.id,
          closedByName: ctx.user.name || "Demo User",
          currency: "USD",
          description: `Demo deal: ${productType} service agreement`
        });
        created++;
      }
      return { success: true, created };
    })
  }),
  // ============ ML & AI ============
  ml: router({
    getData: publicProcedure.query(async () => {
      const drizzle2 = await getDb();
      if (!drizzle2) return [];
      const allProjects = await drizzle2.select().from(projects).orderBy(desc2(projects.startDate)).limit(200);
      if (allProjects.length > 0) {
        const allRecs = await drizzle2.select().from(aiRecommendations);
        const recsMap = /* @__PURE__ */ new Map();
        allRecs.forEach((r) => {
          const pid = r.projectId || "";
          if (!recsMap.has(pid)) recsMap.set(pid, []);
          recsMap.get(pid).push(r);
        });
        return allProjects.map((p) => ({
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
          recommendations: recsMap.get(p.originalId || "") || []
        }));
      }
      console.log("[ML] No project data, generating via LLM...");
      try {
        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
- investment in \u4E07\u5143, range 5000-500000
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
          maxTokens: 4e3
        });
        const rawContent = llmResponse.choices[0]?.message?.content || "[]";
        const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let generatedProjects = [];
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
        const result = [];
        for (const proj of generatedProjects) {
          try {
            const oid = proj.originalId || `BHI-AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            await drizzle2.insert(projects).values({
              originalId: oid,
              name: proj.name || "Unknown Project",
              investment: String(proj.investment || 0),
              country: proj.country || "Unknown",
              sector: proj.sector || "General",
              stage: proj.stage || "Planning",
              startDate: proj.startDate ? new Date(proj.startDate) : /* @__PURE__ */ new Date(),
              contractor: proj.contractor || null,
              summary: proj.summary || null
            });
            const recs = [];
            if (Array.isArray(proj.recommendations)) {
              for (const rec of proj.recommendations) {
                await drizzle2.insert(aiRecommendations).values({
                  projectId: oid,
                  productName: rec.productName || "Unknown Product",
                  rank: typeof rec.rank === "number" ? rec.rank : 1,
                  confidence: rec.confidence || "Medium",
                  aiScore: String(typeof rec.aiScore === "number" ? rec.aiScore : 0.75)
                });
                recs.push({
                  projectId: oid,
                  productName: rec.productName,
                  rank: rec.rank,
                  confidence: rec.confidence,
                  aiScore: rec.aiScore
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
              recommendations: recs
            });
          } catch (insertErr) {
            console.warn("[ML] Failed to insert project:", proj.name, insertErr.message);
          }
        }
        console.log(`[ML] Generated and saved ${result.length} projects via LLM`);
        return result;
      } catch (llmError) {
        console.error("[ML] LLM generation failed:", llmError.message);
        return [];
      }
    }),
    // ── AI 实时搜索 ────────────────────────────────────────────
    search: publicProcedure.input(z2.object({ query: z2.string().min(1) })).mutation(async ({ input }) => {
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
- investment in \u4E07\u5143, range 5000-800000
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
          maxTokens: 3e3
        });
        const rawContent = llmResponse.choices[0]?.message?.content || "[]";
        const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let results = [];
        try {
          results = JSON.parse(cleanContent);
        } catch {
          const m = cleanContent.match(/\[[\s\S]*\]/);
          if (m) results = JSON.parse(m[0]);
        }
        if (!Array.isArray(results)) results = [];
        console.log(`[ML Search] LLM returned ${results.length} results for "${query}"`);
        return results.map((proj, i) => ({
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
          recommendations: Array.isArray(proj.recommendations) ? proj.recommendations.map((r) => ({
            productName: r.productName || "Unknown",
            rank: r.rank || 1,
            confidence: r.confidence || "Medium",
            aiScore: r.aiScore || 0.75
          })) : []
        }));
      } catch (err) {
        console.error("[ML Search] Failed:", err.message);
        throw new Error("AI search failed. Please check LLM API configuration.");
      }
    })
  }),
  ai: router({
    getLogs: publicProcedure.input(z2.object({ entityType: z2.string(), entityId: z2.number() })).query(async ({ input }) => {
      return await getAiAnalysisLogs(input.entityType, input.entityId);
    }),
    analyzeCustomer: protectedProcedure.input(z2.object({ language: z2.enum(["en", "zh-CN", "zh-TW"]).optional(), customerId: z2.number(), analysisType: z2.enum(["summary", "product_match", "talking_points", "risk_assessment"]) })).mutation(async ({ input, ctx }) => {
      try {
        const drizzle2 = await getDb();
        if (drizzle2) {
          await drizzle2.execute(sql2`
            ALTER TABLE aiAnalysisLogs
            ADD COLUMN IF NOT EXISTS result TEXT DEFAULT '',
            ADD COLUMN IF NOT EXISTS errorMessage TEXT DEFAULT '';
          `);
        }
      } catch (e) {
        console.log("Auto-migration for aiAnalysisLogs skipped or failed", e);
      }
      const customer = await getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");
      const logId = await createAiAnalysisLog({
        entityType: "customer",
        entityId: input.customerId,
        analysisType: input.analysisType,
        requestedBy: ctx.user.id,
        status: "processing",
        prompt: "Analyzing...",
        response: "Waiting for AI...",
        result: "Pending",
        // 替换了 ""
        errorMessage: "None"
        // 替换了 ""，确保它是一个实际的字符串值
      });
      const langInstruction = input.language === "zh-CN" ? "\u8BF7\u4F60\u5168\u7A0B\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u8FDB\u884C\u56DE\u7B54\uFF0C\u4E0D\u8981\u5939\u6742\u82F1\u6587\u3002\n" : input.language === "zh-TW" ? "\u8ACB\u4F60\u5168\u7A0B\u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u9032\u884C\u56DE\u7B54\uFF0C\u4E0D\u8981\u593E\u96DC\u82F1\u6587\u3002\n" : "Please respond entirely in English.\n";
      try {
        let prompt = "";
        const context = `Customer: ${customer.name}, Industry: ${customer.industry || "Unknown"}, Business: ${customer.description || "Unknown"}`;
        switch (input.analysisType) {
          case "summary":
            prompt = `Analyze this customer: ${context}.`;
            break;
          case "risk_assessment":
            prompt = `Evaluate risk for: ${context}.`;
            break;
          case "product_match":
            prompt = `Suggest products for: ${context}.`;
            break;
          case "talking_points":
            prompt = `Talking points for: ${context}.`;
            break;
        }
        await updateAiAnalysisLog(logId, { prompt });
        const response = await invokeLLM({ messages: [{ role: "system", content: langInstruction + "You are an enterprise business intelligence assistant. Always respond in the language specified at the beginning of this system prompt." }, { role: "user", content: prompt }], temperature: 0.7 });
        const analysisResult = response.choices[0]?.message?.content || "AI returned no content.";
        await updateAiAnalysisLog(logId, { result: analysisResult, response: analysisResult, status: "completed", completedAt: /* @__PURE__ */ new Date() });
        return { analysis: analysisResult, logId };
      } catch (error) {
        await updateAiAnalysisLog(logId, { status: "failed", errorMessage: error instanceof Error ? error.message : "Unknown AI error", completedAt: /* @__PURE__ */ new Date() });
        throw new Error("AI Analysis failed");
      }
    })
  }),
  // ============ NEWS ============
  news: router({
    list: publicProcedure.input(z2.object({ customerId: z2.number().optional(), isHighlight: z2.boolean().optional(), limit: z2.number().default(50), offset: z2.number().default(0) })).query(async ({ input }) => {
      return await getNewsItems(input);
    }),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getNewsItemById(input.id);
    }),
    create: protectedProcedure.input(z2.object({ customerId: z2.number(), subsidiaryId: z2.number().optional(), title: z2.string().min(1), summary: z2.string().optional(), content: z2.string().optional(), sourceUrl: z2.string().optional(), sourceName: z2.string().optional(), publishedDate: z2.date().optional(), category: z2.string().optional(), sentiment: z2.string().optional(), relevanceScore: z2.number().min(0).max(100).optional(), isHighlight: z2.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const id = await createNewsItem(input);
      return { id };
    }),
    update: protectedProcedure.input(z2.object({ id: z2.number(), data: z2.record(z2.any()) })).mutation(async ({ input }) => {
      await updateNewsItem(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteNewsItem(input.id);
      return { success: true };
    }),
    markRead: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await updateNewsItem(input.id, { isRead: true });
      return { success: true };
    }),
    unreadCount: publicProcedure.query(async () => {
      return await getUnreadNewsCount();
    }),
    searchNews: protectedProcedure.input(z2.object({
      customerId: z2.number(),
      query: z2.string().optional(),
      language: z2.enum(["en", "zh-CN", "zh-TW"]).default("en").optional()
    })).mutation(async ({ input, ctx }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");
      const oldNews = await getNewsItems({ customerId: input.customerId, limit: 100 });
      for (const item of oldNews) {
        await deleteNewsItem(item.id);
      }
      const keyword = input.query || customer.name;
      const insertedIds = [];
      const hasChinese = /[\u4e00-\u9fff]/.test(keyword);
      const buildUrl = (q, locale) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${locale}`;
      const searchUrls = hasChinese ? [
        buildUrl(keyword, "zh-CN&gl=CN&ceid=CN:zh"),
        buildUrl(keyword, "en-US&gl=US&ceid=US:en")
      ] : [
        buildUrl(keyword, "en-US&gl=US&ceid=US:en"),
        buildUrl(`${keyword} company news`, "en-US&gl=US&ceid=US:en")
      ];
      for (const feedUrl of searchUrls) {
        if (insertedIds.length > 0) break;
        try {
          console.log(`[News] Trying RSS: ${feedUrl}`);
          const feed = await Promise.race([
            parser.parseURL(feedUrl),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("RSS timeout")), 8e3)
            )
          ]);
          const items = (feed.items || []).slice(0, 10);
          if (items.length === 0) continue;
          const needsTranslation = input.language === "zh-CN" || input.language === "zh-TW";
          const translateInstr = input.language === "zh-CN" ? "\u5C06\u4EE5\u4E0B\u65B0\u95FB\u6807\u9898\u548C\u6458\u8981\u7FFB\u8BD1\u6210\u7B80\u4F53\u4E2D\u6587\uFF0C\u8FD4\u56DE\u76F8\u540CJSON\u7ED3\u6784\uFF1A" : input.language === "zh-TW" ? "\u5C07\u4EE5\u4E0B\u65B0\u805E\u6A19\u984C\u548C\u6458\u8981\u7FFB\u8B6F\u6210\u7E41\u9AD4\u4E2D\u6587\uFF0C\u8FD4\u56DE\u76F8\u540CJSON\u7D50\u69CB\uFF1A" : null;
          let processedItems = items;
          if (needsTranslation && translateInstr) {
            try {
              const toTranslate = items.map((it, i) => ({
                i,
                title: it.title || "",
                summary: it.contentSnippet || it.content || ""
              }));
              const transResp = await invokeLLM({
                messages: [
                  { role: "system", content: "You are a professional translator. Return only valid JSON arrays." },
                  { role: "user", content: `${translateInstr}
${JSON.stringify(toTranslate)}
Return ONLY a JSON array with same {i, title, summary} structure.` }
                ],
                temperature: 0.2,
                maxTokens: 2e3
              });
              const rawT = transResp.choices?.[0]?.message?.content || "[]";
              const cleanT = rawT.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              let translated = [];
              try {
                translated = JSON.parse(cleanT);
              } catch {
                const m = cleanT.match(/\[[\s\S]*\]/);
                if (m) translated = JSON.parse(m[0]);
              }
              if (Array.isArray(translated) && translated.length > 0) {
                processedItems = items.map((it, idx) => {
                  const tr = translated.find((t2) => t2.i === idx);
                  return tr ? { ...it, title: tr.title || it.title, contentSnippet: tr.summary || it.contentSnippet } : it;
                });
              }
            } catch (transErr) {
              console.warn("[News] Translation failed, using original:", transErr);
            }
          }
          for (const item of processedItems) {
            const articleUrl = item.link || item.guid || "";
            const id = await createNewsItem({
              customerId: input.customerId,
              title: item.title || "No Title",
              summary: item.contentSnippet || item.content || "",
              content: item.content || "",
              sourceName: item.source?.name || item.creator || "Google News",
              sourceUrl: articleUrl,
              publishedDate: item.pubDate ? new Date(item.pubDate) : /* @__PURE__ */ new Date(),
              sentiment: "neutral",
              category: "General",
              isRead: false
            });
            insertedIds.push(id);
          }
          if (insertedIds.length > 0) {
            console.log(`[News] RSS success: ${insertedIds.length} items`);
          }
        } catch (e) {
          console.warn(`[News] RSS failed: ${feedUrl}`, e.message);
        }
      }
      if (insertedIds.length === 0) {
        console.log(`[News] RSS unavailable, falling back to LLM for: ${keyword}`);
        try {
          const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
          const langInstr = input.language === "zh-CN" ? "\u8BF7\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u751F\u6210\u6240\u6709\u65B0\u95FB\u6807\u9898\u548C\u6458\u8981\u5185\u5BB9\u3002\n" : input.language === "zh-TW" ? "\u8ACB\u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u751F\u6210\u6240\u6709\u65B0\u805E\u6A19\u984C\u548C\u6458\u8981\u5167\u5BB9\u3002\n" : "Generate all news in English.\n";
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
            maxTokens: 2e3
          });
          const rawContent = llmResponse.choices[0]?.message?.content || "[]";
          const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          let newsItemsData = [];
          try {
            newsItemsData = JSON.parse(cleanContent);
          } catch {
            const match = cleanContent.match(/\[[\s\S]*\]/);
            if (match) newsItemsData = JSON.parse(match[0]);
          }
          if (Array.isArray(newsItemsData) && newsItemsData.length > 0) {
            for (const item of newsItemsData) {
              const id = await createNewsItem({
                customerId: input.customerId,
                title: item.title || "News Update",
                summary: item.summary || "",
                content: item.summary || "",
                sourceName: item.sourceName || "AI Generated",
                sourceUrl: item.sourceUrl || `https://news.google.com/search?q=${encodeURIComponent(keyword)}`,
                publishedDate: item.publishedDate ? new Date(item.publishedDate) : /* @__PURE__ */ new Date(),
                sentiment: item.sentiment || "neutral",
                category: item.category || "General",
                isRead: false
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
        throw new Error(`\u65E0\u6CD5\u83B7\u53D6"${keyword}"\u76F8\u5173\u65B0\u95FB\u3002\u8BF7\u68C0\u67E5 LLM API Key \u914D\u7F6E\uFF0C\u6216\u7A0D\u540E\u91CD\u8BD5\u3002`);
      }
      return { success: true, count: insertedIds.length, ids: insertedIds };
    })
  }),
  // ============ COMPETITOR (AI-driven per customer) ============
  competitor: router({
    search: protectedProcedure.input(z2.object({
      customerId: z2.number(),
      language: z2.enum(["en", "zh-CN", "zh-TW"]).default("en")
    })).mutation(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");
      const langInstr = input.language === "zh-CN" ? "\u8BF7\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u586B\u5199\u6240\u6709\u63CF\u8FF0\u3001\u6D1E\u5BDF\u3001\u51B2\u7A81\u9886\u57DF\u7B49\u6587\u5B57\u5B57\u6BB5\u3002\u516C\u53F8\u540D\u79F0\u53EF\u4FDD\u7559\u82F1\u6587\u3002\n" : input.language === "zh-TW" ? "\u8ACB\u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u586B\u5BEB\u6240\u6709\u63CF\u8FF0\u6027\u6587\u5B57\u5B57\u6BB5\u3002\n" : "All descriptive text fields in English.\n";
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
    "nameCn": "\u4E2D\u6587\u540D\u79F0 or same as name",
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
            { role: "user", content: prompt }
          ],
          temperature: 0.4,
          maxTokens: 4e3
        });
        const raw = response.choices?.[0]?.message?.content || "[]";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let competitors = [];
        try {
          competitors = JSON.parse(cleaned);
        } catch {
          const m = cleaned.match(/\[[\s\S]*\]/);
          if (m) competitors = JSON.parse(m[0]);
        }
        return { success: true, competitors: Array.isArray(competitors) ? competitors : [] };
      } catch (err) {
        console.error("[Competitor] LLM error:", err);
        return { success: false, competitors: [] };
      }
    })
  }),
  // ============ PIPELINE (AI-driven per customer + period) ============
  pipeline: router({
    analyze: protectedProcedure.input(z2.object({
      customerId: z2.number(),
      period: z2.string().default("2025"),
      language: z2.enum(["en", "zh-CN", "zh-TW"]).default("en")
    })).mutation(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");
      const langInstr = input.language === "zh-CN" ? "summary\u5B57\u6BB5\u548CstageDistribution\u7684stage\u540D\u79F0\u8BF7\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\uFF0Cproducts\u7684name\u5B57\u6BB5\u4F7F\u7528\u4E2D\u6587\u3002\n" : input.language === "zh-TW" ? "summary\u548Cstage\u540D\u7A31\u8ACB\u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u3002\n" : "All text fields in English.\n";
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
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          maxTokens: 2e3
        });
        const raw = response.choices?.[0]?.message?.content || "{}";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let data = {};
        try {
          data = JSON.parse(cleaned);
        } catch {
          const m = cleaned.match(/\{[\s\S]*\}/);
          if (m) data = JSON.parse(m[0]);
        }
        return data;
      } catch (err) {
        console.error("[Pipeline] LLM error:", err);
        throw new Error("Pipeline analysis failed");
      }
    })
  }),
  geographic: router({
    getMarkers: publicProcedure.input(z2.object({ customerId: z2.number().optional() })).query(async ({ input }) => {
      const markers = await getGeographicMarkers(input.customerId);
      const missingCoords = markers.filter((m) => !m.hasCoordinates);
      if (missingCoords.length > 0) {
        try {
          const batch = missingCoords.slice(0, 20);
          const prompt = `You are a geography expert. For each company/entity below, provide the most accurate latitude and longitude for their primary office location.
 
Entities:
${batch.map((m, i) => `${i + 1}. Name: "${m.name}", Country: "${m.country}", City: "${m.city || "unknown"}"`).join("\n")}
 
Return ONLY a JSON array, no markdown:
[{"index":1,"latitude":39.9042,"longitude":116.4074},{"index":2,"latitude":31.2304,"longitude":121.4737}]
 
Rules: decimal degrees only. If unknown, use the country capital. Return exactly ${batch.length} objects.`;
          let llmResult = null;
          const timeoutId = setTimeout(() => {
          }, 8e3);
          try {
            const llmResponse = await invokeLLM({
              messages: [
                { role: "system", content: "You are a geocoding assistant. Return pure JSON arrays only." },
                { role: "user", content: prompt }
              ],
              temperature: 0.1,
              maxTokens: 1e3
            });
            clearTimeout(timeoutId);
            llmResult = llmResponse;
          } catch (e) {
            clearTimeout(timeoutId);
            throw e;
          }
          const rawContent = llmResult?.choices?.[0]?.message?.content || "[]";
          const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          let coordResults = [];
          try {
            coordResults = JSON.parse(cleanContent);
          } catch {
            const match = cleanContent.match(/\[[\s\S]*\]/);
            if (match) coordResults = JSON.parse(match[0]);
          }
          for (const result of coordResults) {
            const entity = batch[result.index - 1];
            if (entity && typeof result.latitude === "number" && typeof result.longitude === "number" && !isNaN(result.latitude) && !isNaN(result.longitude)) {
              await updateSubsidiary(entity.id, {
                latitude: String(result.latitude),
                longitude: String(result.longitude)
              });
              const idx = markers.findIndex((m) => m.id === entity.id);
              if (idx !== -1) {
                markers[idx] = {
                  ...markers[idx],
                  latitude: result.latitude,
                  longitude: result.longitude,
                  hasCoordinates: true
                };
              }
            }
          }
          console.log(`[Geographic] LLM geocoded ${coordResults.length} entities`);
        } catch (geocodeError) {
          console.warn("[Geographic] LLM geocoding failed:", geocodeError.message);
        }
      }
      return markers;
    }),
    getAllWithCustomer: publicProcedure.query(async () => {
      return await getAllSubsidiariesWithCustomer();
    }),
    // AI auto-generate subsidiaries for a customer that has none
    autoFillSubsidiaries: protectedProcedure.input(z2.object({ customerId: z2.number() })).mutation(async ({ input }) => {
      const customer = await getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");
      const existing = await getSubsidiariesByCustomer(input.customerId);
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
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          maxTokens: 2e3
        });
        const raw = response.choices?.[0]?.message?.content || "[]";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let subs = [];
        try {
          subs = JSON.parse(cleaned);
        } catch {
          const m = cleaned.match(/\[[\s\S]*\]/);
          if (m) subs = JSON.parse(m[0]);
        }
        if (!Array.isArray(subs) || subs.length === 0) {
          throw new Error("AI returned no subsidiary data");
        }
        let created = 0;
        for (const sub of subs) {
          await createSubsidiary({
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
            industry: sub.industry || customer.industry || null
          });
          created++;
        }
        console.log(`[Geographic] AI created ${created} subsidiaries for customer ${input.customerId}`);
        return { success: true, created };
      } catch (err) {
        console.error("[Geographic autoFill] error:", err);
        throw new Error("AI subsidiary generation failed");
      }
    })
  }),
  // ============ EXCEL IMPORT PROCESSING (ENHANCED) ============
  import: router({
    history: protectedProcedure.query(async () => {
      return await getDataImports({ limit: 50 });
    }),
    uploadExcel: protectedProcedure.input(z2.object({
      fileBase64: z2.string(),
      dataType: z2.enum(["customer", "subsidiary", "opportunity", "deal", "news", "project", "recommendation"])
    })).mutation(async ({ input, ctx }) => {
      const { fileBase64, dataType } = input;
      const drizzle2 = await getDb();
      if (!drizzle2) throw new Error("Database connection failed");
      if (dataType === "customer") {
        try {
          await drizzle2.execute(sql2`
            ALTER TABLE customers
            ADD COLUMN IF NOT EXISTS businessType VARCHAR(128),
            ADD COLUMN IF NOT EXISTS foundedDate VARCHAR(32),
            ADD COLUMN IF NOT EXISTS registrationAddress TEXT,
            ADD COLUMN IF NOT EXISTS riskLevel VARCHAR(50),
            ADD COLUMN IF NOT EXISTS logoUrl VARCHAR(512),
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS employeeCount INT
          `);
        } catch (e) {
          console.log("Auto-migration skipped");
        }
      }
      const importRecordId = await createDataImport({
        fileName: `Import_${dataType}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`,
        fileType: "excel",
        importedBy: ctx.user.id,
        status: "processing"
      });
      try {
        const buffer = Buffer.from(fileBase64, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        let successCount = 0;
        let failedCount = 0;
        const errors = [];
        const fuzzyGetValue = (row, targetKeys) => {
          const actualKeys = Object.keys(row);
          for (const target of targetKeys) {
            const normalizedTarget = target.toLowerCase().replace(/[^a-z0-9]/g, "");
            const foundKey = actualKeys.find(
              (ak) => ak.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedTarget
            );
            if (foundKey) {
              const val = row[foundKey];
              if (val !== void 0 && val !== null) {
                const strVal = String(val).trim();
                if (strVal !== "" && strVal !== "NULL" && strVal !== "null") return strVal;
              }
            }
          }
          return void 0;
        };
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          try {
            if (dataType === "customer") {
              const name = fuzzyGetValue(row, ["name", "Company Name", "\u516C\u53F8\u540D\u79F0"]);
              if (!name) continue;
              let rawStatus = fuzzyGetValue(row, ["operatingStatus", "Status", "\u8FD0\u8425\u72B6\u6001"]) || "active";
              let rawRisk = fuzzyGetValue(row, ["riskLevel", "Risk", "\u98CE\u9669\u7B49\u7EA7"]) || "unknown";
              let rawIndep = fuzzyGetValue(row, ["isIndependent", "Independent"]);
              let isIndep = true;
              if (rawIndep && (rawIndep.toUpperCase() === "NO" || rawIndep === "0" || rawIndep.toUpperCase() === "FALSE")) {
                isIndep = false;
              }
              await createCustomer({
                name: String(name),
                globalOneId: fuzzyGetValue(row, ["globalOneId"]),
                registeredName: fuzzyGetValue(row, ["registeredName"]),
                localName: fuzzyGetValue(row, ["localName"]),
                tradeName: fuzzyGetValue(row, ["tradeName"]),
                industry: fuzzyGetValue(row, ["industry"]),
                industryCode: fuzzyGetValue(row, ["industryCode"]),
                businessType: fuzzyGetValue(row, ["businessType", "Business Type"]),
                foundedDate: fuzzyGetValue(row, ["foundedDate"]),
                operatingStatus: rawStatus,
                riskLevel: rawRisk,
                isIndependent: isIndep,
                registrationCountry: fuzzyGetValue(row, ["registrationCountry"]),
                registrationAddress: fuzzyGetValue(row, ["registrationAddress"]),
                registrationNumber: fuzzyGetValue(row, ["registrationNumber"]),
                registrationType: fuzzyGetValue(row, ["registrationType"]),
                website: fuzzyGetValue(row, ["website"]),
                phone: fuzzyGetValue(row, ["phone"]),
                email: fuzzyGetValue(row, ["email"]),
                annualRevenue: fuzzyGetValue(row, ["annualRevenue"]) ? Number(fuzzyGetValue(row, ["annualRevenue"])) : void 0,
                capitalAmount: fuzzyGetValue(row, ["capitalAmount"]) ? Number(fuzzyGetValue(row, ["capitalAmount"])) : void 0,
                employeeCount: fuzzyGetValue(row, ["employeeCount"]) ? Number(fuzzyGetValue(row, ["employeeCount"])) : void 0,
                revenueYear: fuzzyGetValue(row, ["revenueYear"]),
                revenueCurrency: fuzzyGetValue(row, ["revenueCurrency"]),
                capitalCurrency: fuzzyGetValue(row, ["capitalCurrency"]),
                stockExchange: fuzzyGetValue(row, ["stockExchange"]),
                stockSymbol: fuzzyGetValue(row, ["stockSymbol"]),
                riskDescription: fuzzyGetValue(row, ["riskDescription"]),
                ceoName: fuzzyGetValue(row, ["ceoName"]),
                ceoTitle: fuzzyGetValue(row, ["ceoTitle"]),
                tags: fuzzyGetValue(row, ["tags"]),
                logoUrl: fuzzyGetValue(row, ["logoUrl"]),
                description: fuzzyGetValue(row, ["description"]),
                notes: fuzzyGetValue(row, ["notes"]),
                createdBy: ctx.user.id
              });
              successCount++;
            } else if (dataType === "subsidiary") {
              const name = fuzzyGetValue(row, ["name", "Name", "\u5B50\u516C\u53F8\u540D\u79F0"]);
              const parent = fuzzyGetValue(row, ["parentName", "Parent Company", "\u6BCD\u516C\u53F8\u540D\u79F0"]);
              const explicitCustId = fuzzyGetValue(row, ["customerId", "Customer ID"]);
              if (!name) throw new Error("Missing name");
              if (!parent && !explicitCustId) throw new Error("Must provide Customer ID or Parent Name");
              let parentCustomerId;
              let parentSubsidiaryId;
              if (explicitCustId) {
                parentCustomerId = parseInt(String(explicitCustId));
              } else {
                const customers2 = await getCustomers({ search: String(parent), limit: 1 });
                if (customers2.length > 0) {
                  parentCustomerId = customers2[0].id;
                } else {
                  const parentSubs = await drizzle2.select().from(subsidiaries).where(eq2(subsidiaries.name, String(parent)));
                  if (parentSubs.length > 0) {
                    parentCustomerId = parentSubs[0].customerId;
                    parentSubsidiaryId = parentSubs[0].id;
                  } else {
                    throw new Error(`Parent company not found: ${parent}`);
                  }
                }
              }
              await createSubsidiary({
                customerId: parentCustomerId,
                parentSubsidiaryId,
                name: String(name),
                entityType: fuzzyGetValue(row, ["entityType", "Type"]) || "subsidiary",
                country: fuzzyGetValue(row, ["country", "Country"]),
                city: fuzzyGetValue(row, ["city", "City"]),
                latitude: fuzzyGetValue(row, ["latitude", "Lat"]),
                longitude: fuzzyGetValue(row, ["longitude", "Lng"]),
                industry: fuzzyGetValue(row, ["industry"]),
                employeeCount: fuzzyGetValue(row, ["employeeCount"]) ? Number(fuzzyGetValue(row, ["employeeCount"])) : void 0
              });
              successCount++;
            } else if (dataType === "opportunity") {
              const name = fuzzyGetValue(row, ["name", "Name"]);
              const customer = fuzzyGetValue(row, ["customerName", "Customer"]);
              if (!name || !customer) throw new Error("Missing name or customerName");
              const customers2 = await getCustomers({ search: String(customer), limit: 1 });
              if (customers2.length === 0) throw new Error(`Customer not found: ${customer}`);
              await createOpportunity({
                customerId: customers2[0].id,
                name: String(name),
                amount: fuzzyGetValue(row, ["amount"]) ? Number(fuzzyGetValue(row, ["amount"])) * 100 : 0,
                stage: "lead",
                status: "active",
                ownerId: ctx.user.id
              });
              successCount++;
            } else if (dataType === "deal") {
              const name = fuzzyGetValue(row, ["name", "Name"]);
              const customer = fuzzyGetValue(row, ["customerName", "Customer"]);
              if (!name || !customer) throw new Error("Missing name or customerName");
              const customers2 = await getCustomers({ search: String(customer), limit: 1 });
              if (customers2.length === 0) throw new Error(`Customer not found: ${customer}`);
              await createDeal({
                customerId: customers2[0].id,
                name: String(name),
                amount: fuzzyGetValue(row, ["amount"]) ? Number(fuzzyGetValue(row, ["amount"])) * 100 : 0,
                status: "active",
                closedDate: /* @__PURE__ */ new Date(),
                closedBy: ctx.user.id
              });
              successCount++;
            } else if (dataType === "news") {
              const title = fuzzyGetValue(row, ["title", "Title"]);
              const customer = fuzzyGetValue(row, ["customerName", "Customer"]);
              if (!title || !customer) throw new Error("Missing title or customerName");
              const customers2 = await getCustomers({ search: String(customer), limit: 1 });
              if (customers2.length === 0) throw new Error(`Customer not found: ${customer}`);
              await createNewsItem({
                customerId: customers2[0].id,
                title: String(title),
                summary: fuzzyGetValue(row, ["summary"]),
                content: fuzzyGetValue(row, ["content"]),
                sourceName: "Excel Import",
                publishedDate: /* @__PURE__ */ new Date(),
                isRead: false
              });
              successCount++;
            }
          } catch (err) {
            failedCount++;
            errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Error"}`);
          }
        }
        await updateDataImport(importRecordId, {
          status: "completed",
          successRows: successCount,
          failedRows: failedCount,
          errorLog: errors.join("\n"),
          completedAt: /* @__PURE__ */ new Date()
        });
        return { success: true, successCount, failedCount, errors };
      } catch (globalError) {
        await updateDataImport(importRecordId, {
          status: "failed",
          errorLog: `Critical Import Error: ${globalError instanceof Error ? globalError.message : "Unknown error"}`,
          completedAt: /* @__PURE__ */ new Date()
        });
        throw globalError;
      }
    }),
    processExcel: protectedProcedure.input(z2.object({ importId: z2.number(), dataType: z2.enum(["customer", "subsidiary", "opportunity", "deal", "news"]), data: z2.array(z2.record(z2.unknown())) })).mutation(async ({ input }) => {
      return { success: true };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
