// ✅ 关键修改：必须在最第一行加这个，加载 .env 里的数据库密码
import "dotenv/config";

import { getDb } from "../server/db";
import { customers, deals, opportunities, newsItems } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

// 简单的随机数据生成器
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const dealStages = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
const dealStatuses = ["active", "completed", "cancelled", "renewed"];
const productTypes = ["Cloud Service", "Consulting", "Hardware License", "Maintenance", "Software Subscription"];

async function seedSmart() {
  console.log("🌱 Starting Smart Seeding...");

  // 初始化数据库连接
  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database. Please check if DATABASE_URL is set in .env file.");
  }

  // 1. 获取所有客户
  const allCustomers = await db.select().from(customers);
  console.log(`Found ${allCustomers.length} customers total.`);

  let seededCount = 0;

  for (const customer of allCustomers) {
    // 2. 检查这个客户名下有没有 Deal
    // (如果已有数据，就跳过，防止重复)
    const existingDeals = await db.select({ count: sql<number>`count(*)` })
      .from(deals)
      .where(eq(deals.customerId, customer.id));

    if (existingDeals[0].count > 0) {
      console.log(`Skipping ${customer.name} (already has data).`);
      continue;
    }

    console.log(`✨ Generating data for new customer: ${customer.name}...`);
    seededCount++;

    // === 生成 3-5 个 Opportunities (商机) ===
    const oppCount = getRandomInt(3, 5);
    for (let i = 0; i < oppCount; i++) {
      await db.insert(opportunities).values({
        customerId: customer.id,
        name: `${customer.name} - ${getRandomItem(productTypes)} Opportunity`,
        stage: getRandomItem(dealStages),
        status: "active",
        probability: getRandomInt(10, 90),
        amount: getRandomInt(10000, 500000) * 100, // 分
        currency: "USD",
        productType: getRandomItem(productTypes),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // === 生成 2-4 个 Deals (订单) ===
    const dealCount = getRandomInt(2, 4);
    for (let i = 0; i < dealCount; i++) {
      await db.insert(deals).values({
        customerId: customer.id,
        name: `${customer.name} - Contract #${getRandomInt(1000, 9999)}`,
        dealNumber: `D-${getRandomInt(10000, 99999)}`,
        amount: getRandomInt(50000, 1000000) * 100,
        currency: "USD",
        status: getRandomItem(dealStatuses),
        productType: getRandomItem(productTypes),
        closedDate: new Date(),
        createdAt: new Date(),
      });
    }

    // === 生成 1-2 条 News (新闻) ===
    await db.insert(newsItems).values({
      customerId: customer.id,
      title: `${customer.name} announces expansion in new region`,
      summary: "The company is growing fast and looking for new opportunities.",
      content: "Full news content placeholder...",
      sourceName: "Industry News",
      publishedDate: new Date(),
      sentiment: "positive",
      isRead: false
    });
  }

  console.log(`\n✅ Done! Generated data for ${seededCount} new customers.`);
  process.exit(0);
}

seedSmart().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});