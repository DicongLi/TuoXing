/**
 * Standalone LLM Integration
 * * This module provides a unified interface for LLM calls that works with:
 * - OpenAI API (default)
 * - Azure OpenAI
 * - Any OpenAI-compatible API (e.g., Ollama, LocalAI, etc.)
 */

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, any>;
    };
  };
}

export interface LLMResponse {
  choices: Array<{
    message: {
      content: string | null;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Get configuration from environment
function getConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
    apiUrl: process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions",
    model: process.env.LLM_MODEL || "gpt-4o-mini",
  };
}

/**
 * Invoke LLM with messages
 * Works with OpenAI API and compatible endpoints
 */
export async function invokeLLM(options: LLMOptions): Promise<LLMResponse> {
  const config = getConfig();

  // ============================================================
  // 🔍【调试日志】这里是我新增的代码，帮你监控 AI 调用情况
  // ============================================================
  console.log("--------------------------------------------------");
  console.log("🤖 [LLM] 正在发起 AI 请求...");
  console.log("   👉 目标 URL:", config.apiUrl);
  console.log("   👉 使用模型:", config.model);
  console.log("   👉 API Key:", config.apiKey ? `✅ 已加载 (尾号: ${config.apiKey.slice(-4)})` : "❌ 未找到 Key!");
  console.log("--------------------------------------------------");

  if (!config.apiKey) {
    console.warn("[LLM] ❌ 严重错误: 没有找到 API Key，请检查 .env 文件");
    // Return a mock response for development
    return {
      choices: [{
        message: {
          content: JSON.stringify({
            summary: "系统未检测到 API Key，这是模拟的回复。",
            recommendations: ["请在 .env 文件中配置 LLM_API_KEY"],
          }),
          role: "assistant",
        },
        finish_reason: "stop",
      }],
    };
  }

  const requestBody: Record<string, any> = {
    model: config.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
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
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLM] ❌ 请求被拒绝! 状态码: ${response.status}`);
      console.error(`[LLM] 错误详情: ${errorText}`);
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ [LLM] 请求成功! AI 已回复。");
    return data as LLMResponse;

  } catch (error) {
    console.error("[LLM] ❌ 网络或请求发生异常:", error);
    throw error;
  }
}

/**
 * Simple text completion helper
 */
export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: Message[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await invokeLLM({ messages });
  return response.choices[0]?.message?.content || "";
}

/**
 * JSON generation helper with schema validation
 */
export async function generateJSON<T>(
  prompt: string,
  schema: Record<string, any>,
  systemPrompt?: string
): Promise<T> {
  const messages: Message[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await invokeLLM({
    messages,
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "response",
        strict: true,
        schema,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in LLM response");
  }

  return JSON.parse(content) as T;
}