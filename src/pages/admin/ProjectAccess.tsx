import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export default function ProjectAccess() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectAccess, setProjectAccess] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectAccess(selectedProject);
    }
  }, [selectedProject]);

  const loadData = async () => {
    try {
      const { data: projData } = await supabase.from('projects').select('id, name');
      const { data: userData } = await supabase.from('profiles').select('id, full_name, email').eq('is_active', true);

      if (projData) setProjects(projData);
      if (userData) setUsers(userData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectAccess = async (projectId: string) => {
    try {
      const { data } = await supabase.from('project_access').select('user_id').eq('project_id', projectId);
      const accessMap: Record<string, boolean> = {};
      data?.forEach(a => {
        accessMap[a.user_id] = true;
      });
      setProjectAccess(accessMap);
    } catch (error) {
      console.error('Error loading project access:', error);
    }
  };

  const handleToggle = (userId: string, checked: boolean) => {
    setProjectAccess(prev => ({ ...prev, [userId]: checked }));
  };

  const handleSave = async () => {
    if (!selectedProject) return;

    try {
      await supabase.from('project_access').delete().eq('project_id', selectedProject);
      const records = Object.entries(projectAccess)
        .filter(([_, access]) => access)
        .map(([userId]) => ({ project_id: selectedProject, user_id: userId }));

      if (records.length > 0) {
        await supabase.from('project_access').insert(records);
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
        <h1 className="text-2xl font-bold">จัดการสิทธิ์โครงการ</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>เลือกโครงการ</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกโครงการ" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>สิทธิ์ผู้ใช้</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map(user => (
                <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-accent rounded">
                  <Checkbox
                    checked={projectAccess[user.id] || false}
                    onCheckedChange={(checked) => handleToggle(user.id, checked as boolean)}
                  />
                  <div>
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-6">
              <Button onClick={handleSave}>บันทึก</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
