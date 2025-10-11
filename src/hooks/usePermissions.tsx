import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PermissionMap {
  [featureCode: string]: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setPermissions({});
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Check if admin
        const { data: adminCheck } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (adminCheck === true) {
          setIsAdmin(true);
          // Admin has all permissions - set a flag
          setPermissions({ __admin__: true });
          setLoading(false);
          return;
        }

        // Get effective permissions for non-admin users
        const { data: perms, error } = await (supabase.rpc as any)('get_effective_permissions', {
          _user_id: user.id
        });

        if (error) {
          console.error('Error loading permissions:', error);
          setPermissions({});
        } else {
          const permMap: PermissionMap = {};
          if (Array.isArray(perms)) {
            perms.forEach((p: { feature_code: string; can_access: boolean }) => {
              permMap[p.feature_code] = p.can_access;
            });
          }
          setPermissions(permMap);
        }
      } catch (err) {
        console.error('Failed to load permissions:', err);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const hasPermission = (featureCode: string): boolean => {
    if (isAdmin) return true;
    return permissions[featureCode] === true;
  };

  const hasAnyRole = async (roles: string[]): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await (supabase.rpc as any)('has_any_role', {
        _user_id: user.id,
        _roles: roles
      });
      return data === true;
    } catch {
      return false;
    }
  };

  return {
    permissions,
    isAdmin,
    loading,
    hasPermission,
    hasAnyRole,
  };
};
