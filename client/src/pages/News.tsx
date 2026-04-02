import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, ExternalLink, Sparkles, Loader2, RefreshCw, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";

export default function News() {
  const { t, language } = useLanguage();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const { data: news, isLoading, refetch } = trpc.news.list.useQuery({ limit: 50 });
  const { data: customers } = trpc.customer.list.useQuery({ limit: 100 });
  const generateMutation = trpc.news.searchNews.useMutation();

  const handleGenerate = async () => {
    if (!selectedCustomerId) {
      toast.error(t("news.targetCustomer"));
      return;
    }
    const customerList = Array.isArray(customers) ? customers : (customers as any)?.customers || [];
    const customer = customerList.find((c: any) => c.id === parseInt(selectedCustomerId));
    try {
      toast.info(`${t("news.searching")} [${customer?.name}]...`, { duration: 5000 });
      const result = await generateMutation.mutateAsync({
        customerId: parseInt(selectedCustomerId),
        // Pass language so backend can instruct AI to respond in the right language
        language: language === "zh-CN" ? "zh-CN" : language === "zh-TW" ? "zh-TW" : "en",
      } as any);
      if ((result as any).success) {
        toast.success(`${t("news.searchNews")} — ${(result as any).count} ${t("news.latestNewsDesc")}`);
        refetch();
        setSelectedCustomerId("");
      }
    } catch {
      toast.error("Failed to search news");
    }
  };

  const getSafeCustomerList = () => {
    if (!customers) return [];
    if (Array.isArray(customers)) return customers;
    return (customers as any).customers || [];
  };

  /**
   * Build the best link for a news item:
   * 1. Use sourceUrl directly if it's a real HTTP URL (not a generic Google search)
   * 2. Otherwise build a more specific Google News search with the title
   */
  const getNewsLink = (item: any) => {
    const url = item.sourceUrl as string | undefined;
    if (url && url.startsWith("http") && !url.includes("google.com/search")) {
      return url;
    }
    // Build a specific Google News URL using the exact article title
    const query = encodeURIComponent(item.title || "");
    return `https://news.google.com/search?q=${query}&hl=${
      language === "zh-CN" ? "zh-CN" : language === "zh-TW" ? "zh-TW" : "en-US"
    }`;
  };

  const sentimentColor = (s?: string) => {
    if (s === "positive") return { bg: "bg-green-100", icon: "text-green-600" };
    if (s === "negative") return { bg: "bg-red-100", icon: "text-red-600" };
    return { bg: "bg-blue-100", icon: "text-blue-600" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("news.title")}</h1>
          <p className="text-muted-foreground">{t("news.subtitle")}</p>
        </div>
      </div>

      {/* Language notice */}
      {language !== "en" && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>
            {language === "zh-CN"
              ? "新搜索的新闻将由AI翻译为简体中文。已有新闻如需翻译，请重新搜索。"
              : "新搜尋的新聞將由AI翻譯為繁體中文。已有新聞如需翻譯，請重新搜尋。"}
          </span>
        </div>
      )}

      {/* Search */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-indigo-700">
            <Search className="h-5 w-5" />
            {t("news.searchTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 w-full">
              <label className="text-sm font-medium">{t("news.targetCustomer")}</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="" disabled>{t("news.selectCompany")}</option>
                {getSafeCustomerList().map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!selectedCustomerId || generateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("news.searching")}</>
              ) : (
                <><Search className="h-4 w-4 mr-2" />{t("news.searchNews")}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* News List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("news.latestNews")}</CardTitle>
            <CardDescription>{t("news.latestNewsDesc")}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : news && news.length > 0 ? (
            <div className="space-y-4">
              {news.map(item => {
                const link = getNewsLink(item);
                const sc = sentimentColor(item.sentiment || undefined);
                return (
                  <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors bg-white group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${sc.bg}`}>
                          <Newspaper className={`h-5 w-5 ${sc.icon}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Use <a> with rel=noopener. Title links directly to the article. */}
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-base text-blue-700 hover:underline flex items-center gap-2"
                          >
                            <span className="line-clamp-2">{item.title}</span>
                            <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
                          </a>
                          {item.summary && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="font-medium text-gray-700">{item.sourceName || t("news.webSource")}</span>
                            <span>·</span>
                            <span>{item.publishedDate ? new Date(item.publishedDate).toLocaleDateString() : "N/A"}</span>
                            <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              <Sparkles className="h-3 w-3" />
                              {t("news.aiAnalysis")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild className="hidden sm:flex h-8 text-xs shrink-0">
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {t("news.verifySource")}
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-indigo-300" />
              <p>{t("news.noNews")}</p>
              <p className="text-sm mt-1">{t("news.noNewsDesc")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}