import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { TrendingUp, BarChart3, Loader2, Search, Brain } from "lucide-react";
import { toast } from "sonner";

// ── Color constants ─────────────────────────────────────────────────────
const PRODUCT_COLORS = [
  '#3B82F6','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#EC4899','#14B8A6','#F97316',
];

// ── Types ──────────────────────────────────────────────────────────────
interface PipelineProduct { code: string; name: string; amount: number; }
interface PipelineTrend { month: string; amount: number; count: number; }
interface PipelineData {
  customerId: number;
  customerName: string;
  period: string;
  totalAmount: number;
  currency: string;
  totalCount: number;
  stageDistribution: { stage: string; count: number; percentage: number; color: string }[];
  products: PipelineProduct[];
  trend: PipelineTrend[];
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════
export default function OpportunityPipeline() {
  const { t, language } = useLanguage();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState("2025");
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Customers list
  const { data: customersRaw } = trpc.customer.list.useQuery({ limit: 100 });
  const customers = Array.isArray(customersRaw)
    ? customersRaw
    : (customersRaw as any)?.customers || [];

  // AI pipeline analysis mutation
  const analyzeMutation = trpc.pipeline.analyze.useMutation();

  const handleAnalyze = async () => {
    if (!selectedCustomerId) {
      toast.error(language === "zh-CN" ? "请先选择客户" : "Please select a customer");
      return;
    }
    setIsLoading(true);
    setPipelineData(null);
    try {
      const result = await analyzeMutation.mutateAsync({
        customerId: parseInt(selectedCustomerId),
        period: selectedPeriod,
        language: language === "zh-CN" ? "zh-CN" : language === "zh-TW" ? "zh-TW" : "en",
      });
      setPipelineData(result as PipelineData);
    } catch (err) {
      toast.error(language === "zh-CN" ? "分析失败，请重试" : "Analysis failed, please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const L = (en: string, zhCN: string, zhTW?: string) =>
    language === "en" ? en : language === "zh-CN" ? zhCN : (zhTW || zhCN);

  const structureColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("pipeline.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("pipeline.subtitle")}</p>
        </div>
      </div>

      {/* Customer + Period selector */}
      <Card className="border-blue-100 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
            <Brain className="h-5 w-5" />
            {L("AI Pipeline Analysis", "AI销售漏斗分析", "AI銷售漏斗分析")}
          </CardTitle>
          <CardDescription>
            {L(
              "Select a customer and period to generate AI-powered pipeline insights",
              "选择客户和时间段，生成AI驱动的销售漏斗洞察",
              "選擇客戶和時間段，生成AI驅動的銷售漏斗洞察"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="text-sm font-medium">{L("Customer", "客户", "客戶")}</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder={L("Select customer...", "选择客户...", "選擇客戶...")} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-40">
              <label className="text-sm font-medium">{L("Period", "年份", "年份")}</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={!selectedCustomerId || isLoading}
              className="bg-blue-600 hover:bg-blue-700 min-w-[160px]"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{L("Analyzing...", "分析中...", "分析中...")}</>
              ) : (
                <><Search className="h-4 w-4 mr-2" />{L("Analyze Pipeline", "分析漏斗", "分析漏斗")}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !pipelineData && (
        <Card className="py-16">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="font-medium text-lg">{L("Select a customer to begin", "选择客户开始分析", "選擇客戶開始分析")}</p>
            <p className="text-sm mt-2">{L("AI will generate pipeline data based on the customer's profile and industry", "AI将根据客户档案和行业生成销售漏斗数据", "AI將根據客戶檔案和行業生成銷售漏斗數據")}</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {!isLoading && pipelineData && (
        <>
          {/* AI Summary */}
          {pipelineData.summary && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-800">{pipelineData.summary}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Pipeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  {L("Pipeline Value", "储备金额", "儲備金額")}
                  <Badge variant="outline">{pipelineData.period}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-blue-600">
                    {(pipelineData.totalAmount / 1e8).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {L("B HKD", "亿港币", "億港幣")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {L(`${pipelineData.totalCount} total opportunities`, `共 ${pipelineData.totalCount} 个商机`, `共 ${pipelineData.totalCount} 個商機`)}
                </p>
              </CardContent>
            </Card>

            {/* Stage Distribution Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  {L("Stage Distribution", "阶段分布", "階段分佈")}
                  <Badge variant="outline">{pipelineData.period}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width={200} height={160}>
                    <PieChart>
                      <Pie
                        data={pipelineData.stageDistribution}
                        cx="50%" cy="50%"
                        innerRadius={35} outerRadius={55}
                        paddingAngle={2}
                        dataKey="percentage"
                      >
                        {pipelineData.stageDistribution.map((entry, index) => (
                          <Cell key={index} fill={structureColors[index % structureColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any, p: any) => [`${Number(v).toFixed(1)}%`, p.payload.stage]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 ml-2">
                    {pipelineData.stageDistribution.map((item, index) => (
                      <div key={index} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: structureColors[index % structureColors.length] }} />
                        <span className="truncate max-w-[80px]" title={item.stage}>{item.stage}</span>
                        <span className="text-muted-foreground ml-auto">{item.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  {L("Product Mix", "产品分布", "產品分佈")}
                  <Badge variant="outline">{pipelineData.period}</Badge>
                </CardTitle>
                <CardDescription className="text-xs">{L("Unit: 10K HKD", "单位: 万港币", "單位: 萬港幣")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width={160} height={140}>
                    <PieChart>
                      <Pie data={pipelineData.products} cx="50%" cy="50%" outerRadius={55} dataKey="amount" label={false}>
                        {pipelineData.products.map((_, index) => (
                          <Cell key={index} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any, p: any) => [`${Number(v).toLocaleString()}`, p.payload.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 ml-2 max-h-[140px] overflow-y-auto">
                    {pipelineData.products.map((item, index) => (
                      <div key={index} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRODUCT_COLORS[index % PRODUCT_COLORS.length] }} />
                        <span className="w-14 truncate" title={item.code}>{item.code}</span>
                        <span className="text-muted-foreground">{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {L(`Monthly Trend (${pipelineData.period})`, `月度趋势 (${pipelineData.period})`, `月度趨勢 (${pipelineData.period})`)}
              </CardTitle>
              <CardDescription>
                {L("Pipeline value and opportunity count by month", "每月储备金额和商机数量", "每月儲備金額和商機數量")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pipelineData.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3B82F6"
                    label={{ value: L("Value (M)", "金额(百万)", "金額(百萬)"), angle: -90, position: "insideLeft" }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10B981"
                    label={{ value: L("Count", "数量", "數量"), angle: 90, position: "insideRight" }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2}
                    name={L("Pipeline Value", "储备金额", "儲備金額")} />
                  <Line yAxisId="right" type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2}
                    name={L("Opportunity Count", "商机数量", "商機數量")} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {L(`Product Breakdown (${pipelineData.period})`, `产品细分 (${pipelineData.period})`, `產品細分 (${pipelineData.period})`)}
              </CardTitle>
              <CardDescription>{L("Pipeline value by product type", "各产品类型储备金额", "各產品類型儲備金額")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pipelineData.products} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: L("10K HKD", "万港币", "萬港幣"), position: "insideBottom", offset: -5 }} />
                  <YAxis dataKey="code" type="category" width={70} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} ${L("10K HKD", "万港币", "萬港幣")}`, L("Amount", "金额", "金額")]} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {pipelineData.products.map((_, index) => (
                      <Cell key={index} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}