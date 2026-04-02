import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Building2, Globe, TrendingUp, TrendingDown, Search, ExternalLink,
  DollarSign, MapPin, Newspaper, Swords, Handshake, Target,
  AlertTriangle, Lightbulb, Brain, ArrowRight, Zap, Shield, Loader2, RefreshCw,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CompetitorProject {
  id: string; name: string; status: string; type: string;
  investment: number; currency: string; startDate: string; endDate: string;
  regions: string[]; description: string; partners: string[]; ourOpportunity: string;
}
interface CompetitorRelationship {
  overallRelation: string; competitionScore: number; cooperationScore: number;
  threatLevel: string; conflictAreas: string[]; cooperationAreas: string[];
  opportunities: string[]; aiInsights: string[];
}
interface Competitor {
  id: number; name: string; nameCn: string; shortName: string;
  country: string; headquarters: string; website: string; stockSymbol?: string;
  description: string; revenue: number; revenueCurrency: string; revenueYear: string;
  employees: number; marketPosition: string; brandColor: string;
  strengths: string[]; weaknesses: string[];
  projects: CompetitorProject[]; recentNews: { title: string; date: string; type: string; impact: string }[];
  relationshipAnalysis: CompetitorRelationship;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const relationshipConfig: Record<string, { color: string; labelEn: string; labelZh: string; labelTw: string; icon: any }> = {
  direct_competition: { color: "#EF4444", labelEn: "Direct Competition", labelZh: "直接竞争", labelTw: "直接競爭", icon: Swords },
  cooperation:        { color: "#22C55E", labelEn: "Cooperation",        labelZh: "合作机会",  labelTw: "合作機會",  icon: Handshake },
  potential_partner:  { color: "#3B82F6", labelEn: "Potential Partner",  labelZh: "潜在合作",  labelTw: "潛在合作",  icon: Handshake },
  watch:              { color: "#F59E0B", labelEn: "Monitor",            labelZh: "持续关注",  labelTw: "持續關注",  icon: Target },
};
const threatColors: Record<string, string> = { high: "#EF4444", medium: "#F59E0B", low: "#22C55E" };

const fmtRevenue = (r: number, c: string) => {
  if (!r) return "N/A";
  if (c === "CNY" || c === "JPY") return r >= 1e12 ? `${(r/1e12).toFixed(1)}T ${c}` : `${(r/1e9).toFixed(0)}B ${c}`;
  return `${(r/1e9).toFixed(1)}B ${c}`;
};
const fmtInvest = (a: number, c: string) =>
  a >= 1e9 ? `${(a/1e9).toFixed(1)}B ${c}` : `${(a/1e6).toFixed(0)}M ${c}`;

const statusBadge: Record<string, { cls: string; en: string; zh: string }> = {
  operational: { cls: "bg-green-100 text-green-800", en: "Operational", zh: "运营中" },
  in_progress:  { cls: "bg-blue-100 text-blue-800",  en: "In Progress", zh: "进行中" },
  planning:     { cls: "bg-yellow-100 text-yellow-800", en: "Planning", zh: "规划中" },
};

function OppLabel({ opp, lang }: { opp: string; lang: string }) {
  const cfg = relationshipConfig[opp] || relationshipConfig.watch;
  const label = lang === "en" ? cfg.labelEn : lang === "zh-TW" ? cfg.labelTw : cfg.labelZh;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: `${cfg.color}15` }}>
      <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
      <span className="text-xs font-medium" style={{ color: cfg.color }}>{label}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3].map(i=>(
        <Card key={i} className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="w-10 h-10 rounded-lg"/>
            <div className="flex-1 space-y-1"><Skeleton className="h-4 w-32"/><Skeleton className="h-3 w-20"/></div>
          </div>
          <Skeleton className="h-2 w-full mb-2"/><Skeleton className="h-2 w-full"/>
        </Card>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Competitors() {
  const { language } = useLanguage();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [detailTab, setDetailTab] = useState("overview");

  const { data: customersRaw } = trpc.customer.list.useQuery({ limit: 100 });
  const customers = Array.isArray(customersRaw) ? customersRaw : (customersRaw as any)?.customers || [];

  const searchMutation = trpc.competitor.search.useMutation({
    onSuccess: () => setSelectedCompetitor(null),
  });

  const handleSearch = () => {
    if (!selectedCustomerId) return;
    setSelectedCompetitor(null);
    searchMutation.mutate({
      customerId: parseInt(selectedCustomerId),
      language: language as "en" | "zh-CN" | "zh-TW",
    });
  };

  // Re-search when language changes and we already have results
  // (user clicks the "Re-generate" button)
  const handleRelanguage = () => {
    if (selectedCustomerId) handleSearch();
  };

  const competitors: Competitor[] = searchMutation.data?.competitors || [];
  const selectedCustomerObj = customers.find((c: any) => c.id === parseInt(selectedCustomerId));

  // i18n helper
  const L = (en: string, zhCN: string, zhTW = zhCN) =>
    language === "en" ? en : language === "zh-CN" ? zhCN : zhTW;

  const getRadarData = (comp: Competitor) => {
    const rel = comp.relationshipAnalysis;
    return [
      { dimension: L("Competition","竞争","競爭"),    value: rel.competitionScore },
      { dimension: L("Cooperation","合作","合作"),    value: rel.cooperationScore },
      { dimension: L("Overlap","市场重叠","市場重疊"), value: rel.competitionScore * 0.8 },
      { dimension: L("Synergy","技术协同","技術協同"), value: Math.min(rel.cooperationScore * 1.1, 100) },
      { dimension: L("Fit","战略契合","戰略契合"),    value: (100 - rel.competitionScore + rel.cooperationScore) / 2 },
    ];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {L("Competitor Dynamics","竞争对手动态","競爭對手動態")}
        </h1>
        <p className="text-gray-500 mt-1">
          {L("Select a customer to discover AI-powered competitor insights",
             "选择客户，通过AI检索其竞争对手格局",
             "選擇客戶，透過AI檢索其競爭對手格局")}
        </p>
      </div>

      {/* Customer selector */}
      <Card className="border-blue-100 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
            <Search className="h-5 w-5"/>
            {L("Search Competitors by Customer","按客户搜索竞争对手","按客戶搜尋競爭對手")}
          </CardTitle>
          <CardDescription>
            {L("AI will analyze the customer's industry and identify key competitors",
               "AI将分析所选客户的行业，识别主要竞争对手",
               "AI將分析所選客戶的行業，識別主要競爭對手")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="text-sm font-medium">{L("Target Customer","目标客户","目標客戶")}</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder={L("Select a customer...","选择客户...","選擇客戶...")}/>
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={!selectedCustomerId || searchMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 min-w-[160px]">
              {searchMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{L("Analyzing...","分析中...","分析中...")}</>
                : <><Search className="h-4 w-4 mr-2"/>{L("Find Competitors","搜索竞争对手","搜尋競爭對手")}</>}
            </Button>
          </div>

          {selectedCustomerObj && competitors.length > 0 && (
            <div className="flex items-center justify-between mt-3 bg-blue-100 px-3 py-1.5 rounded-md">
              <p className="text-xs text-blue-700">
                {L(`Found ${competitors.length} competitors for "${selectedCustomerObj.name}"`,
                   `已为"${selectedCustomerObj.name}"找到 ${competitors.length} 个竞争对手`,
                   `已為「${selectedCustomerObj.name}」找到 ${competitors.length} 個競爭對手`)}
              </p>
              <button onClick={handleRelanguage}
                className="text-xs text-blue-700 underline flex items-center gap-1 hover:text-blue-900">
                <RefreshCw className="h-3 w-3"/>
                {L("Re-generate","切换语言后重新生成","切換語言後重新生成")}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {searchMutation.isPending && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1"><LoadingSkeleton/></div>
          <div className="lg:col-span-2">
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Brain className="h-12 w-12 mx-auto mb-3 animate-pulse text-blue-400"/>
                <p className="font-medium">{L("AI is analyzing competitors...","AI正在分析竞争对手...","AI正在分析競爭對手...")}</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Results */}
      {!searchMutation.isPending && competitors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left list */}
          <div className="lg:col-span-1">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3 pr-4">
                {competitors.map(comp => {
                  const rel = comp.relationshipAnalysis;
                  return (
                    <Card key={comp.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${selectedCompetitor?.id === comp.id ? "ring-2 ring-blue-500" : ""}`}
                      onClick={() => { setSelectedCompetitor(comp); setDetailTab("overview"); }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                              style={{ backgroundColor: comp.brandColor || "#6B7280" }}>
                              {(comp.shortName || comp.name).substring(0,2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 text-sm truncate">{comp.name}</h3>
                              <p className="text-xs text-gray-500 truncate">{comp.nameCn}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0 ml-2"
                            style={{ borderColor: threatColors[rel?.threatLevel]||"#F59E0B", color: threatColors[rel?.threatLevel]||"#F59E0B" }}>
                            {(rel?.threatLevel||"MED").toUpperCase()}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{comp.country}</span>
                          {comp.revenue > 0 && (
                            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3"/>{fmtRevenue(comp.revenue, comp.revenueCurrency)}</span>
                          )}
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{width:`${rel?.competitionScore||50}%`}}/>
                            </div>
                            <span className="text-xs text-gray-400 w-16">{L("Compete","竞争","競爭")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{width:`${rel?.cooperationScore||30}%`}}/>
                            </div>
                            <span className="text-xs text-gray-400 w-16">{L("Cooperate","合作","合作")}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right detail */}
          <div className="lg:col-span-2">
            {selectedCompetitor ? (
              <Card className="h-[calc(100vh-380px)] flex flex-col overflow-hidden">
                <CardHeader className="flex-none pb-2"
                  style={{ borderBottom: `3px solid ${selectedCompetitor.brandColor||"#3B82F6"}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                        style={{ backgroundColor: selectedCompetitor.brandColor||"#6B7280" }}>
                        {(selectedCompetitor.shortName||selectedCompetitor.name).substring(0,3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate">{selectedCompetitor.name}</CardTitle>
                        <CardDescription className="truncate">
                          {selectedCompetitor.nameCn} · {selectedCompetitor.country}
                        </CardDescription>
                      </div>
                    </div>
                    {selectedCompetitor.website && (
                      <Button variant="outline" size="sm" asChild className="shrink-0">
                        <a href={selectedCompetitor.website} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1"/>
                          {L("Website","官网","官網")}
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex-none px-4 pt-2">
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="overview">{L("Overview","概览","概覽")}</TabsTrigger>
                      <TabsTrigger value="projects">{L("Projects","项目","項目")}</TabsTrigger>
                      <TabsTrigger value="analysis">{L("AI Analysis","AI分析","AI分析")}</TabsTrigger>
                      <TabsTrigger value="relationship">{L("Relationship","关系","關係")}</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full px-4 py-3">

                      {/* OVERVIEW */}
                      <TabsContent value="overview" className="mt-0 space-y-4">
                        <p className="text-sm text-gray-600">{selectedCompetitor.description}</p>
                        <div className="grid grid-cols-3 gap-3">
                          {selectedCompetitor.revenue > 0 && (
                            <Card className="p-3">
                              <div className="text-xs text-gray-500">{L("Revenue","营收","營收")}</div>
                              <div className="font-bold text-sm">{fmtRevenue(selectedCompetitor.revenue,selectedCompetitor.revenueCurrency)}</div>
                              <div className="text-xs text-gray-400">{selectedCompetitor.revenueYear}</div>
                            </Card>
                          )}
                          {selectedCompetitor.employees > 0 && (
                            <Card className="p-3">
                              <div className="text-xs text-gray-500">{L("Employees","员工","員工")}</div>
                              <div className="font-bold text-sm">
                                {selectedCompetitor.employees>1000?`${(selectedCompetitor.employees/1000).toFixed(0)}K`:selectedCompetitor.employees}
                              </div>
                            </Card>
                          )}
                          <Card className="p-3">
                            <div className="text-xs text-gray-500">{L("HQ","总部","總部")}</div>
                            <div className="font-bold text-sm truncate">{(selectedCompetitor.headquarters||selectedCompetitor.country).split(",")[0]}</div>
                          </Card>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Card className="p-4">
                            <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4"/>{L("Strengths","优势","優勢")}
                            </h4>
                            <ul className="space-y-1">
                              {(selectedCompetitor.strengths||[]).map((s,i)=>(
                                <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                                  <span className="text-green-500 mt-0.5 shrink-0">•</span>
                                  <span className="break-words">{s}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                          <Card className="p-4">
                            <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2 text-sm">
                              <TrendingDown className="h-4 w-4"/>{L("Weaknesses","劣势","劣勢")}
                            </h4>
                            <ul className="space-y-1">
                              {(selectedCompetitor.weaknesses||[]).map((w,i)=>(
                                <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                                  <span className="text-red-500 mt-0.5 shrink-0">•</span>
                                  <span className="break-words">{w}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        </div>

                        {(selectedCompetitor.recentNews||[]).length > 0 && (
                          <Card className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                              <Newspaper className="h-4 w-4"/>{L("Recent News","最新动态","最新動態")}
                            </h4>
                            <div className="space-y-2">
                              {selectedCompetitor.recentNews.map((news,i)=>(
                                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                                  <Badge variant="outline"
                                    className={news.impact==="high"?"border-red-300 text-red-700 text-xs":"border-gray-300 text-xs"}>
                                    {news.impact?.toUpperCase()||"MED"}
                                  </Badge>
                                  <div>
                                    <p className="text-sm text-gray-900 break-words">{news.title}</p>
                                    <p className="text-xs text-gray-400">{news.date}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </TabsContent>

                      {/* PROJECTS */}
                      <TabsContent value="projects" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">{L("Active Projects","活跃项目","活躍項目")}</h4>
                          <Badge variant="outline">{(selectedCompetitor.projects||[]).length} {L("projects","个项目","個項目")}</Badge>
                        </div>
                        {(selectedCompetitor.projects||[]).length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">{L("No project data","暂无项目数据","暫無項目數據")}</p>
                        ) : selectedCompetitor.projects.map(proj=>(
                          <Card key={proj.id} className="p-4">
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-gray-900 text-sm break-words">{proj.name}</h5>
                                <p className="text-xs text-gray-500 mt-1 break-words">{proj.description}</p>
                              </div>
                              <Badge className={`${(statusBadge[proj.status]||statusBadge.planning).cls} text-xs shrink-0 ml-2`}>
                                {language==="en"
                                  ? (statusBadge[proj.status]||statusBadge.planning).en
                                  : (statusBadge[proj.status]||statusBadge.planning).zh}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div><span className="text-gray-400">{L("Investment","投资","投資")}: </span>
                                <span className="font-medium">{fmtInvest(proj.investment,proj.currency)}</span></div>
                              <div><span className="text-gray-400">{L("Regions","区域","區域")}: </span>
                                <span className="font-medium">{(proj.regions||[]).slice(0,2).join(", ")}</span></div>
                            </div>
                            <OppLabel opp={proj.ourOpportunity} lang={language}/>
                          </Card>
                        ))}
                      </TabsContent>

                      {/* AI ANALYSIS */}
                      <TabsContent value="analysis" className="mt-0 space-y-4">
                        <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Brain className="h-5 w-5 text-purple-600"/>
                            <h4 className="font-semibold text-purple-900">{L("AI Strategic Insights","AI战略洞察","AI戰略洞察")}</h4>
                          </div>
                          <div className="space-y-3">
                            {(selectedCompetitor.relationshipAnalysis?.aiInsights||[]).map((insight,i)=>(
                              <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                                <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0"/>
                                <p className="text-sm text-gray-700 break-words">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </Card>
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-red-500"/>{L("Conflict Areas","冲突领域","衝突領域")}
                            </h4>
                            <ul className="space-y-2">
                              {(selectedCompetitor.relationshipAnalysis?.conflictAreas||[]).map((a,i)=>(
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Swords className="h-3 w-3 text-red-400 shrink-0 mt-0.5"/>
                                  <span className="break-words">{a}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                          <Card className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                              <Handshake className="h-4 w-4 text-green-500"/>{L("Cooperation Areas","合作领域","合作領域")}
                            </h4>
                            <ul className="space-y-2">
                              {(selectedCompetitor.relationshipAnalysis?.cooperationAreas||[]).map((a,i)=>(
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Handshake className="h-3 w-3 text-green-400 shrink-0 mt-0.5"/>
                                  <span className="break-words">{a}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        </div>
                        <Card className="p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                            <Target className="h-4 w-4 text-blue-500"/>{L("Our Opportunities","我们的机会","我們的機會")}
                          </h4>
                          <div className="space-y-2">
                            {(selectedCompetitor.relationshipAnalysis?.opportunities||[]).map((o,i)=>(
                              <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                <Zap className="h-4 w-4 text-blue-500 shrink-0 mt-0.5"/>
                                <span className="text-sm text-gray-700 break-words flex-1">{o}</span>
                                <ArrowRight className="h-4 w-4 text-blue-400 shrink-0"/>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </TabsContent>

                      {/* RELATIONSHIP */}
                      <TabsContent value="relationship" className="mt-0 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-4 text-sm">{L("Relationship Score","关系评分","關係評分")}</h4>
                            <div className="space-y-4">
                              <div>
                                <div className="flex justify-between mb-1 text-sm">
                                  <span className="flex items-center gap-1"><Swords className="h-3 w-3 text-red-500"/>{L("Competition","竞争","競爭")}</span>
                                  <span className="font-semibold">{selectedCompetitor.relationshipAnalysis?.competitionScore||0}%</span>
                                </div>
                                <Progress value={selectedCompetitor.relationshipAnalysis?.competitionScore||0} className="h-2"/>
                              </div>
                              <div>
                                <div className="flex justify-between mb-1 text-sm">
                                  <span className="flex items-center gap-1"><Handshake className="h-3 w-3 text-green-500"/>{L("Cooperation","合作","合作")}</span>
                                  <span className="font-semibold">{selectedCompetitor.relationshipAnalysis?.cooperationScore||0}%</span>
                                </div>
                                <Progress value={selectedCompetitor.relationshipAnalysis?.cooperationScore||0} className="h-2"/>
                              </div>
                              <div className="pt-2 border-t flex items-center justify-between text-sm">
                                <span className="text-gray-600">{L("Threat Level","威胁等级","威脅等級")}</span>
                                <Badge style={{
                                  backgroundColor: threatColors[selectedCompetitor.relationshipAnalysis?.threatLevel]||"#F59E0B",
                                  color:"white"
                                }}>
                                  {(selectedCompetitor.relationshipAnalysis?.threatLevel||"medium").toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                          </Card>
                          <Card className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm">{L("Competitive Position","竞争态势","競爭態勢")}</h4>
                            <ResponsiveContainer width="100%" height={180}>
                              <RadarChart data={getRadarData(selectedCompetitor)}>
                                <PolarGrid/>
                                <PolarAngleAxis dataKey="dimension" tick={{fontSize:9}}/>
                                <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fontSize:9}}/>
                                <Radar name="Score" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.5}/>
                              </RadarChart>
                            </ResponsiveContainer>
                          </Card>
                        </div>
                        <Card className="p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm">{L("Recommended Actions","建议行动","建議行動")}</h4>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { bg:"bg-red-50 border-red-100", icon:<Shield className="h-4 w-4 text-red-600"/>, label:L("Defend","防守","防守"), desc:L("Protect existing customers","保护现有客户","保護現有客戶"), textCls:"text-red-800 text-xs", descCls:"text-xs text-red-700" },
                              { bg:"bg-yellow-50 border-yellow-100", icon:<Target className="h-4 w-4 text-yellow-600"/>, label:L("Monitor","监控","監控"), desc:L("Track market moves","追踪市场动作","追蹤市場動作"), textCls:"text-yellow-800 text-xs", descCls:"text-xs text-yellow-700" },
                              { bg:"bg-green-50 border-green-100", icon:<Handshake className="h-4 w-4 text-green-600"/>, label:L("Engage","接触","接觸"), desc:L("Explore partnerships","探索合作机会","探索合作機會"), textCls:"text-green-800 text-xs", descCls:"text-xs text-green-700" },
                            ].map(({bg,icon,label,desc,textCls,descCls},i)=>(
                              <div key={i} className={`p-3 rounded-lg border ${bg}`}>
                                <div className="flex items-center gap-2 mb-1">{icon}<span className={`font-semibold ${textCls}`}>{label}</span></div>
                                <p className={descCls}>{desc}</p>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </TabsContent>

                    </ScrollArea>
                  </div>
                </Tabs>
              </Card>
            ) : (
              <Card className="h-[calc(100vh-380px)] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300"/>
                  <p>{L("Select a competitor to view details","选择竞争对手查看详情","選擇競爭對手查看詳情")}</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searchMutation.isPending && !searchMutation.isError && competitors.length === 0 && !searchMutation.isSuccess && (
        <Card className="py-16">
          <div className="text-center text-gray-400">
            <Globe className="h-16 w-16 mx-auto mb-4 opacity-30"/>
            <p className="font-medium text-lg">{L("Select a customer to begin","选择客户开始分析","選擇客戶開始分析")}</p>
            <p className="text-sm mt-2">{L("AI will identify competitors based on industry and market","AI将根据客户行业和市场识别竞争对手","AI將根據客戶行業和市場識別競爭對手")}</p>
          </div>
        </Card>
      )}
    </div>
  );
}