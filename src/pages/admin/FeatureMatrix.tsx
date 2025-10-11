import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Feature {
  code: string;
  name: string;
  category: string;
}

interface RolePermission {
  role: string;
  feature_code: string;
  can_access: boolean;
}

const ROLES = ['admin', 'manager', 'accountant', 'purchaser', 'worker'];

export default function FeatureMatrix() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: featData } = await supabase.from('features').select('code, name, category').eq('is_active', true);
      const { data: permData } = await supabase.from('role_permissions').select('role, feature_code, can_access');

      if (featData) setFeatures(featData);

      const permMap: Record<string, Record<string, boolean>> = {};
      permData?.forEach((p: RolePermission) => {
        if (!permMap[p.role]) permMap[p.role] = {};
        permMap[p.role][p.feature_code] = p.can_access;
      });
      setPermissions(permMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (role: string, featureCode: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [featureCode]: checked }
    }));
  };

  const handleSave = async () => {
    try {
      const records = [];
      for (const role of ROLES) {
        for (const feature of features) {
          records.push({
            role,
            feature_code: feature.code,
            can_access: permissions[role]?.[feature.code] || false
          });
        }
      }

      await supabase.from('role_permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('role_permissions').insert(records);

      toast({ title: 'บันทึกสำเร็จ' });
    } catch (error) {
      toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-6">กำลังโหลด...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">จัดการสิทธิ์ตามบทบาท</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 text-left">Feature</th>
                  {ROLES.map(role => (
                    <th key={role} className="border p-2 capitalize">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map(feature => (
                  <tr key={feature.code}>
                    <td className="border p-2">{feature.name}</td>
                    {ROLES.map(role => (
                      <td key={role} className="border p-2 text-center">
                        <Checkbox
                          checked={permissions[role]?.[feature.code] || false}
                          onCheckedChange={(checked) => handleToggle(role, feature.code, checked as boolean)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Button onClick={handleSave}>บันทึกทั้งหมด</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
