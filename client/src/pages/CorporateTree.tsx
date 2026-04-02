import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Network, Building2, ChevronRight, ChevronDown, MapPin, Users, Sparkles, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type TreeNode = {
  id: number;
  name: string;
  type: "parent" | "subsidiary" | "branch" | "affiliate" | "headquarters";
  country?: string | null;
  employeeCount?: number | null;
  children?: TreeNode[];
};

function TreeNodeComponent({ node, level = 0, t }: { node: TreeNode; level?: number; t: (k: string) => string }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const typeColors: Record<string, string> = {
    parent:       "bg-primary text-primary-foreground",
    headquarters: "bg-primary text-primary-foreground",
    subsidiary:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    branch:       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    affiliate:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };

  const typeLabel: Record<string, string> = {
    parent:       t("corporateTree.parentCompany"),
    headquarters: t("corporateTree.parentCompany"),
    subsidiary:   t("corporateTree.subsidiary"),
    branch:       t("corporateTree.branch"),
    affiliate:    t("corporateTree.affiliate"),
  };

  return (
    <div className="relative">
      {level > 0 && (
        <div
          className="absolute left-0 top-0 w-6 h-6 border-l-2 border-b-2 border-border rounded-bl-lg"
          style={{ marginLeft: -24 }}
        />
      )}
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer ${
          level === 0 ? "border-primary/30" : ""
        }`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-6" />
        )}
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {level === 0
            ? <Building2 className="h-5 w-5 text-primary" />
            : <Network className="h-5 w-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{node.name}</span>
            <Badge className={typeColors[node.type] || typeColors.subsidiary} variant="secondary">
              {typeLabel[node.type] || node.type}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            {node.country && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{node.country}</span>
            )}
            {node.employeeCount && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />{node.employeeCount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="ml-12 mt-2 space-y-2 relative">
          {node.children!.map(child => (
            <TreeNodeComponent key={child.id} node={child} level={level + 1} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CorporateTree() {
  const { t, language } = useLanguage();
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const { data: customers, isLoading: customersLoading } = trpc.customer.list.useQuery({ limit: 50 });
  const { data: customer } = trpc.customer.get.useQuery(
    { id: parseInt(selectedCustomer) },
    { enabled: !!selectedCustomer }
  );
  const {
    data: subsidiaries,
    isLoading: subsidiariesLoading,
    refetch: refetchSubsidiaries,
  } = trpc.subsidiary.listByCustomer.useQuery(
    { customerId: parseInt(selectedCustomer) },
    { enabled: !!selectedCustomer }
  );

  const autoFillMutation = trpc.geographic.autoFillSubsidiaries.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(
          language === "zh-CN"
            ? `AI已自动生成 ${data.created} 个子公司/分支机构`
            : `AI generated ${data.created} subsidiaries`
        );
        refetchSubsidiaries();
      } else {
        toast.info(language === "zh-CN" ? "已有子公司数据" : "Already has subsidiary data");
      }
    },
    onError: () => {
      toast.error(language === "zh-CN" ? "AI生成失败，请重试" : "AI generation failed");
    },
  });

  const handleAutoFill = async () => {
    if (!selectedCustomer) return;
    setIsAutoFilling(true);
    try {
      await autoFillMutation.mutateAsync({ customerId: parseInt(selectedCustomer) });
    } finally {
      setIsAutoFilling(false);
    }
  };

  const buildTree = (): TreeNode | null => {
    if (!customer) return null;
    const parentNode: TreeNode = {
      id: customer.id,
      name: customer.name,
      type: "parent",
      country: customer.registrationCountry,
      employeeCount: customer.employeeCount,
      children: [],
    };
    if (subsidiaries && subsidiaries.length > 0) {
      const topLevel = subsidiaries.filter(s => !s.parentSubsidiaryId);
      const getChildren = (parentId: number): TreeNode[] =>
        subsidiaries
          .filter(s => s.parentSubsidiaryId === parentId)
          .map(s => ({
            id: s.id,
            name: s.name,
            type: (s.entityType || "subsidiary") as TreeNode["type"],
            country: s.country,
            employeeCount: s.employeeCount,
            children: getChildren(s.id),
          }));
      parentNode.children = topLevel.map(s => ({
        id: s.id,
        name: s.name,
        type: (s.entityType || "subsidiary") as TreeNode["type"],
        country: s.country,
        employeeCount: s.employeeCount,
        children: getChildren(s.id),
      }));
    }
    return parentNode;
  };

  const tree = buildTree();
  const hasNoSubsidiaries = !!selectedCustomer && !subsidiariesLoading && (!subsidiaries || subsidiaries.length === 0);

  const L = (en: string, zh: string) => language === "en" ? en : zh;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("corporateTree.title")}</h1>
        <p className="text-muted-foreground">{t("corporateTree.subtitle")}</p>
      </div>

      {/* Selector */}
      <Card>
        <CardHeader>
          <CardTitle>{t("corporateTree.selectCompany")}</CardTitle>
          <CardDescription>{t("corporateTree.selectDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {customersLoading ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : customers && customers.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder={t("corporateTree.choosePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoFill}
                  disabled={isAutoFilling}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0"
                >
                  {isAutoFilling ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{L("Generating...", "AI生成中...")}</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />{L("AI Auto-Generate", "AI自动生成")}</>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">{t("corporateTree.noCustomers")}</p>
          )}
        </CardContent>
      </Card>

      {/* AI auto-fill prompt when no subsidiaries */}
      {hasNoSubsidiaries && customer && (
        <Card className="border-purple-200 bg-purple-50/40">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-purple-900">
                  {L(
                    `No subsidiaries found for "${customer.name}"`,
                    `「${customer.name}」暂无子公司数据`
                  )}
                </p>
                <p className="text-sm text-purple-700 mt-1">
                  {L(
                    "Let AI automatically generate a realistic corporate structure based on this company's profile and industry.",
                    "让AI根据该公司档案和行业自动生成真实的企业架构树状图。"
                  )}
                </p>
              </div>
              <Button
                onClick={handleAutoFill}
                disabled={isAutoFilling}
                className="bg-purple-600 hover:bg-purple-700 shrink-0"
              >
                {isAutoFilling ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{L("Generating...", "生成中...")}</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />{L("AI Generate Structure", "AI生成企业架构")}</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tree */}
      {selectedCustomer && tree ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              {customer?.name} — {t("corporateTree.structure")}
            </CardTitle>
            <CardDescription>
              {subsidiaries?.length || 0} {t("corporateTree.subsidiariesCount")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subsidiariesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <div className="p-4">
                <TreeNodeComponent node={tree} t={t} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : selectedCustomer && !tree ? (
        <Card>
          <CardContent className="py-12">
            <Skeleton className="h-32 w-full max-w-lg mx-auto" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t("corporateTree.selectPrompt")}</p>
              <p className="text-sm mt-1">{t("corporateTree.selectPromptDesc")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("corporateTree.entityTypes")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">{t("corporateTree.parentCompany")}</Badge>
              <span className="text-sm text-muted-foreground">{t("corporateTree.parentDesc")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">{t("corporateTree.subsidiary")}</Badge>
              <span className="text-sm text-muted-foreground">{t("corporateTree.subsidiaryDesc")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">{t("corporateTree.branch")}</Badge>
              <span className="text-sm text-muted-foreground">{t("corporateTree.branchDesc")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800">{t("corporateTree.affiliate")}</Badge>
              <span className="text-sm text-muted-foreground">{t("corporateTree.affiliateDesc")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}