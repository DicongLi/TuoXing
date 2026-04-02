import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, TrendingUp, BarChart3, Loader2, Seed } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { toast } from "sonner";

function formatCurrency(value: number | null): string {
  if (!value) return "N/A";
  const v = value / 100;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Deals() {
  const { t, language } = useLanguage();
  const [isSeedLoading, setIsSeedLoading] = useState(false);

  const { data: deals, isLoading, refetch } = trpc.deal.list.useQuery({ limit: 50 });
  const { data: stats } = trpc.deal.stats.useQuery();
  const { data: byMonth } = trpc.deal.byMonth.useQuery({ months: 12 });

  // Seed mutation
  const seedMutation = trpc.deal.seedDemoData.useMutation({
    onSuccess: () => {
      toast.success(language === "zh-CN" ? "演示数据已生成！" : "Demo data generated!");
      refetch();
    },
    onError: () => {
      toast.error(language === "zh-CN" ? "生成失败，请重试" : "Generation failed");
    },
  });

  const handleSeedData = async () => {
    setIsSeedLoading(true);
    try {
      await seedMutation.mutateAsync();
    } finally {
      setIsSeedLoading(false);
    }
  };

  const L = (en: string, zhCN: string) => language === "en" ? en : language === "zh-CN" ? zhCN : zhCN;

  // Build product distribution from deals
  const productData = (deals || []).reduce((acc: Record<string, number>, deal) => {
    const key = deal.productType || L("General", "通用");
    acc[key] = (acc[key] || 0) + (deal.amount || 0) / 100;
    return acc;
  }, {});
  const productChartData = Object.entries(productData)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Monthly trend data from API
  const trendData = (byMonth || []).map((m: any) => ({
    month: m.month,
    amount: Math.round(m.totalAmount / 100 / 1000),
    count: m.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("deals.title")}</h1>
          <p className="text-muted-foreground">{t("deals.subtitle")}</p>
        </div>
        {(!deals || deals.length === 0) && (
          <Button
            variant="outline"
            onClick={handleSeedData}
            disabled={isSeedLoading}
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            {isSeedLoading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{L("Generating...", "生成中...")}</>
              : <><BarChart3 className="h-4 w-4 mr-2" />{L("Generate Demo Data", "生成演示数据")}</>
            }
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("deals.total")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("deals.totalValue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalValue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("deals.activeContracts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats?.activeValue || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts — only show when there is data */}
      {deals && deals.length > 0 && (
        <>
          {/* Monthly Trend */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {L("Monthly Deal Trend (12 months)", "近12个月成交趋势")}
                </CardTitle>
                <CardDescription>{L("Deal value (K) and count by month", "每月成交金额（千）和数量")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" orientation="left" stroke="#3B82F6"
                      label={{ value: L("Value (K)", "金额(千)", "金額(千)"), angle: -90, position: "insideLeft" }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10B981"
                      label={{ value: L("Count", "数量"), angle: 90, position: "insideRight" }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2}
                      name={L("Value (K$)", "成交额(千)")} />
                    <Line yAxisId="right" type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2}
                      name={L("Count", "数量")} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Product distribution */}
          {productChartData.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    {L("Value by Product Type", "各产品类型成交额")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={productChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, L("Value", "金额")]} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {productChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    {L("Product Mix", "产品组合占比")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={productChartData}
                        cx="50%" cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {productChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, L("Value", "金额")]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Deal List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("deals.history")}</CardTitle>
          <CardDescription>{t("deals.historyDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : deals && deals.length > 0 ? (
            <div className="space-y-3">
              {deals.map(deal => (
                <div key={deal.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Handshake className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{deal.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {deal.productType || t("deals.general")}
                        {deal.closedDate ? ` · ${new Date(deal.closedDate).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={STATUS_COLORS[deal.status || "active"] || "bg-gray-100 text-gray-800"}>
                      {deal.status || t("customers.active")}
                    </Badge>
                    <span className="font-semibold text-green-600">{formatCurrency(deal.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("deals.noDeals")}</p>
              <p className="text-sm mt-1">{t("deals.noDealsDesc")}</p>
              <Button
                variant="outline"
                className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={handleSeedData}
                disabled={isSeedLoading}
              >
                {isSeedLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{L("Generating...", "生成中...")}</>
                  : <><BarChart3 className="h-4 w-4 mr-2" />{L("Generate Demo Data", "生成演示数据")}</>
                }
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}