import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Search, Plus, MapPin, Users, Globe,
  ChevronRight, ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

function formatCurrency(value: number | null): string {
  if (!value) return "N/A";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function CustomerCardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Customers() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "", industry: "", registrationCountry: "",
    website: "", employeeCount: "", annualRevenue: "",
  });

  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: customers, isLoading } = trpc.customer.list.useQuery({
    search: search || undefined,
    limit: 50,
  });

  const createMutation = trpc.customer.create.useMutation({
    onSuccess: () => {
      toast.success(t("customers.createCustomer"));
      setIsAddOpen(false);
      setNewCustomer({ name: "", industry: "", registrationCountry: "", website: "", employeeCount: "", annualRevenue: "" });
      utils.customer.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create customer");
    },
  });

  const handleCreate = () => {
    if (!newCustomer.name.trim()) {
      toast.error(t("customers.companyName") + " is required");
      return;
    }
    createMutation.mutate({
      name: newCustomer.name,
      industry: newCustomer.industry || undefined,
      registrationCountry: newCustomer.registrationCountry || undefined,
      website: newCustomer.website || undefined,
      employeeCount: newCustomer.employeeCount ? parseInt(newCustomer.employeeCount) : undefined,
      annualRevenue: newCustomer.annualRevenue ? parseInt(newCustomer.annualRevenue) * 100 : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("customers.title")}</h1>
          <p className="text-muted-foreground">{t("customers.subtitle")}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isAuthenticated}>
              <Plus className="h-4 w-4 mr-2" />
              {t("customers.addCustomer")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("customers.addNewCustomer")}</DialogTitle>
              <DialogDescription>{t("customers.createDesc")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t("customers.companyName")} *</Label>
                <Input
                  id="name"
                  placeholder={t("customers.companyNamePlaceholder")}
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="industry">{t("customers.industry")}</Label>
                  <Input
                    id="industry"
                    placeholder={t("customers.industryPlaceholder")}
                    value={newCustomer.industry}
                    onChange={(e) => setNewCustomer({ ...newCustomer, industry: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">{t("customers.country")}</Label>
                  <Input
                    id="country"
                    placeholder={t("customers.countryPlaceholder")}
                    value={newCustomer.registrationCountry}
                    onChange={(e) => setNewCustomer({ ...newCustomer, registrationCountry: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website">{t("customers.website")}</Label>
                <Input
                  id="website"
                  placeholder={t("customers.websitePlaceholder")}
                  value={newCustomer.website}
                  onChange={(e) => setNewCustomer({ ...newCustomer, website: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="employees">{t("customers.employees")}</Label>
                  <Input
                    id="employees"
                    type="number"
                    placeholder={t("customers.employeesPlaceholder")}
                    value={newCustomer.employeeCount}
                    onChange={(e) => setNewCustomer({ ...newCustomer, employeeCount: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="revenue">{t("customers.annualRevenue")}</Label>
                  <Input
                    id="revenue"
                    type="number"
                    placeholder={t("customers.revenuePlaceholder")}
                    value={newCustomer.annualRevenue}
                    onChange={(e) => setNewCustomer({ ...newCustomer, annualRevenue: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? t("customers.creating") : t("customers.createCustomer")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("customers.searchPlaceholder")}
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="grid gap-4">
          <CustomerCardSkeleton />
          <CustomerCardSkeleton />
          <CustomerCardSkeleton />
        </div>
      ) : customers && customers.length > 0 ? (
        <div className="grid gap-4">
          {customers.map((customer) => (
            <div key={customer.id} onClick={() => setLocation(`/customers/${customer.id}`)} className="cursor-pointer">
              <Card className="hover:shadow-md transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Building2 className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {customer.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            {customer.industry && <span>{customer.industry}</span>}
                            {customer.registrationCountry && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {customer.registrationCountry}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {customer.riskLevel && customer.riskLevel !== 'unknown' && (
                            <Badge variant={
                              customer.riskLevel === 'low' ? 'default' :
                              customer.riskLevel === 'medium' ? 'secondary' : 'destructive'
                            }>
                              {customer.riskLevel} risk
                            </Badge>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">{t("customers.employees")}</p>
                          <p className="font-medium flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {customer.employeeCount?.toLocaleString() || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t("customers.revenue")}</p>
                          <p className="font-medium">
                            {formatCurrency(customer.annualRevenue ? customer.annualRevenue / 100 : null)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t("customers.status")}</p>
                          <p className="font-medium capitalize">
                            {customer.operatingStatus || t("customers.active")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t("customers.website")}</p>
                          {customer.website ? (
                            <a
                              href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="h-3 w-3" />
                              {t("customers.visit")}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <p className="font-medium text-muted-foreground">N/A</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t("customers.noFound")}</h3>
              <p className="text-muted-foreground mb-6">
                {search ? t("customers.tryAdjust") : t("customers.noFoundDesc")}
              </p>
              {!search && (
                <Button onClick={() => setIsAddOpen(true)} disabled={!isAuthenticated}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("customers.addCustomer")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}