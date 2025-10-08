import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Send, Paperclip, FileText, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Message {
  id: string;
  message: string;
  file_url: string | null;
  file_name: string | null;
  tagged_task_id: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  };
  tasks?: {
    title: string;
  };
}

interface Task {
  id: string;
  title: string;
}

interface ProjectChatProps {
  projectId: string;
}

export default function ProjectChat({ projectId }: ProjectChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    fetchTasks();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`project_chat_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_messages",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("project_messages")
      .select(`
        *,
        profiles!project_messages_user_id_fkey(full_name),
        tasks!project_messages_tagged_task_id_fkey(title)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data as any);
  };

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("project_id", projectId)
      .order("title");

    if (data) setTasks(data);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("project_chat_files")
      .upload(fileName, file);

    if (error) {
      toast({ title: "ไม่สามารถอัปโหลดไฟล์ได้", variant: "destructive" });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("project_chat_files")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let fileUrl = null;
    let fileName = null;

    if (file) {
      fileUrl = await uploadFile(file);
      if (!fileUrl) return;
      fileName = file.name;
    }

    const { error } = await supabase.from("project_messages").insert({
      project_id: projectId,
      user_id: user.id,
      message: newMessage.trim() || "(ส่งไฟล์)",
      file_url: fileUrl,
      file_name: fileName,
      tagged_task_id: selectedTaskId || null,
    });

    if (error) {
      toast({ title: "ไม่สามารถส่งข้อความได้", variant: "destructive" });
    } else {
      setNewMessage("");
      setFile(null);
      setSelectedTaskId("");
      setIsTagDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>แชทโครงการ</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((msg) => {
              return (
                <div key={msg.id} className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {msg.profiles?.full_name} • {format(new Date(msg.created_at), "HH:mm", { locale: th })}
                  </div>
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    <p className="text-sm">{msg.message}</p>
                    
                    {msg.file_url && msg.file_name && (
                      <div className="flex items-center gap-2 p-2 bg-background rounded border">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm flex-1">{msg.file_name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadFile(msg.file_url!, msg.file_name!)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    {msg.tasks && (
                      <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded inline-block">
                        🏷️ งาน: {msg.tasks.title}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          {file && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <FileText className="w-4 h-4" />
              <span className="text-sm flex-1">{file.name}</span>
              <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                ลบ
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="outline">
                  🏷️
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>แท็กงาน</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>เลือกงาน</Label>
                    <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="เลือกงานที่ต้องการแท็ก" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="">ไม่แท็กงาน</SelectItem>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setIsTagDialogOpen(false)} className="w-full">
                    ตกลง
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Input
              placeholder="พิมพ์ข้อความ..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
            />
            
            <Button onClick={handleSendMessage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
