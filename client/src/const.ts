export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 【修改版】不再去连接外部 OAuth 中心，而是直接跳转到本地登录页
export const getLoginUrl = () => {
  // 如果你的网页有 /login 路由，直接返回这个路径即可
  return "/login";
};