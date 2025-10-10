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
    // Listen to auth changes first, then fetch
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Defer to avoid deadlocks per best practices
        setTimeout(() => {
          fetchPermissionsForUser(session.user!.id);
        }, 0);
      } else {
        // No session; reset to minimal state
        setRole("worker");
        setPermissions({});
        setLoading(false);
      }
    });

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchPermissionsForUser(session.user.id);
      } else {
        setRole("worker");
        setPermissions({});
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPermissionsForUser = async (userId: string) => {
    try {
      // Get user roles from user_roles table
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!userRoles || userRoles.length === 0) {
        // Default to worker role if none assigned
        const fallbackRole = "worker";
        setRole(fallbackRole);
        const { data: rolePermissions } = await supabase
          .from("role_permissions")
          .select("feature_code, can_access")
          .in("role", [fallbackRole]);
        const { data: userPermissions } = await supabase
          .from("user_permissions")
          .select("feature_code, can_access")
          .eq("user_id", userId);
        const permissionsMap: Record<string, boolean> = {};
        rolePermissions?.forEach((perm) => {
          permissionsMap[perm.feature_code] =
            permissionsMap[perm.feature_code] === true || perm.can_access === true;
        });
        userPermissions?.forEach((perm) => {
          permissionsMap[perm.feature_code] = perm.can_access;
        });
        setPermissions(permissionsMap);
        // Debug: summarize permissions
        console.log("usePermissions(fallback)", { userId, role: fallbackRole, features: Object.keys(permissionsMap) });
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
        .eq("user_id", userId);

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
      console.log("usePermissions", { userId, roles: allRoles, primaryRole, features: Object.keys(permissionsMap) });
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
