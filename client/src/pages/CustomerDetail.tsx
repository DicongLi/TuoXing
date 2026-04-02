import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2, ArrowLeft, Globe, MapPin, Users, Calendar,
  TrendingUp, Handshake, Network, ExternalLink, Sparkles,
  Phone, Mail, DollarSign, AlertTriangle
} from "lucide-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function formatCurrency(value: number | null): string {
  if (!value) return "N/A";
  const v = value / 100;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="font-medium">{value || "N/A"}</div>
      </div>
    </div>
  );
}

function getValidLogoUrl(url: string | null | undefined) {
  if (!url) return "";
  const cleanUrl = url.trim();
  if (cleanUrl === "NULL" || cleanUrl === "null" || cleanUrl.length < 5) return "";
  return cleanUrl;
}

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const customerId = parseInt(params.id || "0");

  const { data: customer, isLoading } = trpc.customer.get.useQuery({ id: customerId }, { enabled: customerId > 0 });
  const { data: subsidiaries } = trpc.subsidiary.listByCustomer.useQuery({ customerId }, { enabled: customerId > 0 });
  const { data: opportunities } = trpc.opportunity.list.useQuery({ customerId, limit: 10 }, { enabled: customerId > 0 });
  const { data: deals } = trpc.deal.list.useQuery({ customerId, limit: 10 }, { enabled: customerId > 0 });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Link href="/customers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">Customer not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validLogo = getValidLogoUrl(customer.logoUrl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="flex gap-4">
            <Avatar className="h-16 w-16 border bg-white shadow-sm rounded-lg">
              <AvatarImage
                src={validLogo}
                alt={customer.name}
                className="object-contain p-1"
              />
              <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-lg rounded-lg">
                {customer.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
                {customer.riskLevel && customer.riskLevel !== 'unknown' && (
                  <Badge variant={
                    customer.riskLevel === 'low' ? 'default' :
                    customer.riskLevel === 'medium' ? 'secondary' : 'destructive'
                  }>
                    {customer.riskLevel} risk
                  </Badge>
                )}
                <Badge variant="outline" className="capitalize">{customer.operatingStatus || 'Active'}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {customer.industry || "Industry not specified"}
                {customer.registrationCountry && ` • ${customer.registrationCountry}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/corporate-tree?customer=${customerId}`}>
              <Network className="h-4 w-4 mr-2" />
              View Tree
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ai-analysis?customer=${customerId}`}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Analysis
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subsidiaries">Subsidiaries ({subsidiaries?.length || 0})</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities ({opportunities?.length || 0})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Basic Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow label="Industry" value={customer.industry} icon={TrendingUp} />
                  <InfoRow label="Business Type" value={customer.businessType} icon={Building2} />
                  <InfoRow label="Founded" value={customer.foundedDate} icon={Calendar} />
                  <InfoRow label="Employees" value={customer.employeeCount?.toLocaleString()} icon={Users} />
                  <InfoRow label="Country" value={customer.registrationCountry} icon={MapPin} />
                  {/* ✅✅✅ 修复后的 Website 链接逻辑 ✅✅✅ */}
                  <InfoRow
                    label="Website"
                    value={customer.website ? (
                      <a
                        href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {customer.website} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                    icon={Globe}
                  />
                  {/* ------------------------------------- */}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Annual Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(customer.annualRevenue)}</div>
                  {customer.revenueYear && <p className="text-xs text-muted-foreground">FY {customer.revenueYear}</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Subsidiaries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subsidiaries?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{opportunities?.filter(o => o.status === 'active').length || 0}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Contact & Financial */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <InfoRow label="Phone" value={customer.phone} icon={Phone} />
                  <InfoRow label="Email" value={customer.email} icon={Mail} />
                  <InfoRow label="Address" value={customer.registrationAddress} icon={MapPin} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Financial & Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <InfoRow label="Capital" value={customer.capitalAmount ? `${formatCurrency(customer.capitalAmount)} ${customer.capitalCurrency || 'USD'}` : null} icon={DollarSign} />
                  <InfoRow label="Stock" value={customer.stockExchange ? `${customer.stockExchange}: ${customer.stockSymbol}` : null} icon={TrendingUp} />
                  <InfoRow label="Risk Level" value={customer.riskLevel} icon={AlertTriangle} />
                  {customer.riskDescription && (
                    <p className="text-sm text-muted-foreground mt-2">{customer.riskDescription}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {(customer.description || customer.notes) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes & Description</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.description && <p className="mb-4">{customer.description}</p>}
                {customer.notes && <p className="text-muted-foreground">{customer.notes}</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subsidiaries">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subsidiaries & Branches</CardTitle>
                <CardDescription>Corporate family structure</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => alert("Feature coming soon")}>
                Add Subsidiary
              </Button>
            </CardHeader>
            <CardContent>
              {subsidiaries && subsidiaries.length > 0 ? (
                <div className="space-y-3">
                  {subsidiaries.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Network className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {sub.entityType || 'Subsidiary'} • {sub.country || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{sub.operatingStatus || 'Active'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No subsidiaries recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Opportunities</CardTitle>
                <CardDescription>Sales pipeline for this customer</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => alert("Feature coming soon")}>
                Add Opportunity
              </Button>
            </CardHeader>
            <CardContent>
              {opportunities && opportunities.length > 0 ? (
                <div className="space-y-3">
                  {opportunities.map(opp => (
                    <div key={opp.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{opp.name}</p>
                          <p className="text-sm text-muted-foreground">{opp.productType || 'General'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(opp.amount)}</p>
                        <Badge variant="secondary" className="capitalize">{opp.stage || 'Lead'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No opportunities recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Deal History</CardTitle>
                <CardDescription>Closed transactions with this customer</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => alert("Feature coming soon")}>
                Add Deal
              </Button>
            </CardHeader>
            <CardContent>
              {deals && deals.length > 0 ? (
                <div className="space-y-3">
                  {deals.map(deal => (
                    <div key={deal.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Handshake className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{deal.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {deal.productType || 'General'} • {deal.closedDate ? new Date(deal.closedDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(deal.amount)}</p>
                        <Badge variant="outline" className="capitalize">{deal.status || 'Active'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No deals recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}