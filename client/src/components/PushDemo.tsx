import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Send, CheckCircle, Clock, Users } from "lucide-react";
import { toast } from "sonner";

const REGIONS = [
  { id: "asia-pacific", label: "Asia Pacific", count: 12 },
  { id: "middle-east", label: "Middle East", count: 8 },
  { id: "africa", label: "Africa", count: 6 },
  { id: "europe", label: "Europe", count: 5 },
  { id: "americas", label: "Americas", count: 4 },
];

interface SentMessage {
  id: number;
  title: string;
  body: string;
  regions: string[];
  sentAt: Date;
}

export default function PushDemo() {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const toggleRegion = (id: string) => {
    setSelectedRegions(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }
    if (selectedRegions.length === 0) {
      toast.error("Please select at least one region");
      return;
    }
    setIsSending(true);
    await new Promise(r => setTimeout(r, 1200));
    setSentMessages(prev => [{
      id: Date.now(),
      title,
      body,
      regions: selectedRegions,
      sentAt: new Date(),
    }, ...prev]);
    toast.success(`Push notification sent to ${selectedRegions.length} region(s)`);
    setTitle("");
    setBody("");
    setSelectedRegions([]);
    setIsSending(false);
  };

  const totalRecipients = REGIONS
    .filter(r => selectedRegions.includes(r.id))
    .reduce((acc, r) => acc + r.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          {t("push.title")}
        </h1>
        <p className="text-muted-foreground">{t("push.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 编写消息 */}
        <Card>
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
            <CardDescription>Send push notifications to regional sales teams</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g. New Opportunity Alert"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Enter your message..."
                rows={4}
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Regions</label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map(region => (
                  <button
                    key={region.id}
                    onClick={() => toggleRegion(region.id)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                      selectedRegions.includes(region.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    {region.label} ({region.count})
                  </button>
                ))}
              </div>
            </div>
            {totalRecipients > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Users className="h-4 w-4" />
                <span>Will notify <strong>{totalRecipients}</strong> team members</span>
              </div>
            )}
            <Button onClick={handleSend} disabled={isSending} className="w-full">
              {isSending ? (
                <><Clock className="h-4 w-4 mr-2 animate-spin" />Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Send Notification</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 发送历史 */}
        <Card>
          <CardHeader>
            <CardTitle>Sent History</CardTitle>
            <CardDescription>Recently sent push notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {sentMessages.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No messages sent yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentMessages.map(msg => (
                  <div key={msg.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="font-medium text-sm">{msg.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {msg.sentAt.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{msg.body}</p>
                    <div className="flex flex-wrap gap-1 pl-6">
                      {msg.regions.map(r => (
                        <Badge key={r} variant="secondary" className="text-xs">
                          {REGIONS.find(reg => reg.id === r)?.label || r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}