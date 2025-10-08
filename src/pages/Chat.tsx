import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Send, Paperclip, X } from "lucide-react";

interface Message {
  id: string;
  message: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  user_id: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "แชทรวม | ระบบบริหารงาน";
    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('general_chat')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'general_chat',
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    const { data: rows, error } = await supabase
      .from('general_chat')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const messages = (rows || []) as Message[];
    setMessages(messages);

    // Load sender names
    const userIds = Array.from(new Set(messages.map((m) => m.user_id).filter(Boolean)));
    if (userIds.length) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      if (!profilesError && profilesData) {
        const map = Object.fromEntries(profilesData.map((p: any) => [p.id, p.full_name]));
        setProfileMap(map);
      }
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string } | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error } = await supabase.storage
      .from('general_chat_files')
      .upload(fileName, file);

    if (error || !uploadData) {
      toast({ title: 'ไม่สามารถอัปโหลดไฟล์ได้', variant: 'destructive' });
      return null;
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('general_chat_files')
      .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7);

    if (signErr || !signed?.signedUrl) {
      toast({ title: 'ไม่สามารถสร้างลิงก์ไฟล์ได้', variant: 'destructive' });
      return null;
    }

    return { url: signed.signedUrl, type: fileType };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let fileUrl = null;
    let fileName = null;
    let fileType = null;

    if (file) {
      const result = await uploadFile(file);
      if (!result) return;
      fileUrl = result.url;
      fileName = file.name;
      fileType = result.type;
    }

    const { error } = await supabase.from('general_chat').insert({
      user_id: user.id,
      message: newMessage.trim() || '(ส่งไฟล์)',
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
    });

    if (error) {
      toast({ title: 'ไม่สามารถส่งข้อความได้', variant: 'destructive' });
      return;
    }

    setNewMessage('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    await fetchMessages();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const isImageFile = (fileName: string | null, fileType: string | null) => {
    if (fileType === 'image') return true;
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
  };

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-4xl font-bold">แชทรวม</h1>
      </header>

      <Card className="h-[calc(100vh-200px)] flex flex-col">
        <CardHeader>
          <CardTitle>ห้องสนทนากลาง</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {profileMap[msg.user_id] || 'ไม่ทราบผู้ส่ง'} • {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm', { locale: th })}
                  </div>
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    <p className="text-sm">{msg.message}</p>
                    
                    {msg.file_url && isImageFile(msg.file_name, msg.file_type) && (
                      <div className="mt-2">
                        <img 
                          src={msg.file_url} 
                          alt={msg.file_name || 'รูปภาพ'} 
                          className="max-w-sm max-h-64 rounded-lg border object-cover cursor-pointer"
                          onClick={() => window.open(msg.file_url!, '_blank')}
                        />
                      </div>
                    )}
                    
                    {msg.file_url && !isImageFile(msg.file_name, msg.file_type) && (
                      <div className="flex items-center gap-2 p-2 bg-background rounded border">
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm flex-1">{msg.file_name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(msg.file_url!, '_blank')}
                        >
                          เปิด
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-2">
            {file && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Paperclip className="w-4 h-4" />
                <span className="text-sm flex-1">{file.name}</span>
                <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <Input
                placeholder="พิมพ์ข้อความ..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              
              <Button onClick={handleSendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
