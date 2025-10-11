import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureVisibilityContextType {
  visibleFeatures: Set<string>;
  isAdmin: boolean;
  loading: boolean;
}

const FeatureVisibilityContext = createContext<FeatureVisibilityContextType>({
  visibleFeatures: new Set(),
  isAdmin: false,
  loading: true,
});

export const useFeatureVisibility = () => useContext(FeatureVisibilityContext);

export const FeatureVisibilityProvider = ({ children }: { children: ReactNode }) => {
  const [visibleFeatures, setVisibleFeatures] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVisibility = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Check if user is admin
        const { data: adminCheck } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        setIsAdmin(adminCheck === true);

        if (adminCheck === true) {
          // Admin sees everything
          setVisibleFeatures(new Set(['all']));
        } else {
          // Load user's visibility settings
          const { data: visibility } = await supabase
            .from('user_feature_visibility')
            .select('feature_code')
            .eq('user_id', user.id)
            .eq('can_view', true);

          const features = new Set(visibility?.map(v => v.feature_code) || []);
          setVisibleFeatures(features);
        }
      } catch (error) {
        console.error('Error loading feature visibility:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVisibility();

    // Reload on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadVisibility();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <FeatureVisibilityContext.Provider value={{ visibleFeatures, isAdmin, loading }}>
      {children}
    </FeatureVisibilityContext.Provider>
  );
};
