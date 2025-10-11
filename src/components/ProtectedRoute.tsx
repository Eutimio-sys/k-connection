import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { AccessDenied } from "./AccessDenied";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  featureCode?: string;
  requiredRoles?: string[];
  projectId?: string;
}

export const ProtectedRoute = ({
  children,
  featureCode,
  requiredRoles,
  projectId,
}: ProtectedRouteProps) => {
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const { toast } = useToast();
  const deniedToastShown = useRef(false);
  const { isAdmin, hasPermission, loading: permLoading } = usePermissions();

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!user) {
          if (isMounted) setHasAccess(false);
          return;
        }

        // Check role-based access
        if (requiredRoles && requiredRoles.length > 0) {
          const { data, error } = await (supabase.rpc as any)('has_any_role', {
            _user_id: user.id,
            _roles: requiredRoles
          });
          if (error || data !== true) {
            if (isMounted) setHasAccess(false);
            return;
          }
        }

        // Check feature-based access
        if (featureCode) {
          if (!isAdmin && !hasPermission(featureCode)) {
            if (isMounted) setHasAccess(false);
            return;
          }
        }

        // Check project access
        if (projectId) {
          if (!isAdmin) {
            const { data: access } = await supabase
              .from('project_access')
              .select('id')
              .eq('project_id', projectId)
              .eq('user_id', user.id)
              .single();
            
            if (!access) {
              if (isMounted) setHasAccess(false);
              return;
            }
          }
        }

        if (isMounted) setHasAccess(true);
      } catch (err) {
        console.error('ProtectedRoute check failed:', err);
        if (isMounted) setHasAccess(false);
      } finally {
        if (isMounted) setChecking(false);
      }
    };

    if (!permLoading) {
      checkAccess();
    }

    return () => {
      isMounted = false;
    };
  }, [requiredRoles, featureCode, projectId, isAdmin, hasPermission, permLoading]);

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

  if (checking || permLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

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
