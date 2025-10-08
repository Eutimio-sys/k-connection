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

      // Get user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      setRole(profile.role);

      // Get role permissions
      const { data: rolePermissions } = await supabase
        .from("role_permissions")
        .select("feature_code, can_access")
        .eq("role", profile.role);

      // Convert to object for easy lookup
      const permissionsMap: Record<string, boolean> = {};
      rolePermissions?.forEach((perm) => {
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
