import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) navigate("/");
    };
    checkUser();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error("เข้าสู่ระบบไม่สำเร็จ");
    else {
      toast.success("เข้าสู่ระบบสำเร็จ");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-page p-4">
      <Card className="w-full max-w-md shadow-elegant border-border rounded-2xl animate-scale-in">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-primary">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold">K-connection</CardTitle>
          <CardDescription className="text-base">เข้าสู่ระบบเพื่อเริ่มใช้งาน</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">อีเมล</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                className="h-11 rounded-xl border-border focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">รหัสผ่าน</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-11 rounded-xl border-border focus:border-primary"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
