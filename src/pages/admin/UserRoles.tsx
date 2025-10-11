import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const ROLES = ['admin', 'manager', 'accountant', 'purchaser', 'worker'];

export default function UserRoles() {
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').eq('is_active', true);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');

      if (profiles) setUsers(profiles);

      const rolesMap: Record<string, string[]> = {};
      roles?.forEach((r: UserRole) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (userId: string, role: string, checked: boolean) => {
    setUserRoles(prev => {
      const current = prev[userId] || [];
      return {
        ...prev,
        [userId]: checked ? [...current, role] : current.filter(r => r !== role)
      };
    });
  };

  const handleSave = async (userId: string) => {
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const roles = userRoles[userId] || [];
      if (roles.length > 0) {
        await supabase.from('user_roles').insert(roles.map(role => ({ user_id: userId, role })));
      }
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
        <h1 className="text-2xl font-bold">จัดการสิทธิ์ผู้ใช้</h1>
      </div>

      <div className="space-y-4">
        {users.map(user => (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle>{user.full_name} ({user.email})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center flex-wrap">
                {ROLES.map(role => (
                  <label key={role} className="flex items-center gap-2">
                    <Checkbox
                      checked={(userRoles[user.id] || []).includes(role)}
                      onCheckedChange={(checked) => handleToggle(user.id, role, checked as boolean)}
                    />
                    <span className="capitalize">{role}</span>
                  </label>
                ))}
                <Button onClick={() => handleSave(user.id)} size="sm">บันทึก</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
