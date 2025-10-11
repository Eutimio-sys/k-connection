import { useEffect, useState, useRef } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { AccessDenied } from "./AccessDenied";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  featureCode?: string;
  requiredRoles?: string[];
}

export const ProtectedRoute = ({
  children,
  featureCode,
  requiredRoles,
}: ProtectedRouteProps) => {
  const { loading } = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const { toast } = useToast();
  const deniedToastShown = useRef(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasAccess(false);
        return;
      }

      // Check if admin is required
      if (requiredRoles && requiredRoles.includes("admin")) {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        
        if (error || data !== true) {
          setHasAccess(false);
          return;
        }
      }

      // All authenticated users have access (except admin-only pages)
      setHasAccess(true);
    };

    checkAccess();
  }, [loading, requiredRoles]);

  useEffect(() => {
    if (hasAccess === false && !deniedToastShown.current) {
      deniedToastShown.current = true;
      toast({
        variant: "destructive",
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้ โปรดติดต่อผู้ดูแลระบบ",
      });
    }
  }, [hasAccess, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  // Wait until access is determined
  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (hasAccess === false) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};
