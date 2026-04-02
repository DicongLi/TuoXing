import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {

  // 简单判断是否在生产环境
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,     // 保持 true，防止 JavaScript 偷取 Cookie
    path: "/",          // 整个网站都有效

    // 【关键修改 1】本地开发必须用 "lax"，不能用 "none"
    sameSite: "lax",

    // 【关键修改 2】本地开发强制 false (HTTP)，线上才用 true (HTTPS)
    secure: isProduction,
  };
}