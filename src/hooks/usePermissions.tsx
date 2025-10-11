import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserPermissions {
  role: string;
  permissions: Record<string, boolean>;
  loading: boolean;
  isAdmin: boolean;
}

export const usePermissions = (): UserPermissions => {
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || !mounted) {
          setRole(null);
          setPermissions({});
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Check if user is admin first
        const { data: adminCheck } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        
        if (!mounted) return;
        
        const userIsAdmin = adminCheck === true;
        setIsAdmin(userIsAdmin);

        // Get user's primary role
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (!mounted) return;
        setRole(userRoles?.role || null);

        // If admin, grant all permissions
        if (userIsAdmin) {
          setPermissions({});
          setLoading(false);
          return;
        }

        setPermissions({});
        setLoading(false);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        if (mounted) {
          setRole(null);
          setPermissions({});
          setIsAdmin(false);
          setLoading(false);
        }
      }
    };

    fetchPermissions();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchPermissions();
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return { role, permissions, loading, isAdmin };
};

// Helper to check if user has access to a feature
export const hasFeatureAccess = (
  permissions: Record<string, boolean>,
  featureCode: string
): boolean => {
  return permissions[featureCode] === true;
};
