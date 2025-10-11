import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserPermissions {
  role: string;
  permissions: Record<string, boolean>;
  loading: boolean;
  isAdmin: boolean;
}

export const usePermissions = (): UserPermissions => {
  const [role, setRole] = useState<string>("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchPermissionsForUser = async (userId: string) => {
      try {
        // Get user roles from user_roles table
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        if (!mounted) return;

        if (!userRoles || userRoles.length === 0) {
          setRole("");
          setPermissions({});
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

        if (!mounted) return;

        // Convert to object for easy lookup
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
        setLoading(false);
      } catch (error) {
        console.error("Error fetching permissions:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchPermissionsForUser(session.user.id);
      } else {
        setRole("");
        setPermissions({});
        setLoading(false);
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setTimeout(() => {
          fetchPermissionsForUser(session.user!.id);
        }, 0);
      } else {
        setRole("");
        setPermissions({});
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);


  return { role, permissions, loading, isAdmin: role === 'admin' };
};

// Helper to check if user has access to a feature
export const hasFeatureAccess = (
  permissions: Record<string, boolean>,
  featureCode: string
): boolean => {
  return permissions[featureCode] === true;
};
