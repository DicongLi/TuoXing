import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, Brain, Loader2, Search, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STAGE_LABELS: Record<string, Record<string, string>> = {
  en:      { lead: "Lead", qualified: "Qualified", proposal: "Proposal", negotiation: "Negotiation", closed_won: "Won", closed_lost: "Lost" },
  "zh-CN": { lead: "线索", qualified: "已确认",   proposal: "提案中",    negotiation: "谈判中",      closed_won: "已成交", closed_lost: "已丢失" },
  "zh-TW": { lead: "線索", qualified: "已確認",   proposal: "提案中",    negotiation: "談判中",      closed_won: "已成交", closed_lost: "已丟失" },
};

const STAGE_COLORS: Record<string, string> = {
  lead:        "bg-gray-100 text-gray-700",
  qualified:   "bg-blue-100 text-blue-700",
  proposal:    "bg-purple-100 text-purple-700",
  negotiation: "bg-yellow-100 text-yellow-700",
  closed_won:  "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
};

function formatCurrency(value: number | null): string {
  if (!value) return "N/A";
  const v = value / 100;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export default function Opportunities() {
  const { t, language } = useLanguage();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [aiOpportunities, setAiOpportunities] = useState<any[] | null>(null);
  const [aiStats, setAiStats] = useState<any | null>(null);

  const { data: customersRaw } = trpc.customer.list.useQuery({ limit: 100 });
  const customers = Array.isArray(customersRaw) ? customersRaw : (customersRaw as any)?.customers || [];

  const { data: dbOpportunities, isLoading: dbLoading } = trpc.opportunity.list.useQuery(
    { limit: 50 }, { enabled: !selectedCustomerId }
  );
  const { data: dbStats } = trpc.opportunity.stats.useQuery();

  const utils = trpc.useUtils();
  const aiMutation = trpc.opportunity.aiSearch.useMutation();

  const handleSearch = async () => {
    if (!selectedCustomerId) return;
    setIsSearching(true);
    setAiOpportunities(null);
    try {
      const result = await aiMutation.mutateAsync({
        customerId: parseInt(selectedCustomerId),
        language: language as "en" | "zh-CN" | "zh-TW",
      });
      setAiOpportunities((result as any).opportunities || []);
      setAiStats((result as any).stats || null);
      // 刷新 Dashboard 数据
      utils.dashboard.stats.invalidate();
      utils.dashboard.opportunityByStage.invalidate();
    } catch {
      toast.error(language === "en" ? "AI search failed" : "AI搜索失败，请重试");
    } finally {
      setIsSearching(false);
    }
  };

  const showAI = !!selectedCustomerId && aiOpportunities !== null;
  const opportunities = showAI ? aiOpportunities! : (dbOpportunities || []);
  const stats = showAI ? aiStats : dbStats;
  const isLoading = showAI ? false : dbLoading;
  const selectedCustomerObj = customers.find((c: any) => c.id === parseInt(selectedCustomerId));

  const stageLabel = (stage: string) =>
    STAGE_LABELS[language]?.[stage] || STAGE_LABELS["en"][stage] || stage;

  const L = (en: string, zhCN: string, zhTW = zhCN) =>
    language === "en" ? en : language === "zh-CN" ? zhCN : zhTW;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("opportunities.title")}</h1>
          <p className="text-muted-foreground">{t("opportunities.subtitle")}</p>
        </div>
      </div>

      {/* AI search panel */}
      <Card className="border-purple-100 bg-purple-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
            <Brain className="h-5 w-5" />
            {L("AI Opportunity Discovery", "AI商机发现", "AI商機發現")}
          </CardTitle>
          <CardDescription>
            {L("Select a customer for AI to identify sales opportunities",
               "选择客户，由AI识别并分析销售商机",
               "選擇客戶，由AI識別並分析銷售商機")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="text-sm font-medium">{L("Target Customer","目标客户","目標客戶")}</label>
              <Select value={selectedCustomerId} onValueChange={(v) => {
                setSelectedCustomerId(v);
                setAiOpportunities(null);
                setAiStats(null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={L("Select customer...","选择客户...","選擇客戶...")} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={!selectedCustomerId || isSearching}
              className="bg-purple-600 hover:bg-purple-700 min-w-[160px]">
              {isSearching
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{L("Searching...","搜索中...","搜尋中...")}</>
                : <><Search className="h-4 w-4 mr-2"/>{L("Find Opportunities","发现商机","發現商機")}</>}
            </Button>
          </div>

          {showAI && selectedCustomerObj && (
            <div className="flex items-center justify-between mt-3 bg-purple-100 px-3 py-1.5 rounded-md">
              <p className="text-xs text-purple-700">
                {L(`${aiOpportunities!.length} results for "${selectedCustomerObj.name}"`,
                   `为"${selectedCustomerObj.name}"找到 ${aiOpportunities!.length} 个商机`,
                   `為「${selectedCustomerObj.name}」找到 ${aiOpportunities!.length} 個商機`)}
              </p>
              <button onClick={handleSearch}
                className="text-xs text-purple-700 underline flex items-center gap-1 hover:text-purple-900">
                <RefreshCw className="h-3 w-3"/>
                {L("Re-generate","重新生成","重新生成")}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: t("opportunities.total"),        value: stats?.total || 0 },
          { label: t("opportunities.active"),       value: stats?.active || 0 },
          { label: t("opportunities.pipelineValue"),value: formatCurrency(stats?.totalValue || 0) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {showAI ? L("AI-Discovered Opportunities","AI发现的商机","AI發現的商機") : t("opportunities.pipeline")}
          </CardTitle>
          <CardDescription>
            {showAI
              ? L("Generated by AI based on customer profile","根据客户档案由AI生成","根據客戶檔案由AI生成")
              : t("opportunities.pipelineDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(isSearching || isLoading) ? (
            <div className="space-y-4">{[1,2,3].map(i=><Skeleton key={i} className="h-20 w-full"/>)}</div>
          ) : opportunities.length > 0 ? (
            <div className="space-y-3">
              {opportunities.map((opp: any, idx: number) => (
                <div key={opp.id ?? idx}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">

                  {/* Icon — fixed, never shrinks */}
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>

                  {/* Text block — grows, overflows wrap (not clip) */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-snug break-words whitespace-normal">
                      {opp.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {[opp.productType || t("opportunities.general"),
                        opp.probability != null ? `${opp.probability}%` : null]
                        .filter(Boolean).join(" · ")}
                    </p>
                    {opp.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                        {opp.description}
                      </p>
                    )}
                  </div>

                  {/* Stage + amount — fixed on the right */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge className={`${STAGE_COLORS[opp.stage] || "bg-gray-100 text-gray-700"} text-xs whitespace-nowrap`}>
                      {stageLabel(opp.stage || "lead")}
                    </Badge>
                    <span className="font-semibold text-sm whitespace-nowrap">
                      {formatCurrency(opp.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50"/>
              <p>{selectedCustomerId
                ? L("No opportunities found","未找到该客户的商机","未找到該客戶的商機")
                : t("opportunities.noData")}</p>
              <p className="text-sm mt-1">{t("opportunities.noDataDesc")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}