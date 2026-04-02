import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "login") {
        await loginMutation.mutateAsync({ email, password });
        toast.success("登录成功！");
      } else {
        await registerMutation.mutateAsync({
          email,
          password,
          name: name || email.split("@")[0]
        });
        toast.success("注册成功！");
      }
      // 登录/注册成功后跳转首页
      window.location.href = "/";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Customer Intelligence</CardTitle>
          <CardDescription>
            {mode === "login" ? "登录系统" : "注册新账号"}
          </CardDescription>
        </CardHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 px-6">
            <TabsTrigger value="login">登录 (Sign In)</TabsTrigger>
            <TabsTrigger value="register">注册 (Sign Up)</TabsTrigger>
          </TabsList>

          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label>姓名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" placeholder="你的名字" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input className="pl-9" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input className="pl-9" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" ? "登录" : "创建账号"}
              </Button>
            </form>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}