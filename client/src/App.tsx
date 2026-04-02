import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
// 注意：如果你的 DashboardLayout 在 components/layout 文件夹下，请根据实际路径调整，这里保留了你原来的引用
import DashboardLayout from "./components/DashboardLayout";

import OpportunityPipeline from "@/pages/OpportunityPipeline";
import Competitors from "@/pages/Competitors";
// Pages
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import CorporateTree from "./pages/CorporateTree";
import Opportunities from "./pages/Opportunities";
import Deals from "./pages/Deals";
import News from "./pages/News";
import DataImport from "./pages/DataImport";
import AIAnalysis from "./pages/AIAnalysis";
import AuthPage from "./pages/AuthPage";
import GeographicMap from "./pages/GeographicMap";
import MLAnalysis from "@/pages/MLAnalysis";
// ✅ 【新增】引入您的 PushDemo 页面组件
import PushDemo from "@/pages/PushDemo";

function Router() {
  return (
    <Switch>
      {/* 1. 登录与注册页 (放在最前面，且不需要 DashboardLayout) */}
      <Route path="/login" component={AuthPage} />
      <Route path="/auth" component={AuthPage} />

      {/* 2. 其他所有业务页面 (包裹在 Layout 里面，显示侧边栏) */}
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Dashboard} />

            <Route path="/ml-analysis" component={MLAnalysis} />

            {/* ✅ 【新增】Push Notification 路由 */}
            {/* 当访问 /push 路径时，渲染 PushDemo 组件 */}
            <Route path="/push" component={PushDemo} />

            <Route path="/customers" component={Customers} />
            <Route path="/customers/:id" component={CustomerDetail} />
            <Route path="/corporate-tree" component={CorporateTree} />
            <Route path="/opportunities" component={Opportunities} />
            <Route path="/deals" component={Deals} />
            <Route path="/news" component={News} />
            <Route path="/import" component={DataImport} />
            <Route path="/ai-analysis" component={AIAnalysis} />
            <Route path="/geographic" component={GeographicMap} />
            <Route path="/pipeline" component={OpportunityPipeline} />
            <Route path="/competitors" component={Competitors} />

            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;