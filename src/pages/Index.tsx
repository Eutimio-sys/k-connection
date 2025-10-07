import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="text-center space-y-8 p-8">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-2xl animate-pulse">
          <Building2 className="w-12 h-12 text-white" />
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ระบบบริหารงานก่อสร้าง
          </h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            ระบบจัดการโครงการและบริษัทรับเหมาก่อสร้างแบบครบวงจร
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => navigate("/auth")}
          className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
        >
          เข้าสู่ระบบ
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
