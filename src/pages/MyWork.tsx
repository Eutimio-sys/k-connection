import { useState, useEffect, useMemo } from "react";
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
import { Plus, CheckCircle2, Clock, AlertCircle, X } from "lucide-react";

import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  due_time: string;
  assigned_to: string;
  project_id: string;
  created_by: string;
  profiles?: {
    full_name: string;
  };
  projects?: {
    name: string;
  };
  created_by_profile?: {
    full_name: string;
  };
  task_assignees?: Array<{
    profiles: {
      full_name: string;
    };
  }>;
}

interface Profile {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  name: string;
}

export default function MyWork() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [monthAvatars, setMonthAvatars] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    project_id: "",
    due_time: "17:00",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
      checkUserRoleAndFetchUsers();
    }
  }, [currentUser, selectedDate]);

  useEffect(() => {
    if (currentUser) {
      fetchMonthTaskMarkers();
    }
  }, [currentUser, currentMonth]);

  const checkUserRoleAndFetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const hasAdminOrManager = userRoles?.some(r => r.role === 'admin' || r.role === 'manager');
      if (hasAdminOrManager) {
        fetchUsers();
      }
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .single();
      setCurrentUser(data);
      setSelectedAssignees([user.id]);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
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
        projects(name),
        created_by_profile:profiles!tasks_created_by_fkey(full_name),
        task_assignees(profiles(full_name))
      `)
      .gte("due_date", startOfDay.toISOString())
      .lte("due_date", endOfDay.toISOString());

    // Check if user has admin or manager role
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser!.id);
    
    const hasAdminOrManager = userRoles?.some(r => r.role === 'admin' || r.role === 'manager');
    
    // If not manager/admin, only show tasks assigned to them
    if (!hasAdminOrManager) {
      // Get tasks where user is in task_assignees
      const { data: myTaskIds } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", currentUser.id);
      
      if (myTaskIds && myTaskIds.length > 0) {
        const taskIds = myTaskIds.map(t => t.task_id);
        query = query.in("id", taskIds);
      } else {
        // No tasks assigned
        setTasks([]);
        return;
      }
    }

    const { data } = await query.order("due_time", { ascending: true });
    if (data) setTasks(data as any);
  };

  // Fetch avatars for days with tasks in the current month
  const fetchMonthTaskMarkers = async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const start = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        id, due_date,
        task_assignees (
          user_id,
          profiles ( avatar_url )
        )
      `)
      .gte("due_date", start)
      .lte("due_date", end);

    if (error || !data) {
      return;
    }

    const map: Record<string, string[]> = {};
    (data as any[]).forEach((t) => {
      const key = (t.due_date || '').substring(0, 10);
      const urls: string[] = [];
      (t.task_assignees || []).forEach((a: any) => {
        const url = a?.profiles?.avatar_url;
        if (url && !urls.includes(url)) urls.push(url);
      });
      if (urls.length) {
        map[key] = (map[key] || []).concat(urls).slice(0, 3);
      }
    });

    setMonthAvatars(map);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast({ title: "กรุณาเลือกวันที่", variant: "destructive" });
      return;
    }

    if (selectedAssignees.length === 0) {
      toast({ title: "กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dueDate = new Date(selectedDate);
    dueDate.setHours(23, 59, 59, 999);

    // Insert task
    const { data: newTask, error: taskError } = await supabase
      .from("tasks")
      .insert({
        ...formData,
        due_date: dueDate.toISOString(),
        created_by: user.id,
        assigned_to: selectedAssignees[0], // Keep for backward compatibility
      })
      .select()
      .single();

    if (taskError) {
      toast({ title: "เกิดข้อผิดพลาด", description: taskError.message, variant: "destructive" });
      return;
    }

    // Insert task assignees
    if (newTask) {
      const assigneesData = selectedAssignees.map(userId => ({
        task_id: newTask.id,
        user_id: userId,
      }));

      const { error: assigneesError } = await supabase
        .from("task_assignees")
        .insert(assigneesData);

      if (assigneesError) {
        toast({ title: "เกิดข้อผิดพลาดในการบันทึกผู้รับผิดชอบ", variant: "destructive" });
      }
    }

    toast({ title: "เพิ่มงานสำเร็จ" });
    setIsDialogOpen(false);
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      project_id: "",
      due_time: "17:00",
    });
    setSelectedAssignees([user.id]);
    fetchTasks();
  };

  const handleAddAssignee = (userId: string) => {
    if (!selectedAssignees.includes(userId)) {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const handleRemoveAssignee = (userId: string) => {
    setSelectedAssignees(selectedAssignees.filter(id => id !== userId));
  };

  const getSelectedUsers = () => {
    return users.filter(u => selectedAssignees.includes(u.id));
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

  const [canAssignToOthers, setCanAssignToOthers] = useState(false);

  useEffect(() => {
    const checkCanAssign = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        const hasAdminOrManager = userRoles?.some(r => r.role === 'admin' || r.role === 'manager');
        setCanAssignToOthers(!!hasAdminOrManager);
      }
    };
    checkCanAssign();
  }, []);

  return (
    <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">งานของฉัน</h1>
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
                  
                  <div>
                    <Label>เวลา</Label>
                    <Input
                      type="time"
                      value={formData.due_time}
                      onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>ผู้รับผิดชอบ</Label>
                  <div className="space-y-2">
                    {canAssignToOthers && (
                      <Select onValueChange={handleAddAssignee}>
                        <SelectTrigger className="bg-background z-50">
                          <SelectValue placeholder="เพิ่มผู้รับผิดชอบ" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {users
                            .filter(u => !selectedAssignees.includes(u.id))
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {getSelectedUsers().map((user) => (
                        <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                          {user.full_name}
                          {canAssignToOthers && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignee(user.id)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
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
                  <Card 
                    key={task.id} 
                    className={`${getPriorityColor(task.priority)} cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setIsDetailDialogOpen(true);
                    }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <h3 className="font-semibold">{task.title}</h3>
                            {task.due_time && (
                              <span className="text-xs text-muted-foreground">
                                {task.due_time.substring(0, 5)}
                              </span>
                            )}
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
                            {task.created_by_profile && (
                              <span className="bg-muted px-2 py-1 rounded">
                                มอบหมายโดย: {task.created_by_profile.full_name}
                              </span>
                            )}
                            {task.task_assignees && task.task_assignees.length > 0 && (
                              <span className="bg-muted px-2 py-1 rounded">
                                ผู้รับผิดชอบ: {task.task_assignees.map(a => a.profiles.full_name).join(", ")}
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
        
        <TaskDetailDialog
          taskId={selectedTaskId}
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          onTaskUpdated={fetchTasks}
          canEdit={canAssignToOthers}
        />
      </div>
    
  );
}
