import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  featureCode?: string;
  requiredRoles?: string[];
}

export const ROLE_FEATURES: Record<string, string[]> = {
  admin: ["*"],
  manager: [
    "dashboard","projects","tasks","approvals","expenses","labor_expenses",
    "daily_payments","accounting","payroll","attendance","leave_management",
    "hr_management","foreign_workers","employees","settings"
  ],
  purchaser: [
    "dashboard","projects","expenses","labor_expenses","daily_payments",
    "accounting","attendance","leave_management","foreign_workers","settings"
  ],
  project_manager: [
    "dashboard","projects","tasks","approvals","expenses","labor_expenses",
    "daily_payments","attendance","leave_management"
  ],
  foreman: [
    "dashboard","projects","tasks","daily_payments","attendance","leave_management"
  ],
  worker: [
    "dashboard","projects","tasks","attendance","leave_management"
  ],
};

export const ProtectedRoute = ({
  children,
  featureCode,
  requiredRoles,
}: ProtectedRouteProps) => {
  const { role, permissions, loading } = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    // Admin bypass: full access
    if (role === "admin") {
      setHasAccess(true);
      console.log("ProtectedRoute", { role, featureCode, requiredRoles, decision: "admin-bypass" });
      return;
    }

    // Check role-based access
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(role)) {
        setHasAccess(false);
        console.log("ProtectedRoute", { role, featureCode, requiredRoles, decision: "blocked-requiredRoles" });
        return;
      }
    }

    // Check feature-based access
    if (featureCode) {
      const roleAllowed = ROLE_FEATURES[role]?.includes("*") || ROLE_FEATURES[role]?.includes(featureCode);
      const allowed = permissions[featureCode] === true || !!roleAllowed;
      setHasAccess(allowed);
      console.log("ProtectedRoute", {
        role,
        featureCode,
        requiredRoles,
        permissionsKeys: Object.keys(permissions || {}),
        allowed,
        roleAllowed,
      });
    } else {
      setHasAccess(true);
      console.log("ProtectedRoute", { role, featureCode, requiredRoles, decision: "no-featureCode-allow" });
    }
  }, [loading, role, permissions, featureCode, requiredRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  // Immediate bypass for admin to prevent a one-render redirect flicker
  if (role === "admin") {
    return <>{children}</>;
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
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
