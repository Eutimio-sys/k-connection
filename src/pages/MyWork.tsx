import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  project_id: string;
  profiles?: {
    full_name: string;
  };
  projects?: {
    name: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
}

export default function MyWork() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    assigned_to: "",
    project_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
      if (currentUser.role === 'admin' || currentUser.role === 'manager') {
        fetchUsers();
      }
    }
  }, [currentUser, selectedDate]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(data);
      setFormData(prev => ({ ...prev, assigned_to: user.id }));
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name");
    if (data) setUsers(data);
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");
    if (data) setProjects(data);
  };

  const fetchTasks = async () => {
    if (!selectedDate || !currentUser) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from("tasks")
      .select(`
        *,
        profiles!tasks_assigned_to_fkey(full_name),
        projects(name)
      `)
      .gte("due_date", startOfDay.toISOString())
      .lte("due_date", endOfDay.toISOString());

    // If not manager/admin, only show own tasks
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      query = query.eq("assigned_to", currentUser.id);
    }

    const { data } = await query.order("created_at", { ascending: false });
    if (data) setTasks(data as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast({ title: "กรุณาเลือกวันที่", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dueDate = new Date(selectedDate);
    dueDate.setHours(23, 59, 59, 999);

    const { error } = await supabase.from("tasks").insert({
      ...formData,
      due_date: dueDate.toISOString(),
      created_by: user.id,
    });

    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "เพิ่มงานสำเร็จ" });
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        assigned_to: user.id,
        project_id: "",
      });
      fetchTasks();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-4 border-l-red-500";
      case "medium":
        return "border-l-4 border-l-yellow-500";
      default:
        return "border-l-4 border-l-green-500";
    }
  };

  const canAssignToOthers = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">งานของฉัน</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มงาน
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>เพิ่มงานใหม่</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>ชื่องาน</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>รายละเอียด</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>โครงการ</Label>
                    <Select
                      value={formData.project_id}
                      onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    >
                      <SelectTrigger className="bg-background z-50">
                        <SelectValue placeholder="เลือกโครงการ" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {canAssignToOthers && (
                    <div>
                      <Label>มอบหมายให้</Label>
                      <Select
                        value={formData.assigned_to}
                        onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                      >
                        <SelectTrigger className="bg-background z-50">
                          <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ลำดับความสำคัญ</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger className="bg-background z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="low">ต่ำ</SelectItem>
                        <SelectItem value="medium">ปานกลาง</SelectItem>
                        <SelectItem value="high">สูง</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>สถานะ</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-background z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="todo">ยังไม่เริ่ม</SelectItem>
                        <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                        <SelectItem value="done">เสร็จสิ้น</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">บันทึก</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>ปฏิทิน</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={th}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                งานวันที่ {selectedDate && format(selectedDate, "d MMMM yyyy", { locale: th })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">ไม่มีงานในวันนี้</p>
              ) : (
                tasks.map((task) => (
                  <Card key={task.id} className={`${getPriorityColor(task.priority)}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <h3 className="font-semibold">{task.title}</h3>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {task.projects && (
                              <span className="bg-muted px-2 py-1 rounded">
                                โครงการ: {task.projects.name}
                              </span>
                            )}
                            {task.profiles && (
                              <span className="bg-muted px-2 py-1 rounded">
                                ผู้รับผิดชอบ: {task.profiles.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
