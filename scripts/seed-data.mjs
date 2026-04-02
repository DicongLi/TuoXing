import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

// 辅助函数
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomAmount = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (daysBack) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date;
};

async function seed() {
  console.log("🌱 Connecting to database...");
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  // ==========================================
  // 1. 读取现有客户 (绝不修改)
  // ==========================================
  console.log("🔍 Fetching existing customers...");

  // 我们只查 ID 和 Name，用来做关联
  const [customerRows] = await connection.execute("SELECT id, name FROM customers");

  if (customerRows.length === 0) {
    console.error("❌ No customers found! Please make sure your real customer data is already imported.");
    process.exit(1);
  }

  const customerIds = customerRows.map(row => row.id);
  console.log(`✅ Found ${customerIds.length} existing customers. Using them to generate data...`);

  // ==========================================
  // 2. 批量生成随机 Opportunities (商机)
  // ==========================================
  console.log("... Generating 50 Random Opportunities");

  const productTypes = ["Cloud Services", "AI Solutions", "IoT Platform", "5G Private Network", "Cybersecurity", "Data Analytics", "Smart Factory", "ERP System"];
  const stages = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
  // 不同阶段对应的平均概率
  const probabilityMap = { "lead": 10, "qualified": 30, "proposal": 50, "negotiation": 80, "closed_won": 100, "closed_lost": 0 };

  for (let i = 0; i < 50; i++) {
    const custId = getRandom(customerIds); // 随机挂靠到一个现有客户
    const prod = getRandom(productTypes);
    const stage = getRandom(stages);
    const amount = getRandomAmount(100000, 50000000) * 100; // 随机金额
    const prob = probabilityMap[stage];
    const name = `${prod} Expansion Phase ${Math.floor(Math.random() * 3) + 1}`;

    await connection.execute(
      `INSERT INTO opportunities (customerId, name, productType, stage, amount, probability, description, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [custId, name, prod, stage, amount, prob, `Auto-generated opportunity for ${prod}`]
    );
  }

  // ==========================================
  // 3. 批量生成随机 Deals (订单)
  // ==========================================
  console.log("... Generating 50 Random Deals");

  const dealStatuses = ["active", "completed", "cancelled", "renewed"];

  for (let i = 0; i < 50; i++) {
    const custId = getRandom(customerIds);
    const prod = getRandom(productTypes);
    const status = getRandom(dealStatuses);
    const amount = getRandomAmount(500000, 20000000) * 100;
    const closeDate = getRandomDate(365); // 过去一年内的日期
    const name = `Strategic Agreement: ${prod} - Q${Math.floor(Math.random() * 4) + 1}`;

    await connection.execute(
      `INSERT INTO deals (customerId, name, productType, amount, status, closedDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [custId, name, prod, amount, status, closeDate, closeDate]
    );
  }

  await connection.end();
  console.log("✅ Seed completed successfully! Added Opportunities and Deals only.");
}

seed().catch(console.error);