import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
  canEdit: boolean;
}

interface Profile {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  name: string;
}

export function TaskDetailDialog({ taskId, open, onOpenChange, onTaskUpdated, canEdit }: TaskDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignees, setAssignees] = useState<Profile[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [task, setTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    project_id: "",
    due_time: "17:00",
    created_by_name: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open && taskId) {
      fetchTaskDetails();
      fetchProjects();
      fetchUsers();
    }
  }, [open, taskId]);

  const fetchTaskDetails = async () => {
    if (!taskId) return;

    const { data: taskData } = await supabase
      .from("tasks")
      .select(`
        *,
        profiles!tasks_created_by_fkey(full_name)
      `)
      .eq("id", taskId)
      .single();

    if (taskData) {
      setTask({
        title: taskData.title,
        description: taskData.description || "",
        priority: taskData.priority,
        status: taskData.status,
        project_id: taskData.project_id,
        due_time: taskData.due_time || "17:00",
        created_by_name: taskData.profiles?.full_name || "",
      });

      // Fetch assignees
      const { data: assigneesData } = await supabase
        .from("task_assignees")
        .select("user_id, profiles(id, full_name)")
        .eq("task_id", taskId);

      if (assigneesData) {
        const assigneeProfiles = assigneesData
          .map((a: any) => a.profiles)
          .filter(Boolean);
        setAssignees(assigneeProfiles);
        setSelectedAssignees(assigneeProfiles.map((p: Profile) => p.id));
      }
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

  const handleAddAssignee = (userId: string) => {
    if (!selectedAssignees.includes(userId)) {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const handleRemoveAssignee = (userId: string) => {
    setSelectedAssignees(selectedAssignees.filter(id => id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) return;

    setLoading(true);

    // Update task
    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        project_id: task.project_id,
        due_time: task.due_time,
      })
      .eq("id", taskId);

    if (taskError) {
      toast({ title: "เกิดข้อผิดพลาด", description: taskError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Update assignees
    // First delete all existing assignees
    await supabase.from("task_assignees").delete().eq("task_id", taskId);

    // Then insert new assignees
    if (selectedAssignees.length > 0) {
      const assigneesData = selectedAssignees.map(userId => ({
        task_id: taskId,
        user_id: userId,
      }));

      const { error: assigneesError } = await supabase
        .from("task_assignees")
        .insert(assigneesData);

      if (assigneesError) {
        toast({ title: "เกิดข้อผิดพลาดในการบันทึกผู้รับผิดชอบ", variant: "destructive" });
      }
    }

    setLoading(false);
    toast({ title: "บันทึกสำเร็จ" });
    onTaskUpdated();
    onOpenChange(false);
  };

  const getSelectedUsers = () => {
    return users.filter(u => selectedAssignees.includes(u.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{canEdit ? "แก้ไขงาน" : "รายละเอียดงาน"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>ชื่องาน</Label>
            <Input
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              required
              disabled={!canEdit}
            />
          </div>

          <div>
            <Label>รายละเอียด</Label>
            <Textarea
              value={task.description}
              onChange={(e) => setTask({ ...task, description: e.target.value })}
              disabled={!canEdit}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>โครงการ</Label>
              <Select
                value={task.project_id}
                onValueChange={(value) => setTask({ ...task, project_id: value })}
                disabled={!canEdit}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="เลือกโครงการ" />
                </SelectTrigger>
                <SelectContent className="bg-background">
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
                value={task.due_time}
                onChange={(e) => setTask({ ...task, due_time: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div>
            <Label>ผู้รับผิดชอบ</Label>
            <div className="space-y-2">
              {canEdit && (
                <Select onValueChange={handleAddAssignee}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="เพิ่มผู้รับผิดชอบ" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
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
                    {canEdit && (
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
                value={task.priority}
                onValueChange={(value) => setTask({ ...task, priority: value })}
                disabled={!canEdit}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="low">ต่ำ</SelectItem>
                  <SelectItem value="medium">ปานกลาง</SelectItem>
                  <SelectItem value="high">สูง</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>สถานะ</Label>
              <Select
                value={task.status}
                onValueChange={(value) => setTask({ ...task, status: value })}
                disabled={!canEdit}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="todo">ยังไม่เริ่ม</SelectItem>
                  <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                  <SelectItem value="done">เสร็จสิ้น</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              มอบหมายโดย: <span className="font-medium text-foreground">{task.created_by_name}</span>
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {canEdit ? "ยกเลิก" : "ปิด"}
            </Button>
            {canEdit && (
              <Button type="submit" disabled={loading}>
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
