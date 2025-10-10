import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Send, Paperclip, X, AtSign } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

interface Message {
  id: string;
  message: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  user_id: string;
  mentioned_users?: string[];
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Project {
  id: string;
  name: string;
}

const getUserColor = (userId: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500',
  ];
  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("general");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "แชทรวม | ระบบบริหารงาน";
    fetchProjects();
    getCurrentUser();
  }, []);

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time updates
    const tableName = selectedProjectId === "general" ? "general_chat" : "project_messages";
    const channel = supabase
      .channel(`chat_${selectedProjectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(selectedProjectId !== "general" && { filter: `project_id=eq.${selectedProjectId}` })
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProjectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Clear message and focus input when switching rooms
    setNewMessage('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Small delay to ensure input is ready
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [selectedProjectId]);

  useEffect(() => {
    // Mark current room as read to clear unread badges
    const markRead = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const key = selectedProjectId === 'general'
        ? `lastReadChat_general_${user.id}`
        : `lastReadChat_project_${selectedProjectId}_${user.id}`;
      localStorage.setItem(key, new Date().toISOString());
      window.dispatchEvent(new Event('chat-read'));
    };
    markRead();
  }, [selectedProjectId, messages]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name').order('name');
    if (data) setProjects(data);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    let query;
    
    if (selectedProjectId === "general") {
      query = supabase
        .from('general_chat')
        .select('*')
        .order('created_at', { ascending: true });
    } else {
      query = supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: true });
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const messages = (rows || []) as Message[];
    setMessages(messages);

    // Load sender profiles with avatars
    const userIds = Array.from(new Set(messages.map((m) => m.user_id).filter(Boolean)));
    if (userIds.length) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      if (!profilesError && profilesData) {
        const map: Record<string, Profile> = {};
        profilesData.forEach((p: any) => {
          map[p.id] = {
            id: p.id,
            full_name: p.full_name,
            avatar_url: p.avatar_url
          };
        });
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

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]); // userId
    }
    
    return mentions;
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

    const mentionedUsers = extractMentions(newMessage);
    const messageData: any = {
      user_id: user.id,
      message: newMessage.trim() || '(ส่งไฟล์)',
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
    };

    if (selectedProjectId === "general") {
      const { error } = await supabase.from('general_chat').insert(messageData);
      if (error) {
        toast({ title: 'ไม่สามารถส่งข้อความได้', variant: 'destructive' });
        return;
      }
    } else {
      messageData.project_id = selectedProjectId;
      const { error } = await supabase.from('project_messages').insert(messageData);
      if (error) {
        toast({ title: 'ไม่สามารถส่งข้อความได้', variant: 'destructive' });
        return;
      }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setNewMessage(value);
    setCursorPosition(cursorPos);

    // Check for @ mention trigger
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setShowMentionPopover(true);
      } else {
        setShowMentionPopover(false);
      }
    } else {
      setShowMentionPopover(false);
    }
  };

  const insertMention = (profile: Profile) => {
    const textBeforeCursor = newMessage.substring(0, cursorPosition);
    const textAfterCursor = newMessage.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const beforeMention = newMessage.substring(0, lastAtIndex);
    const mention = `@[${profile.full_name}](${profile.id})`;
    const newText = beforeMention + mention + ' ' + textAfterCursor;
    
    setNewMessage(newText);
    setShowMentionPopover(false);
    inputRef.current?.focus();
  };

  const renderMessage = (text: string): React.ReactNode => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const [, name, userId] = match;
      const isCurrentUser = userId === currentUserId;
      
      parts.push(
        <span
          key={match.index}
          className={`font-semibold ${isCurrentUser ? 'bg-primary/20 text-primary' : 'text-blue-500'} px-1 rounded`}
        >
          @{name}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const isImageFile = (fileName: string | null, fileType: string | null) => {
    if (fileType === 'image') return true;
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
  };

  const filteredProfiles = Object.values(profileMap).filter(profile =>
    profile.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between p-8 pb-4">
        <h1 className="text-4xl font-bold">แชทรวม</h1>
        <Select value={selectedProjectId} onValueChange={(v) => { setSelectedProjectId(v); setNewMessage(""); }}>
          <SelectTrigger className="bg-background w-[300px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="general">💬 ห้องสนทนากลาง</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>📁 {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle>
              {selectedProjectId === "general" ? "ห้องสนทนากลาง" : projects.find(p => p.id === selectedProjectId)?.name || "แชทโครงการ"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
              <div className="space-y-4 py-4">
                {messages.map((msg) => {
                  const profile = profileMap[msg.user_id];
                  const userColor = getUserColor(msg.user_id);
                  
                  return (
                    <div key={msg.id} className="flex gap-3">
                      <Avatar className="w-10 h-10">
                        {profile?.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                        ) : (
                          <AvatarFallback className={userColor}>
                            {profile?.full_name.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {profile?.full_name || 'ไม่ทราบผู้ส่ง'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm', { locale: th })}
                          </span>
                        </div>
                        
                        <div className="bg-muted rounded-lg p-3 space-y-2">
                          <p className="text-sm">{renderMessage(msg.message)}</p>
                          
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
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-4 border-t flex-shrink-0 space-y-2">
              {file && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Paperclip className="w-4 h-4" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2 relative">
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

                <Popover open={showMentionPopover} onOpenChange={setShowMentionPopover}>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="outline" type="button">
                      <AtSign className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[300px] p-0 bg-popover z-50" 
                    align="start"
                    side="top"
                    sideOffset={5}
                  >
                    <Command className="bg-popover">
                      <CommandInput placeholder="ค้นหาผู้ใช้..." className="bg-popover" />
                      <CommandEmpty className="py-6 text-center text-sm">ไม่พบผู้ใช้</CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-auto">
                        {filteredProfiles.map((profile) => (
                          <CommandItem
                            key={profile.id}
                            onSelect={() => insertMention(profile)}
                            className="flex items-center gap-2 cursor-pointer hover:bg-accent"
                          >
                            <Avatar className="w-6 h-6">
                              {profile.avatar_url ? (
                                <AvatarImage src={profile.avatar_url} />
                              ) : (
                                <AvatarFallback className={getUserColor(profile.id)}>
                                  {profile.full_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span>{profile.full_name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Input
                  ref={inputRef}
                  placeholder="พิมพ์ข้อความ... (ใช้ @ เพื่อแท็กผู้ใช้)"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && !showMentionPopover && handleSendMessage()}
                  className="flex-1"
                />
                
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() && !file}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
