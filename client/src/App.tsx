import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import DashboardLayout from "./components/DashboardLayout";

import OpportunityPipeline from "@/pages/OpportunityPipeline";
import Competitors from "@/pages/Competitors";
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
import PushDemo from "@/pages/PushDemo";

// Auth guard: redirect to /login when not authenticated.
// MUST live inside Router so useLocation() has a wouter context.
function AuthGuard() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const isAuthPage =
      location === "/login" ||
      location === "/auth" ||
      location.startsWith("/login") ||
      location.startsWith("/auth");

    // Check both cookie-based session (handled by server) and token fallback
    const hasToken = Boolean(localStorage.getItem("token"));

    // Only redirect if we're not already on an auth page.
    // For cookie-based auth the server will reject requests anyway;
    // we check localStorage token as a quick client-side hint.
    if (!hasToken && !isAuthPage) {
      setLocation("/login");
    }
  }, [location, setLocation]);

  return null;
}

function Router() {
  return (
    <>
      <AuthGuard />
      <Switch>
        {/* Auth pages – no layout wrapper */}
        <Route path="/login" component={AuthPage} />
        <Route path="/auth" component={AuthPage} />

        {/* All other pages – wrapped in DashboardLayout */}
        <Route>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/ml-analysis" component={MLAnalysis} />
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
    </>
  );
}

// App no longer calls any hooks directly – it is a pure provider wrapper.
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