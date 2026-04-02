/**
 * seed.ts — Demo Data Seeder
 * ============================================================
 * 用途：为开发/演示环境注入虚拟数据
 *
 * 使用方式（在项目根目录执行）：
 *   npx tsx server/seed.ts
 *   # 或
 *   ts-node server/seed.ts
 *
 * 环境要求：
 *   DATABASE_URL 必须在 .env 中已配置
 * ============================================================
 */

import "dotenv/config";
import * as db from "./db";

// ─── Configuration ─────────────────────────────────────────
const DEMO_USER_ID = 1; // 替换为实际的管理员用户 ID
const DEALS_PER_CUSTOMER = 6; // 每个客户生成多少笔成交
const MONTHS_BACK = 18; // 数据跨度（月）

// ─── Product catalogue ─────────────────────────────────────
const PRODUCT_TYPES = [
  "IDC",
  "IDC2.0",
  "Cloud Services",
  "IEPL",
  "ICTS",
  "IPT",
  "SMS",
  "Connectivity",
  "SD-WAN",
  "Security Services",
  "Managed Network",
  "Voice over IP",
];

const DEAL_STATUSES = ["active", "active", "active", "completed", "completed", "pending"];

const OPPORTUNITY_STAGES = [
  "lead",
  "lead",
  "qualified",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

// ─── Subsidiary templates per industry ─────────────────────
const SUBSIDIARY_TEMPLATES: Record<string, Array<{ name: string; entityType: string; country: string; city: string; lat: number; lng: number }>> = {
  default: [
    { name: "HQ",              entityType: "headquarters", country: "China",       city: "Beijing",    lat: 39.9042,  lng: 116.4074 },
    { name: "Asia Pacific",    entityType: "subsidiary",   country: "Singapore",   city: "Singapore",  lat: 1.3521,   lng: 103.8198 },
    { name: "Middle East",     entityType: "subsidiary",   country: "UAE",         city: "Dubai",      lat: 25.2048,  lng: 55.2708  },
    { name: "Europe",          entityType: "subsidiary",   country: "Germany",     city: "Frankfurt",  lat: 50.1109,  lng: 8.6821   },
    { name: "Africa",          entityType: "branch",       country: "Kenya",       city: "Nairobi",    lat: -1.2921,  lng: 36.8219  },
    { name: "Americas",        entityType: "branch",       country: "USA",         city: "New York",   lat: 40.7128,  lng: -74.0060 },
  ],
  Technology: [
    { name: "HQ",              entityType: "headquarters", country: "USA",         city: "San Francisco", lat: 37.7749, lng: -122.4194 },
    { name: "R&D Center",      entityType: "subsidiary",   country: "China",       city: "Shanghai",   lat: 31.2304,  lng: 121.4737  },
    { name: "EMEA",            entityType: "subsidiary",   country: "UK",          city: "London",     lat: 51.5074,  lng: -0.1278   },
    { name: "APAC",            entityType: "subsidiary",   country: "Japan",       city: "Tokyo",      lat: 35.6762,  lng: 139.6503  },
    { name: "India Dev",       entityType: "branch",       country: "India",       city: "Bangalore",  lat: 12.9716,  lng: 77.5946   },
  ],
  Finance: [
    { name: "HQ",              entityType: "headquarters", country: "Hong Kong",   city: "Hong Kong",  lat: 22.3193,  lng: 114.1694  },
    { name: "London Office",   entityType: "subsidiary",   country: "UK",          city: "London",     lat: 51.5074,  lng: -0.1278   },
    { name: "New York Office", entityType: "subsidiary",   country: "USA",         city: "New York",   lat: 40.7128,  lng: -74.0060  },
    { name: "Singapore",       entityType: "subsidiary",   country: "Singapore",   city: "Singapore",  lat: 1.3521,   lng: 103.8198  },
    { name: "Dubai Branch",    entityType: "branch",       country: "UAE",         city: "Dubai",      lat: 25.2048,  lng: 55.2708   },
  ],
};

// ─── Helpers ────────────────────────────────────────────────
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dateMonthsAgo(monthsAgo: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(randomInt(1, 28));
  return d;
}

function getQuarter(d: Date): string {
  return `Q${Math.floor(d.getMonth() / 3) + 1}`;
}

// ─── Seeders ────────────────────────────────────────────────

async function seedDeals(customers: any[]): Promise<number> {
  let total = 0;
  for (const customer of customers) {
    for (let i = 0; i < DEALS_PER_CUSTOMER; i++) {
      const monthsAgo = randomInt(0, MONTHS_BACK);
      const closedDate = dateMonthsAgo(monthsAgo);
      const productType = randomFrom(PRODUCT_TYPES);
      const status = randomFrom(DEAL_STATUSES);
      const baseAmount = randomInt(5000, 80000); // in dollars

      await db.createDeal({
        customerId: customer.id,
        name: `${customer.name} — ${productType} ${closedDate.getFullYear()}-${getQuarter(closedDate)}`,
        amount: baseAmount * 100, // stored in cents
        productType,
        status,
        closedDate,
        closedBy: DEMO_USER_ID,
        closedByName: "Demo Admin",
        currency: "USD",
        description: `Seeded demo deal: ${productType} service contract`,
      });
      total++;
    }
    console.log(`  ✓ Deals seeded for: ${customer.name}`);
  }
  return total;
}

async function seedOpportunities(customers: any[]): Promise<number> {
  let total = 0;
  for (const customer of customers) {
    const count = randomInt(3, 8);
    for (let i = 0; i < count; i++) {
      const productType = randomFrom(PRODUCT_TYPES);
      const stage = randomFrom(OPPORTUNITY_STAGES);
      const baseAmount = randomInt(10000, 200000);
      const probability =
        stage === "lead" ? randomInt(10, 25)
        : stage === "qualified" ? randomInt(25, 45)
        : stage === "proposal" ? randomInt(40, 65)
        : stage === "negotiation" ? randomInt(60, 85)
        : stage === "closed_won" ? 100
        : 0;

      await db.createOpportunity({
        customerId: customer.id,
        name: `${customer.name} — ${productType} Opportunity #${i + 1}`,
        description: `Demo opportunity for ${productType} services`,
        stage,
        status: stage === "closed_won" || stage === "closed_lost" ? "inactive" : "active",
        probability,
        amount: baseAmount * 100,
        currency: "USD",
        productType,
        ownerId: DEMO_USER_ID,
        ownerName: "Demo Admin",
        expectedCloseDate: new Date(Date.now() + randomInt(30, 180) * 86400000),
      });
      total++;
    }
    console.log(`  ✓ Opportunities seeded for: ${customer.name}`);
  }
  return total;
}

async function seedSubsidiaries(customers: any[]): Promise<number> {
  let total = 0;
  for (const customer of customers) {
    // Skip if already has subsidiaries
    const existing = await db.getSubsidiariesByCustomer(customer.id);
    if (existing.length > 0) {
      console.log(`  ⏭  Subsidiaries already exist for: ${customer.name} (${existing.length})`);
      continue;
    }

    // Pick template based on industry
    const industry = customer.industry || "";
    const template =
      SUBSIDIARY_TEMPLATES[industry] ||
      SUBSIDIARY_TEMPLATES["default"];

    for (const sub of template) {
      await db.createSubsidiary({
        customerId: customer.id,
        name: `${customer.name} — ${sub.name}`,
        entityType: sub.entityType,
        country: sub.country,
        city: sub.city,
        latitude: String(sub.lat),
        longitude: String(sub.lng),
        operatingStatus: "active",
        employeeCount: randomInt(50, 2000),
        industry: customer.industry || null,
      });
      total++;
    }
    console.log(`  ✓ Subsidiaries seeded for: ${customer.name} (${template.length} locations)`);
  }
  return total;
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log("\n🌱 Starting seed...\n");

  const customers = await db.getCustomers({ limit: 50 });

  if (customers.length === 0) {
    console.error("❌  No customers found in database. Please create at least one customer first.");
    process.exit(1);
  }

  console.log(`Found ${customers.length} customers.\n`);

  // ── Deals ──
  console.log("📦 Seeding deals...");
  const dealsCreated = await seedDeals(customers);
  console.log(`   → ${dealsCreated} deals created\n`);

  // ── Opportunities ──
  console.log("🎯 Seeding opportunities...");
  const oppsCreated = await seedOpportunities(customers);
  console.log(`   → ${oppsCreated} opportunities created\n`);

  // ── Subsidiaries / Geographic ──
  console.log("🌍 Seeding subsidiaries (geographic data)...");
  const subsCreated = await seedSubsidiaries(customers);
  console.log(`   → ${subsCreated} subsidiary locations created\n`);

  console.log("✅  Seed complete!\n");
  console.log("Summary:");
  console.log(`  Deals:          ${dealsCreated}`);
  console.log(`  Opportunities:  ${oppsCreated}`);
  console.log(`  Subsidiaries:   ${subsCreated}`);
  console.log();
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
