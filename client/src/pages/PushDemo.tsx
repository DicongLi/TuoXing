import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bell, Send, Save, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ── 常量 ──────────────────────────────────────────────────
const REGIONS = [
  { value: "MENA",       label: "MENA (中东北非区)" },
  { value: "Europe",     label: "Europe (欧洲区)" },
  { value: "SSA",        label: "SSA (南部非洲区)" },
  { value: "APAC",       label: "APAC (亚太区)" },
  { value: "AMER",       label: "AMER (美洲区)" },
  { value: "Eurasia_SZ", label: "Eurasia SZ. (亚欧专区)" },
];

const PLATFORMS = ["Web", "iOS", "Android"] as const;

// ── 类型 ──────────────────────────────────────────────────
interface HistoryRecord {
  id: string;
  date: string;
  title: string;
  target: string;
  status: "success" | "pending" | "failed";
}

// ── 工具函数 ──────────────────────────────────────────────
function getRegionLabel(value: string): string {
  return REGIONS.find((r) => r.value === value)?.label ?? value;
}

function now(): string {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

// ── 状态徽章 ──────────────────────────────────────────────
function StatusBadge({ status }: { status: HistoryRecord["status"] }) {
  const map = {
    success: { label: "成功",   className: "bg-green-100 text-green-700 border-green-200" },
    pending: { label: "发送中", className: "bg-blue-100 text-blue-700 border-blue-200" },
    failed:  { label: "失败",   className: "bg-red-100 text-red-700 border-red-200" },
  };
  const { label, className } = map[status];
  return (
    <Badge variant="outline" className={`border ${className}`}>
      {label}
    </Badge>
  );
}

// ── 主组件 ────────────────────────────────────────────────
const PushDemo: React.FC = () => {
  // 表单字段
  const [pushType,      setPushType]      = useState<"now" | "scheduled">("now");
  const [scheduledTime, setScheduledTime] = useState("");
  const [target,        setTarget]        = useState("MENA");
  const [title,         setTitle]         = useState("");
  const [content,       setContent]       = useState("");
  const [url,           setUrl]           = useState("");
  const [platforms,     setPlatforms]     = useState<string[]>(["Web", "iOS", "Android"]);

  // UI 状态
  const [sending,      setSending]      = useState(false);
  const [previewOpen,  setPreviewOpen]  = useState(false);

  // 历史记录
  const [history, setHistory] = useState<HistoryRecord[]>([
    { id: "1", date: "2023-10-27 10:00:00", title: "Q4 销售冲刺启动",    target: "APAC (亚太区)",   status: "success" },
    { id: "2", date: "2023-10-26 15:30:00", title: "新的合规政策更新通知", target: "Europe (欧洲区)", status: "success" },
    { id: "3", date: "2023-10-25 09:00:00", title: "系统维护通知",        target: "MENA (中东北非区)", status: "failed" },
  ]);

  // ── 平台复选框切换 ──
  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  // ── 表单校验 ──
  const validate = (): boolean => {
    if (!target)  { toast.error("请选择目标地区"); return false; }
    if (!title.trim())   { toast.error("请输入消息标题"); return false; }
    if (!content.trim()) { toast.error("请输入消息内容"); return false; }
    if (pushType === "scheduled" && !scheduledTime) {
      toast.error("请选择发送时间");
      return false;
    }
    return true;
  };

  // ── 提交 ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("消息已提交发送队列！");

      const newRecord: HistoryRecord = {
        id:     Date.now().toString(),
        date:   now(),
        title,
        target: getRegionLabel(target),
        status: "pending",
      };
      setHistory((prev) => [newRecord, ...prev]);

      // 重置表单
      setTitle("");
      setContent("");
      setUrl("");
      setScheduledTime("");
      setPushType("now");
    }, 1500);
  };

  // ── 保存草稿 ──
  const handleSaveDraft = () => {
    toast.info("草稿已保存（模拟）");
  };

  // ── 预览 ──
  const handlePreview = () => {
    if (!target || !title.trim() || !content.trim()) {
      toast.error("请先填写完整的推送信息（地区、标题、内容）");
      return;
    }
    setPreviewOpen(true);
  };

  // ── 渲染 ─────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── 发送表单 ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            消息推送演示
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            预览效果
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 推送类型 */}
            <div className="space-y-2">
              <Label>推送类型</Label>
              <RadioGroup
                value={pushType}
                onValueChange={(v) => setPushType(v as "now" | "scheduled")}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="now" id="type-now" />
                  <Label htmlFor="type-now" className="cursor-pointer font-normal">立即推送</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="scheduled" id="type-scheduled" />
                  <Label htmlFor="type-scheduled" className="cursor-pointer font-normal">定时推送</Label>
                </div>
              </RadioGroup>
            </div>

            {/* 定时时间（条件渲染） */}
            {pushType === "scheduled" && (
              <div className="space-y-2">
                <Label htmlFor="scheduled-time">发送时间 <span className="text-destructive">*</span></Label>
                <Input
                  id="scheduled-time"
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full sm:max-w-xs"
                />
              </div>
            )}

            <Separator />

            {/* 地区销售 */}
            <div className="space-y-2">
              <Label>地区销售 <span className="text-destructive">*</span></Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="w-full sm:max-w-xs">
                  <SelectValue placeholder="请选择目标地区" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 消息标题 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="msg-title">消息标题 <span className="text-destructive">*</span></Label>
                <span className="text-xs text-muted-foreground">{title.length} / 50</span>
              </div>
              <Input
                id="msg-title"
                placeholder="请输入消息标题（最多 50 字）"
                maxLength={50}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* 消息内容 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="msg-content">消息内容 <span className="text-destructive">*</span></Label>
                <span className="text-xs text-muted-foreground">{content.length} / 1000</span>
              </div>
              <Textarea
                id="msg-content"
                placeholder="请输入消息内容（最多 1000 字）"
                maxLength={1000}
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="resize-none"
              />
            </div>

            {/* 详情链接 */}
            <div className="space-y-2">
              <Label htmlFor="msg-url">详情链接</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">http://</span>
                <Input
                  id="msg-url"
                  placeholder="internal.crm/deal/123"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>

            {/* 目标平台 */}
            <div className="space-y-2">
              <Label>目标平台</Label>
              <div className="flex gap-6">
                {PLATFORMS.map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <Checkbox
                      id={`platform-${p}`}
                      checked={platforms.includes(p)}
                      onCheckedChange={() => togglePlatform(p)}
                    />
                    <Label htmlFor={`platform-${p}`} className="cursor-pointer font-normal">{p}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />发送中...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />确认发送</>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleSaveDraft}>
                <Save className="h-4 w-4 mr-2" />保存草稿
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── 历史记录 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近推送记录（演示数据）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>发送时间</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>目标区域</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {rec.date}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{rec.title}</TableCell>
                  <TableCell className="whitespace-nowrap">{rec.target}</TableCell>
                  <TableCell><StatusBadge status={rec.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setTitle(rec.title);
                          toast.info("已复用该推送内容");
                        }}
                      >
                        复用
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() =>
                          setHistory((prev) => prev.filter((r) => r.id !== rec.id))
                        }
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    暂无记录
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 预览弹窗 ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>消息通知预览</DialogTitle>
          </DialogHeader>

          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
            {/* 顶部：应用名 + 地区 + 时间 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                  <Bell className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">企业智脑 · 刚刚</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {getRegionLabel(target)}
              </Badge>
            </div>

            {/* 标题 */}
            <p className="font-semibold text-sm leading-snug">
              {title || "（未设置标题）"}
            </p>

            {/* 内容 */}
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {content || "（未设置内容）"}
            </p>

            {/* 平台标签 */}
            {platforms.length > 0 && (
              <div className="flex gap-1 flex-wrap pt-1">
                {platforms.map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PushDemo;