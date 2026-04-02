import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import WorldMap, { MapMarker } from "@/components/Worldmap";
import { Globe, MapPin, Loader2, Building2, GitFork, Ban, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

const getBadgeStyle = (type: string) => {
  if (!type) return "bg-gray-100 text-gray-800 border-gray-200";
  const t = type.toLowerCase();
  if (t === "hq" || t.includes("headquarters")) return "bg-red-100 text-red-700 hover:bg-red-200 border-red-200";
  if (t === "branch") return "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200";
  if (t.includes("inactive") || t.includes("dissolved")) return "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200";
  return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200";
};

export default function GeographicMap() {
  const { t, language } = useLanguage();
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const { data: customers } = trpc.customer.list.useQuery({});
  const { data: apiMarkers, isLoading, refetch } = trpc.geographic.getMarkers.useQuery({
    customerId: selectedCustomer !== "all" ? parseInt(selectedCustomer) : undefined,
  });

  const autoFillMutation = trpc.geographic.autoFillSubsidiaries.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(
          language === "zh-CN"
            ? `AI已自动生成 ${data.created} 个子公司/分支机构位置`
            : `AI generated ${data.created} subsidiary locations`
        );
        refetch();
      } else {
        toast.info(
          language === "zh-CN" ? "该客户已有子公司数据" : "Customer already has subsidiary data"
        );
      }
    },
    onError: () => {
      toast.error(language === "zh-CN" ? "AI生成失败，请重试" : "AI generation failed");
    },
  });

  const handleAutoFill = async () => {
    if (!selectedCustomer || selectedCustomer === "all") return;
    setIsAutoFilling(true);
    try {
      await autoFillMutation.mutateAsync({ customerId: parseInt(selectedCustomer) });
    } finally {
      setIsAutoFilling(false);
    }
  };

  const allEntries = apiMarkers || [];

  const markers: MapMarker[] = allEntries
    .filter(m => m.hasCoordinates && m.latitude != null && m.longitude != null)
    .map(m => ({
      id: m.id,
      name: m.name,
      country: m.country,
      city: m.city,
      latitude: m.latitude as number,
      longitude: m.longitude as number,
      type: m.type as MapMarker["type"],
    }));

  const noCoordEntries = allEntries.filter(m => !m.hasCoordinates);

  const stats = {
    total:      allEntries.length,
    hq:         allEntries.filter(m => m.type === "hq").length,
    subsidiary: allEntries.filter(m => m.type === "subsidiary").length,
    branch:     allEntries.filter(m => m.type === "branch").length,
    inactive:   allEntries.filter(m => m.type === "inactive").length,
  };

  const countryStats = allEntries.reduce((acc, entry) => {
    if (entry.country) acc[entry.country] = (acc[entry.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedCountries = Object.entries(countryStats).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Show AI auto-fill prompt when a specific customer is selected but has no data
  const showAutoFillPrompt =
    selectedCustomer !== "all" &&
    !isLoading &&
    allEntries.length === 0;

  const L = (en: string, zh: string) => language === "en" ? en : zh;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            {t("geographic.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("geographic.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Auto-Fill button – only shown when a specific customer is selected */}
          {selectedCustomer !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFill}
              disabled={isAutoFilling}
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              {isAutoFilling ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{L("Generating...", "AI生成中...")}</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />{L("AI Auto-Fill", "AI自动填充")}</>
              )}
            </Button>
          )}
          <Select
            value={selectedCustomer}
            onValueChange={(v) => {
              setSelectedCustomer(v);
              setSelectedMarker(null);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("geographic.filterByCustomer")} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] overflow-y-auto">
              <SelectItem value="all">{t("geographic.allCustomers")}</SelectItem>
              {customers?.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Auto-Fill prompt card */}
      {showAutoFillPrompt && (
        <Card className="border-purple-200 bg-purple-50/40">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-purple-900">
                  {L("No location data found for this customer", "该客户暂无位置数据")}
                </p>
                <p className="text-sm text-purple-700 mt-1">
                  {L(
                    "Click \"AI Auto-Fill\" to let AI generate realistic global subsidiary locations based on this company's profile.",
                    "点击「AI自动填充」让AI根据该公司档案自动生成全球子公司/分支机构位置数据。"
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
                  <><Sparkles className="h-4 w-4 mr-2" />{L("AI Auto-Fill Locations", "AI自动填充位置")}</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("geographic.totalLocations")}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">{t("geographic.hq")}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.hq}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <GitFork className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">{t("geographic.subsidiaries")}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.subsidiary}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">{t("geographic.branches")}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.branch}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-muted-foreground">{t("geographic.inactive")}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("geographic.mapTitle")}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <CardDescription>
            {markers.length > 0
              ? `${markers.length} ${t("geographic.locationsOnMap")}`
              : t("geographic.noMapData")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[450px] flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p className="text-sm">{t("geographic.loadingMap")}</p>
              </div>
            </div>
          ) : markers.length > 0 ? (
            <WorldMap
              markers={markers}
              onMarkerClick={setSelectedMarker}
              height={450}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center bg-muted/10 rounded-lg border-2 border-dashed">
              <div className="text-center text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">{t("geographic.noMapData")}</p>
                <p className="text-sm mt-1">
                  {selectedCustomer !== "all"
                    ? L("Use AI Auto-Fill to generate location data", "请使用AI自动填充生成位置数据")
                    : t("geographic.selectCustomerHint")}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Marker Info */}
      {selectedMarker && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{selectedMarker.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMarker.city ? `${selectedMarker.city}, ` : ""}{selectedMarker.country}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getBadgeStyle(selectedMarker.type)}>
                    {selectedMarker.type?.toUpperCase() || "UNKNOWN"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selectedMarker.latitude?.toFixed(4)}, {selectedMarker.longitude?.toFixed(4)}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMarker(null)}>✕</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No-coord warning */}
      {noCoordEntries.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              {t("geographic.missingCoords")} ({noCoordEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-600 mb-3">{t("geographic.missingCoordsDesc")}</p>
            <div className="flex flex-wrap gap-2">
              {noCoordEntries.slice(0, 10).map(e => (
                <Badge key={e.id} variant="outline" className="border-amber-300 text-amber-700 text-xs">
                  {e.name} {e.country ? `(${e.country})` : ""}
                </Badge>
              ))}
              {noCoordEntries.length > 10 && (
                <Badge variant="outline" className="border-amber-300 text-amber-500 text-xs">
                  +{noCoordEntries.length - 10} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Country distribution */}
      {sortedCountries.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geographic.countryDist")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedCountries.map(([country, count]) => (
                  <div key={country} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-32 truncate">{country}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Entity table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geographic.entityList")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t("geographic.name")}</TableHead>
                      <TableHead className="text-xs">{t("geographic.country")}</TableHead>
                      <TableHead className="text-xs">{t("geographic.type")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEntries.slice(0, 20).map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs font-medium truncate max-w-[140px]">{entry.name}</TableCell>
                        <TableCell className="text-xs">{entry.country || "—"}</TableCell>
                        <TableCell>
                          <Badge className={`${getBadgeStyle(entry.type)} text-xs`}>
                            {entry.type?.toUpperCase() || "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}