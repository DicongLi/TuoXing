import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
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

// ── Auth helpers ──────────────────────────────────────────────────────────────
function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem("token"));
}

function isAuthPath(path: string): boolean {
  return path === "/login" || path === "/auth" ||
    path.startsWith("/login/") || path.startsWith("/auth/");
}

// ── Auth guard: must be INSIDE Switch to have wouter context ──────────────────
function AuthGuard() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (!isAuthenticated() && !isAuthPath(location)) {
      setLocation("/login");
    }
  }, [location, setLocation]);
  return null;
}

// ── Layout wrapper with instant auth check ───────────────────────────────────
function P({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Redirect to="/login" />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

// ── Router ───────────────────────────────────────────────────────────────────
function Router() {
  return (
    <>
      <AuthGuard />
      <Switch>
        {/* Auth pages — no layout */}
        <Route path="/login" component={AuthPage} />
        <Route path="/auth" component={AuthPage} />

        {/* Dashboard: both "/" and "/dashboard" work.
            AuthPage does setLocation("/dashboard") so we must register it. */}
        <Route path="/">
          <P><Dashboard /></P>
        </Route>
        <Route path="/dashboard">
          <P><Dashboard /></P>
        </Route>

        {/* CustomerDetail uses useParams() internally — just render it, no props */}
        <Route path="/customers/:id">
          <P><CustomerDetail /></P>
        </Route>
        <Route path="/customers">
          <P><Customers /></P>
        </Route>

        {/* All other protected pages */}
        <Route path="/ml-analysis">
          <P><MLAnalysis /></P>
        </Route>
        <Route path="/push">
          <P><PushDemo /></P>
        </Route>
        <Route path="/corporate-tree">
          <P><CorporateTree /></P>
        </Route>
        <Route path="/opportunities">
          <P><Opportunities /></P>
        </Route>
        <Route path="/deals">
          <P><Deals /></P>
        </Route>
        <Route path="/news">
          <P><News /></P>
        </Route>
        <Route path="/import">
          <P><DataImport /></P>
        </Route>
        <Route path="/ai-analysis">
          <P><AIAnalysis /></P>
        </Route>
        <Route path="/geographic">
          <P><GeographicMap /></P>
        </Route>
        <Route path="/pipeline">
          <P><OpportunityPipeline /></P>
        </Route>
        <Route path="/competitors">
          <P><Competitors /></P>
        </Route>

        {/* Fallback */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

// App: pure provider wrapper — zero hooks here
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