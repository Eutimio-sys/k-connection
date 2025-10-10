import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserPermissions {
  role: string;
  permissions: Record<string, boolean>;
  loading: boolean;
}

export const usePermissions = (): UserPermissions => {
  const [role, setRole] = useState<string>("worker");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Get user roles from user_roles table
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!userRoles || userRoles.length === 0) {
        setLoading(false);
        return;
      }

      // Use first role as primary role (or admin if exists)
      const primaryRole = userRoles.find(r => r.role === "admin")?.role || userRoles[0].role;
      setRole(primaryRole);

      // Get role permissions for all user's roles
      const allRoles = userRoles.map(r => r.role);
      const { data: rolePermissions } = await supabase
        .from("role_permissions")
        .select("feature_code, can_access")
        .in("role", allRoles);

      // Get user-specific permissions
      const { data: userPermissions } = await supabase
        .from("user_permissions")
        .select("feature_code, can_access")
        .eq("user_id", user.id);

      // Convert to object for easy lookup
      // Priority: user permissions > role permissions
      const permissionsMap: Record<string, boolean> = {};
      
      // First, add role permissions
      rolePermissions?.forEach((perm) => {
        permissionsMap[perm.feature_code] =
          permissionsMap[perm.feature_code] === true || perm.can_access === true;
      });

      // Then, override with user-specific permissions
      userPermissions?.forEach((perm) => {
        permissionsMap[perm.feature_code] = perm.can_access;
      });

      setPermissions(permissionsMap);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  return { role, permissions, loading };
};

// Helper to check if user has access to a feature
export const hasFeatureAccess = (
  permissions: Record<string, boolean>,
  featureCode: string
): boolean => {
  return permissions[featureCode] === true;
};
