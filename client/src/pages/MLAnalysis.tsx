import { useState, useMemo, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Brain, DollarSign, Target, MapPin, Calendar,
  Filter, Search, Briefcase, Loader2, PieChart as PieChartIcon,
  ChevronDown, Sparkles, X
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { toast } from "sonner";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

type ProjectItem = {
  id: number;
  originalId: string;
  projectName: string;
  investment: number;
  country: string;
  sector: string;
  stage: string;
  startDate: string | null;
  contractor: string | null;
  summary: string | null;
  recommendations: Array<{
    productName: string;
    rank: number;
    confidence: string;
    aiScore: number;
  }>;
};

export default function MLAnalysis() {
  const { t, language } = useLanguage();

  // 数据库默认数据
  const { data: rawData, isLoading: isLoadingDefault } = trpc.ml.getData.useQuery();

  // AI 实时搜索
  const searchMutation = trpc.ml.search.useMutation({
    onSuccess: (data) => {
      setSearchResults(data as ProjectItem[]);
      setIsSearchMode(true);
      if (data.length === 0) {
        toast.warning(isCJK ? "未找到相关项目，请尝试其他关键词" : "No results found, try different keywords");
      }
    },
    onError: (err) => {
      toast.error(err.message || (isCJK ? "搜索失败，请检查 AI 配置" : "Search failed, check AI config"));
    },
  });

  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<ProjectItem[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false); // true = 显示搜索结果，false = 显示默认数据

  // 本地筛选（仅用于默认数据模式）
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedSector, setSelectedSector] = useState("All");
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => { setVisibleCount(20); }, [selectedYear, selectedSector, isSearchMode]);

  const isCN = language === "zh-CN";
  const isTW = language === "zh-TW";
  const isCJK = isCN || isTW;

  // 当前展示的数据源
  const activeData: ProjectItem[] = useMemo(() => {
    if (isSearchMode) return searchResults;
    if (!rawData) return [];
    return (rawData as ProjectItem[]).filter((item) => {
      const year = item.startDate ? new Date(item.startDate).getFullYear().toString() : "Unknown";
      if (selectedYear !== "All" && year !== selectedYear) return false;
      if (selectedSector !== "All" && item.sector !== selectedSector) return false;
      return true;
    });
  }, [rawData, isSearchMode, searchResults, selectedYear, selectedSector]);

  const sectors = useMemo(() => {
    if (!rawData) return [];
    return Array.from(new Set((rawData as ProjectItem[]).map((i) => i.sector).filter(Boolean))) as string[];
  }, [rawData]);

  const years = useMemo(() => {
    if (!rawData) return [];
    return (Array.from(new Set(
      (rawData as ProjectItem[]).map((i) => i.startDate ? new Date(i.startDate).getFullYear().toString() : "").filter(Boolean)
    )) as string[]).sort().reverse();
  }, [rawData]);

  const totalProjects = activeData.length;
  const totalInvestment = activeData.reduce((acc, curr) => acc + (Number(curr.investment) || 0), 0);
  const highConfProjects = activeData.filter((i) =>
    i.recommendations?.some((r) => r.confidence === "High")
  ).length;

  const sectorChartData = useMemo(() => {
    const map = new Map<string, number>();
    activeData.forEach((item) => {
      const sec = item.sector || "Unknown";
      map.set(sec, (map.get(sec) || 0) + (Number(item.investment) || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [activeData]);

  // 执行 AI 搜索
  const handleSearch = () => {
    const q = searchInput.trim();
    if (!q) return;
    searchMutation.mutate({ query: q });
  };

  // 清除搜索，回到默认数据
  const handleClearSearch = () => {
    setSearchInput("");
    setIsSearchMode(false);
    setSearchResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  // 多语言文本
  const txt = {
    subtitle: isCN ? "基于 BHI 项目库与 AI 实时搜索的商机分析系统"
      : isTW ? "基於 BHI 項目庫與 AI 實時搜尋的商機分析系統"
      : "BHI project intelligence with AI-powered real-time search",
    searchPlaceholder: isCN ? "输入关键词，AI 将为你实时检索相关项目..."
      : isTW ? "輸入關鍵詞，AI 將為你即時檢索相關項目..."
      : "Type a keyword — AI will search relevant projects in real-time...",
    searchBtn: isCJK ? "AI 搜索" : "AI Search",
    searching: isCJK ? "搜索中..." : "Searching...",
    clearSearch: isCJK ? "清除搜索" : "Clear Search",
    searchModeHint: isCN ? `正在显示 AI 搜索结果：「${searchInput}」`
      : isTW ? `正在顯示 AI 搜尋結果：「${searchInput}」`
      : `Showing AI search results for: "${searchInput}"`,
    filterLabel: isCN ? "筛选:" : isTW ? "篩選:" : "Filter:",
    allYears: isCN ? "所有年份" : isTW ? "所有年份" : "All Years",
    allSectors: isCN ? "所有行业" : isTW ? "所有行業" : "All Sectors",
    reset: isCN ? "重置" : isTW ? "重置" : "Reset",
    underFilter: isCN ? "当前条件下" : isTW ? "當前條件下" : "Under current filters",
    investNote: isCN ? "根据 BHI 投资概算" : isTW ? "根據 BHI 投資概算" : "Based on BHI estimates",
    aiMatchNote: isCN ? "置信度为 High 的项目" : isTW ? "置信度為 High 的項目" : "High confidence projects",
    sectorChartDesc: isCN ? "按投资金额 (万元)" : isTW ? "按投資金額 (萬元)" : "By investment (10k CNY)",
    sectorPieDesc: isCN ? "按投资金额比例" : isTW ? "按投資金額比例" : "By investment proportion",
    detailTitle: isCN ? "商机详情与 AI 推荐" : isTW ? "商機詳情與 AI 推薦" : "Opportunity Details & AI Recommendations",
    detailDesc: isCN ? "左侧为项目基本信息，右侧为 AI 推荐产品"
      : isTW ? "左側為項目基本信息，右側為 AI 推薦產品"
      : "Left: project details. Right: AI-recommended products",
    unknownStage: isCN ? "未知阶段" : isTW ? "未知階段" : "Unknown Stage",
    contractorLabel: isCN ? "承包单位:" : isTW ? "承包單位:" : "Contractor:",
    noRec: isCN ? "暂无 AI 推荐" : isTW ? "暫無 AI 推薦" : "No AI recommendations",
    loadMore: (n: number) => isCN ? `加载更多 (${n} 条)` : isTW ? `加載更多 (${n} 條)` : `Load more (${n})`,
    noMore: isCN ? "没有更多项目了" : isTW ? "沒有更多項目了" : "No more projects",
    noData: isCN ? "暂无数据，请先输入关键词搜索，或等待系统初始化完成"
      : isTW ? "暫無數據，請先輸入關鍵詞搜尋，或等待系統初始化完成"
      : "No data yet. Try searching with a keyword, or wait for system initialization.",
    investUnit: iCJK => iCJK ? "亿" : "B",
    wanUnit: iCJK => iCJK ? "万" : "K",
  };

  const isLoading = isLoadingDefault;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* 标题 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="h-8 w-8 text-indigo-600" />
          {t("ml.title")}
        </h1>
        <p className="text-muted-foreground">{txt.subtitle}</p>
      </div>

      {/* 搜索栏 — AI 实时搜索 */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-slate-50">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col gap-3">
            {/* AI 搜索输入 */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                <Input
                  placeholder={txt.searchPlaceholder}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 bg-white border-indigo-200 focus:border-indigo-400"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!searchInput.trim() || searchMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-2"
              >
                {searchMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{txt.searching}</>
                ) : (
                  <><Sparkles className="h-4 w-4" />{txt.searchBtn}</>
                )}
              </Button>
              {isSearchMode && (
                <Button variant="outline" onClick={handleClearSearch} className="shrink-0 gap-1">
                  <X className="h-4 w-4" />{txt.clearSearch}
                </Button>
              )}
            </div>

            {/* 搜索模式提示 */}
            {isSearchMode && (
              <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-100 rounded-lg px-3 py-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>{txt.searchModeHint}</span>
              </div>
            )}

            {/* 默认数据模式下的本地筛选 */}
            {!isSearchMode && (
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">{txt.filterLabel}</span>
                </div>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[130px] bg-white">
                    <SelectValue placeholder={txt.allYears} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">{txt.allYears}</SelectItem>
                    {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger className="w-[170px] bg-white">
                    <SelectValue placeholder={txt.allSectors} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">{txt.allSectors}</SelectItem>
                    {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm"
                  onClick={() => { setSelectedYear("All"); setSelectedSector("All"); }}>
                  {txt.reset}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 无数据时提示 */}
      {activeData.length === 0 && !searchMutation.isPending && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 text-indigo-300" />
            <p className="text-base">{txt.noData}</p>
          </CardContent>
        </Card>
      )}

      {activeData.length > 0 && (
        <>
          {/* KPI */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("ml.totalProjects")}</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProjects}</div>
                <p className="text-xs text-muted-foreground">{txt.underFilter}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("ml.totalInvestment")}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ¥ {(totalInvestment / 10000).toFixed(2)} {isCJK ? "亿" : "B"}
                </div>
                <p className="text-xs text-muted-foreground">{txt.investNote}</p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-900">{t("ml.aiMatches")}</CardTitle>
                <Brain className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-700">{highConfProjects}</div>
                <p className="text-xs text-indigo-600/80">{txt.aiMatchNote}</p>
              </CardContent>
            </Card>
          </div>

          {/* 图表 */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("ml.sectorChart")}</CardTitle>
                <CardDescription>{txt.sectorChartDesc}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(val: number) => `¥${(val / 10000).toFixed(1)}${isCJK ? "亿" : "B"}`} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-indigo-600" />
                  {t("ml.sectorPie")}
                </CardTitle>
                <CardDescription>{txt.sectorPieDesc}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sectorChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                      paddingAngle={2} dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {sectorChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => `¥${(val / 10000).toFixed(1)}${isCJK ? "亿" : "B"}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 详细列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600" />
                {txt.detailTitle}
              </CardTitle>
              <CardDescription>{txt.detailDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeData.slice(0, visibleCount).map((item, itemIndex) => (
                  <div key={item.id ?? `item-${itemIndex}`}
                    className="flex flex-col lg:flex-row gap-6 p-5 border rounded-xl hover:bg-slate-50 transition-all">
                    {/* 左侧 */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-gray-900 line-clamp-2">{item.projectName}</h3>
                        <Badge variant="outline" className="shrink-0">{item.stage || txt.unknownStage}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" />{item.country}</div>
                        <div className="flex items-center gap-1.5"><Briefcase className="h-3 w-3 shrink-0" />{item.sector}</div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3 w-3 shrink-0" />
                          ¥{Number(item.investment).toLocaleString()}{isCJK ? "万" : "K"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {item.startDate ? new Date(item.startDate).toLocaleDateString() : "-"}
                        </div>
                      </div>
                      {item.contractor && (
                        <div className="text-xs text-muted-foreground bg-gray-100 px-2 py-1.5 rounded">
                          <span className="font-semibold">{txt.contractorLabel}</span> {item.contractor}
                        </div>
                      )}
                      {item.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                      )}
                    </div>
                    {/* 右侧 AI 推荐 */}
                    <div className="lg:w-[420px] flex gap-2 overflow-x-auto pb-1">
                      {item.recommendations && item.recommendations.length > 0 ? (
                        [...item.recommendations]
                          .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                          .map((rec, idx) => (
                            <div key={`rec-${itemIndex}-${idx}`}
                              className={`min-w-[130px] p-3 rounded-lg border-l-4 shadow-sm bg-white shrink-0 ${
                                rec.confidence === "High" ? "border-l-green-500"
                                : rec.confidence === "Medium" ? "border-l-orange-400"
                                : "border-l-gray-300"
                              }`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-gray-400 uppercase font-bold">#{rec.rank}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  rec.confidence === "High" ? "bg-green-100 text-green-700" : "bg-orange-50 text-orange-700"
                                }`}>{rec.confidence}</span>
                              </div>
                              <h4 className="font-semibold text-xs text-gray-800 line-clamp-2 mb-1.5" title={rec.productName}>
                                {rec.productName}
                              </h4>
                              <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                                <Brain className="h-3 w-3" />
                                {Number(rec.aiScore).toFixed(2)}
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="flex items-center justify-center w-full text-xs text-gray-400 border rounded-lg border-dashed p-3">
                          {txt.noRec}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {activeData.length > visibleCount ? (
                  <div className="flex justify-center pt-3">
                    <Button variant="outline" onClick={() => setVisibleCount((p) => p + 20)} className="gap-2 w-full md:w-auto">
                      <ChevronDown className="h-4 w-4" />
                      {txt.loadMore(activeData.length - visibleCount)}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-3 text-muted-foreground text-sm">{txt.noMore}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}