import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, Handshake, Newspaper, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const STAGE_COLORS: Record<string, string> = {
  lead: "#94a3b8",
  qualified: "#60a5fa",
  proposal: "#a78bfa",
  negotiation: "#fbbf24",
  closed_won: "#22c55e",
  closed_lost: "#ef4444",
};

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Won",
  closed_lost: "Lost",
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function StatCard({
  title, value, description, icon: Icon, trend, href
}: {
  title: string; value: string | number; description?: string;
  icon: React.ElementType; trend?: { value: number; positive: boolean }; href?: string;
}) {
  const content = (
    <Card className="stat-card group cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          {trend && (
            <div className={`flex items-center text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function StatCardSkeleton() {
  return (
    <Card className="stat-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentDeals, isLoading: dealsLoading } = trpc.dashboard.recentDeals.useQuery({ limit: 5 });
  const { data: recentNews, isLoading: newsLoading } = trpc.dashboard.recentNews.useQuery({ limit: 5 });
  const { data: opportunityByStage, isLoading: stageLoading } = trpc.dashboard.opportunityByStage.useQuery();
  const { data: dealsByMonth, isLoading: monthLoading } = trpc.dashboard.dealsByMonth.useQuery({ months: 12 });

  const pieData = opportunityByStage?.map(item => ({
    name: item.stage ? (STAGE_LABELS[item.stage] || item.stage) : 'Unknown',
    value: item.count,
    amount: item.totalAmount,
    color: item.stage ? (STAGE_COLORS[item.stage] || "#94a3b8") : "#94a3b8",
  })) || [];

  const lineData = dealsByMonth?.map(item => ({
    month: item.month,
    deals: item.count,
    revenue: item.totalAmount / 100,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/customers">
            <Building2 className="h-4 w-4 mr-2" />
            {t("dashboard.viewCustomers")}
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
        ) : (
          <>
            <StatCard
              title={t("dashboard.totalCustomers")}
              value={stats?.customerCount || 0}
              description={`${stats?.subsidiaryCount || 0} ${t("dashboard.subsidiariesTracked")}`}
              icon={Building2} href="/customers"
            />
            <StatCard
              title={t("dashboard.activeOpportunities")}
              value={stats?.activeOpportunities || 0}
              description={formatCurrency((stats?.opportunityValue || 0) / 100)}
              icon={TrendingUp} href="/opportunities"
            />
            <StatCard
              title={t("dashboard.closedDeals")}
              value={stats?.totalDeals || 0}
              description={formatCurrency((stats?.dealValue || 0) / 100)}
              icon={Handshake} href="/deals"
            />
            <StatCard
              title={t("dashboard.newsAlerts")}
              value={stats?.unreadNews || 0}
              description={t("dashboard.unreadNews")}
              icon={Newspaper} href="/news"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.opportunityPipeline")}</CardTitle>
            <CardDescription>{t("dashboard.opportunityByStage")}</CardDescription>
          </CardHeader>
          <CardContent>
            {stageLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            ) : pieData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [value, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                <p>{t("dashboard.noOpportunityData")}</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/opportunities">{t("dashboard.addOpportunities")}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.revenueTrend")}</CardTitle>
            <CardDescription>{t("dashboard.revenueTrendDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {monthLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : lineData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : value,
                      name === 'revenue' ? 'Revenue' : 'Deals'
                    ]} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    <Line yAxisId="right" type="monotone" dataKey="deals" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                <p>{t("dashboard.noDealData")}</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/deals">{t("dashboard.addDeals")}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t("dashboard.recentDeals")}</CardTitle>
              <CardDescription>{t("dashboard.latestDeals")}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/deals">{t("common.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dealsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1"><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-3 w-24" /></div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentDeals && recentDeals.length > 0 ? (
              <div className="space-y-4">
                {recentDeals.map(deal => (
                  <div key={deal.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Handshake className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{deal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {deal.productType || t("deals.general")} • {deal.closedDate ? new Date(deal.closedDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(deal.amount / 100)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("dashboard.noDealRecords")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t("dashboard.latestNews")}</CardTitle>
              <CardDescription>{t("dashboard.recentNewsDesc")}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/news">{t("common.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {newsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1"><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-3 w-24" /></div>
                  </div>
                ))}
              </div>
            ) : recentNews && recentNews.length > 0 ? (
              <div className="space-y-4">
                {recentNews.map(news => (
                  <div key={news.id} className="flex items-start gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      news.sentiment === 'positive' ? 'bg-green-100 dark:bg-green-900/30' :
                      news.sentiment === 'negative' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <Newspaper className={`h-5 w-5 ${
                        news.sentiment === 'positive' ? 'text-green-600 dark:text-green-400' :
                        news.sentiment === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-2">{news.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {news.sourceName || t("news.webSource")} • {news.publishedDate ? new Date(news.publishedDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    {!news.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("dashboard.noNewsItems")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}