// 填入你的配置
const API_KEY = "sk-9d86e27985264283b885370bc43b563f"; // ⚠️ 把你的 Key 粘贴在这里
const API_URL = "https://api.deepseek.com/chat/completions"; // 如果用 OpenAI 就删掉这行，或者填 OpenAI 的地址
const MODEL = "deepseek-chat"; // 或者 gpt-4o-mini

async function testAI() {
  console.log("正在尝试连接 AI...");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: "你好，测试一下连接！" }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ 连接成功！AI 回复：", data.choices[0].message.content);
  } catch (error) {
    console.error("❌ 连接失败！原因：", error.message);
  }
}

testAI();