import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Building2, TrendingUp, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Streamdown } from "streamdown";

export default function AIAnalysis() {
  const { t, language } = useLanguage();
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<string>("summary");
  const [analysisResult, setAnalysisResult] = useState<string>("");

  const { data: customers, isLoading: customersLoading } = trpc.customer.list.useQuery({ limit: 50 });

  const analyzeMutation = trpc.ai.analyzeCustomer.useMutation({
    onSuccess: (data) => setAnalysisResult(data.analysis),
    onError: (error) => setAnalysisResult(`Error: ${error.message}`),
  });

  const handleAnalyze = () => {
    if (!selectedCustomer) return;
    setAnalysisResult("");
    analyzeMutation.mutate({
      customerId: parseInt(selectedCustomer),
      analysisType: analysisType as "summary" | "product_match" | "talking_points" | "risk_assessment",
      // ✅ 传递当前语言给后端，让 AI 用对应语言回复
      language,
    });
  };

  const analysisTypes = [
    { value: "summary",         labelKey: "aiAnalysis.summary",        icon: Building2,     descKey: "aiAnalysis.summaryDesc" },
    { value: "product_match",   labelKey: "aiAnalysis.productMatch",   icon: TrendingUp,    descKey: "aiAnalysis.productMatchDesc" },
    { value: "talking_points",  labelKey: "aiAnalysis.talkingPoints",  icon: MessageSquare, descKey: "aiAnalysis.talkingPointsDesc" },
    { value: "risk_assessment", labelKey: "aiAnalysis.riskAssessment", icon: Sparkles,      descKey: "aiAnalysis.riskAssessmentDesc" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("aiAnalysis.title")}</h1>
        <p className="text-muted-foreground">{t("aiAnalysis.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("aiAnalysis.generateTitle")}
          </CardTitle>
          <CardDescription>{t("aiAnalysis.generateDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("aiAnalysis.selectCustomer")}</label>
              {customersLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("aiAnalysis.choosePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("aiAnalysis.analysisType")}</label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {analysisTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{t(type.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAnalyze} disabled={!selectedCustomer || analyzeMutation.isPending} className="w-full md:w-auto">
            {analyzeMutation.isPending
              ? <><Sparkles className="h-4 w-4 mr-2 animate-spin" />{t("aiAnalysis.analyzing")}</>
              : <><Sparkles className="h-4 w-4 mr-2" />{t("aiAnalysis.generate")}</>
            }
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {analysisTypes.map(type => (
          <Card
            key={type.value}
            className={`cursor-pointer transition-all ${analysisType === type.value ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
            onClick={() => setAnalysisType(type.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <type.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t(type.labelKey)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t(type.descKey)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(analysisResult || analyzeMutation.isPending) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("aiAnalysis.resultTitle")}</CardTitle>
            <CardDescription>
              {t(analysisTypes.find(type => type.value === analysisType)?.labelKey || "")} {t("aiAnalysis.forCustomer")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyzeMutation.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <Streamdown>{analysisResult}</Streamdown>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!analysisResult && !analyzeMutation.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t("aiAnalysis.noResult")}</p>
              <p className="text-sm mt-1">{t("aiAnalysis.noResultDesc")}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}