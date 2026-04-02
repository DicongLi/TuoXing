import { int, mysqlTable, text, timestamp, varchar, boolean, bigint, decimal, serial, date, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ============ USER TABLE ============
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ CUSTOMERS (宽容模式) ============
export const customers = mysqlTable("customers", {
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
  createdBy: int("createdBy"),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ============ SUBSIDIARIES ============
export const subsidiaries = mysqlTable("subsidiaries", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subsidiary = typeof subsidiaries.$inferSelect;
export type InsertSubsidiary = typeof subsidiaries.$inferInsert;

// ============ OPPORTUNITIES ============
export const opportunities = mysqlTable("opportunities", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = typeof opportunities.$inferInsert;

// ============ DEALS ============
export const deals = mysqlTable("deals", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;

// ============ NEWS ITEMS ============
export const newsItems = mysqlTable("newsItems", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NewsItem = typeof newsItems.$inferSelect;
export type InsertNewsItem = typeof newsItems.$inferInsert;

// ============ DATA IMPORTS ============
export const dataImports = mysqlTable("dataImports", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DataImport = typeof dataImports.$inferSelect;
export type InsertDataImport = typeof dataImports.$inferInsert;

// ============ AI ANALYSIS LOGS ============
export const aiAnalysisLogs = mysqlTable("aiAnalysisLogs", {
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
  completedAt: timestamp("completedAt"),
});

export type AiAnalysisLog = typeof aiAnalysisLogs.$inferSelect;
export type InsertAiAnalysisLog = typeof aiAnalysisLogs.$inferInsert;

// ============ BHI PROJECTS ============
export const projects = mysqlTable('projects', {
  id: int('id').autoincrement().primaryKey(),
  originalId: varchar('original_id', { length: 50 }),
  name: varchar('name', { length: 255 }),
  investment: decimal('investment', { precision: 20, scale: 2 }),
  country: varchar('country', { length: 100 }),
  sector: varchar('sector', { length: 100 }),
  stage: varchar('stage', { length: 50 }),
  contractor: varchar('contractor', { length: 255 }),
  startDate: timestamp('start_date'),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ============ AI RECOMMENDATIONS ============
export const aiRecommendations = mysqlTable('ai_recommendations', {
  id: int('id').autoincrement().primaryKey(),
  projectId: varchar('project_id', { length: 50 }),
  productName: varchar('product_name', { length: 255 }),
  rank: int('rank'),
  confidence: varchar('confidence', { length: 20 }),
  aiScore: decimal('ai_score', { precision: 10, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export type AiRecommendation = typeof aiRecommendations.$inferSelect;
export type InsertAiRecommendation = typeof aiRecommendations.$inferInsert;

// ✅ 表关系定义
export const customersRelations = relations(customers, ({ many }) => ({
  subsidiaries: many(subsidiaries),
  opportunities: many(opportunities),
  deals: many(deals),
  newsItems: many(newsItems),
}));

export const subsidiariesRelations = relations(subsidiaries, ({ one, many }) => ({
  customer: one(customers, {
    fields: [subsidiaries.customerId],
    references: [customers.id],
  }),
  opportunities: many(opportunities),
  deals: many(deals),
}));

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  customer: one(customers, {
    fields: [opportunities.customerId],
    references: [customers.id],
  }),
  subsidiary: one(subsidiaries, {
    fields: [opportunities.subsidiaryId],
    references: [subsidiaries.id],
  }),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  customer: one(customers, {
    fields: [deals.customerId],
    references: [customers.id],
  }),
  subsidiary: one(subsidiaries, {
    fields: [deals.subsidiaryId],
    references: [subsidiaries.id],
  }),
}));

export const newsItemsRelations = relations(newsItems, ({ one }) => ({
  customer: one(customers, {
    fields: [newsItems.customerId],
    references: [customers.id],
  }),
}));