import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

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
  const { role, permissions, loading } = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  useEffect(() => {
    if (loading) return;

    // Admin bypass: full access
    if (role === "admin") {
      setHasAccess(true);
      return;
    }

    // Check role-based access
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(role)) {
        setHasAccess(false);
        return;
      }
    }

    // Check feature-based access
    if (featureCode) {
      setHasAccess(permissions[featureCode] === true);
    } else {
      setHasAccess(true);
    }
  }, [loading, role, permissions, featureCode, requiredRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
