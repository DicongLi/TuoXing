import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function checkCustomers() {
  console.log("🔍 正在连接数据库...");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // 查询所有客户的 ID 和 名字
    const [rows] = await connection.execute('SELECT id, name FROM customers LIMIT 20');

    console.log("------------------------------------------------");
    console.log(`📊 数据库里当前有 ${rows.length} 个客户 (显示前20个):`);
    console.log("------------------------------------------------");

    if (rows.length === 0) {
      console.log("❌ 表是空的！怪不得显示 Not Found。请去 Import 页面重新上传 Excel。");
    } else {
      rows.forEach(c => {
        console.log(`✅ ID: ${c.id}  |  名字: ${c.name}`);
      });
      console.log("------------------------------------------------");
      console.log("👉 请检查您浏览器地址栏里的 ID，是否在这个列表里？");
    }

  } catch (err) {
    console.error("❌ 查询失败:", err);
  } finally {
    await connection.end();
  }
}

checkCustomers();