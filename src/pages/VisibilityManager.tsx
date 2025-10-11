import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureVisibility } from '@/contexts/FeatureVisibilityContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Feature {
  code: string;
  name: string;
  category: string;
}

interface UserVisibility {
  feature_code: string;
  can_view: boolean;
}

export default function VisibilityManager() {
  const { isAdmin, loading: contextLoading } = useFeatureVisibility();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const LAST_SELECTED_KEY = 'visibility_manager_last_user';
  const [selectedUserId, setSelectedUserId] = useState<string>(() => localStorage.getItem(LAST_SELECTED_KEY) || '');
  const [userVisibility, setUserVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load non-admin users
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('is_active', true);

        if (profilesError) {
          throw profilesError;
        }

        if (profiles) {
          // Filter out admins
          const nonAdminUsers = [];
          for (const profile of profiles) {
            const { data: isAdminCheck } = await supabase.rpc('has_role', {
              _user_id: profile.id,
              _role: 'admin'
            });
            if (!isAdminCheck) {
              nonAdminUsers.push(profile);
            }
          }
          setUsers(nonAdminUsers);
        }

        // Load features
        const { data: featuresData, error: featuresError } = await supabase
          .from('features')
          .select('code, name, category')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (featuresError) {
          throw featuresError;
        }

        setFeatures(featuresData || []);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setLoading(false);
      }
    };

    // Only load if context is ready
    if (!contextLoading) {
      if (isAdmin) {
        loadData();
      } else {
        setLoading(false);
      }
    }
  }, [isAdmin, contextLoading]);

  const refreshUserVisibility = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_feature_visibility')
        .select('feature_code, can_view')
        .eq('user_id', userId);

      const visibilityMap: Record<string, boolean> = {};
      data?.forEach((v: UserVisibility) => {
        visibilityMap[v.feature_code] = v.can_view;
      });
      setUserVisibility(visibilityMap);
    } catch (error) {
      console.error('Error loading user visibility:', error);
      setUserVisibility({});
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      refreshUserVisibility(selectedUserId);
    } else {
      setUserVisibility({});
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      localStorage.setItem(LAST_SELECTED_KEY, selectedUserId);
    } else {
      localStorage.removeItem(LAST_SELECTED_KEY);
    }
  }, [selectedUserId]);

  const handleToggle = (featureCode: string, checked: boolean) => {
    setUserVisibility(prev => ({
      ...prev,
      [featureCode]: checked
    }));
  };

  const handleSave = async () => {
    if (!selectedUserId) return;

    setSaving(true);
    try {
      // Delete all existing visibility for this user
      await supabase
        .from('user_feature_visibility')
        .delete()
        .eq('user_id', selectedUserId);

      // Insert new visibility settings
      const visibilityRecords = Object.entries(userVisibility)
        .filter(([_, canView]) => canView)
        .map(([feature_code]) => ({
          user_id: selectedUserId,
          feature_code,
          can_view: true
        }));

      if (visibilityRecords.length > 0) {
        await supabase
          .from('user_feature_visibility')
          .insert(visibilityRecords);
      }

      // Reload to reflect saved state
      await refreshUserVisibility(selectedUserId);

      toast({
        title: 'บันทึกสำเร็จ',
        description: 'อัปเดตสิทธิ์การมองเห็นเรียบร้อยแล้ว',
      });
    } catch (error) {
      console.error('Error saving visibility:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card>
            <CardHeader>
              <CardTitle>ไม่มีสิทธิ์เข้าถึง</CardTitle>
              <CardDescription>หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card>
            <CardHeader>
              <CardTitle>เกิดข้อผิดพลาด</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>โหลดใหม่</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">จัดการสิทธิ์การมองเห็นฟีเจอร์</h1>
          <p className="text-muted-foreground">
            เลือกผู้ใช้และกำหนดว่าสามารถเห็นฟีเจอร์ไหนได้บ้าง
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>เลือกผู้ใช้</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกผู้ใช้..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedUserId && (
          <Card>
            <CardHeader>
              <CardTitle>ฟีเจอร์ที่สามารถมองเห็นได้</CardTitle>
              <CardDescription>
                เลือกฟีเจอร์ที่ผู้ใช้นี้สามารถเห็นและใช้งานได้
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-semibold text-lg capitalize">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryFeatures.map(feature => (
                      <div key={feature.code} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature.code}
                          checked={userVisibility[feature.code] || false}
                          onCheckedChange={(checked) => handleToggle(feature.code, checked as boolean)}
                        />
                        <label
                          htmlFor={feature.code}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {feature.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  บันทึกการตั้งค่า
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
