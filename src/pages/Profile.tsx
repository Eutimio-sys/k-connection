import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Calendar, Briefcase, FileText, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");

  useEffect(() => {
    fetchProfile();
    fetchDocumentTypes();
  }, []);

  const fetchDocumentTypes = async () => {
    const { data } = await supabase
      .from("document_types")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    setDocumentTypes(data || []);
  };

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error("เกิดข้อผิดพลาด");
      } else {
        setProfile(data);
      }

      // Fetch leave balance
      const currentYear = new Date().getFullYear();
      const { data: balanceData } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", currentYear)
        .maybeSingle();

      setLeaveBalance(balanceData);
    }
    setLoading(false);
  };

  // Realtime: refresh profile/leave balance when balances change
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_balances' }, fetchProfile)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  const handleRequestDocument = async () => {
    if (!selectedDocumentType) {
      toast.error("กรุณาเลือกประเภทเอกสาร");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("document_requests")
        .insert({
          user_id: user.id,
          document_type_id: selectedDocumentType,
          notes: documentNotes,
        });

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("ส่งคำขอเอกสารสำเร็จ");
        setDocumentDialogOpen(false);
        setSelectedDocumentType("");
        setDocumentNotes("");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              โปรไฟล์ของฉัน
            </h1>
          </div>
          <p className="text-muted-foreground text-lg ml-14">จัดการข้อมูลส่วนตัวของคุณ</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <FileText size={16} />
                ขอเอกสาร
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ขอเอกสาร</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>ประเภทเอกสาร *</Label>
                  <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภทเอกสาร" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>หมายเหตุ (ถ้ามี)</Label>
                  <Textarea
                    value={documentNotes}
                    onChange={(e) => setDocumentNotes(e.target.value)}
                    rows={3}
                    placeholder="ระบุรายละเอียดเพิ่มเติม เช่น จำนวนชุด หรือความต้องการพิเศษ"
                  />
                </div>

                <Button onClick={handleRequestDocument} className="w-full">
                  ส่งคำขอ
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>ชื่อ-นามสกุล</Label>
                <Input value={profile?.full_name || "-"} disabled />
              </div>

              <div>
                <Label>เลขบัตรประชาชน</Label>
                <Input value={profile?.id_card || "-"} disabled />
              </div>

              <div>
                <Label>เบอร์โทรศัพท์</Label>
                <Input value={profile?.phone || "-"} disabled />
              </div>

              <div>
                <Label>วันเกิด</Label>
                <Input 
                  value={profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString("th-TH") : "-"} 
                  disabled 
                />
              </div>

              <div>
                <Label>ตำแหน่ง</Label>
                <Input value={profile?.position || "-"} disabled />
              </div>

              <div>
                <Label>แผนก</Label>
                <Input value={profile?.department || "-"} disabled />
              </div>
            </div>

            <div>
              <Label>ที่อยู่</Label>
              <Textarea value={profile?.address || "-"} disabled rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลบัญชี</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">อีเมล:</span>
                <span className="font-medium">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Briefcase size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">บทบาท:</span>
                <span className="font-medium">{profile?.role === 'admin' ? 'ผู้ดูแลระบบ' : profile?.role === 'manager' ? 'ผู้จัดการ' : profile?.role === 'accountant' ? 'บัญชี' : profile?.role === 'purchaser' ? 'จัดซื้อ' : 'พนักงาน'}</span>
              </div>
              {profile?.hire_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground">วันที่เริ่มงาน:</span>
                  <span className="font-medium">{new Date(profile.hire_date).toLocaleDateString("th-TH")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ติดต่อฉุกเฉิน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>ชื่อผู้ติดต่อ</Label>
                <Input value={profile?.emergency_contact || "-"} disabled />
              </div>
              <div>
                <Label>เบอร์โทรศัพท์</Label>
                <Input value={profile?.emergency_phone || "-"} disabled />
              </div>
            </CardContent>
          </Card>

          {leaveBalance && (
            <Card>
              <CardHeader>
                <CardTitle>วันลา</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">ลาพักร้อน:</span>
                  <div className="text-right">
                    <p className="font-semibold">
                      ใช้ไป {leaveBalance.vacation_used} / {leaveBalance.vacation_days} วัน
                    </p>
                    <p className="text-xs text-muted-foreground">
                      เหลือ {leaveBalance.vacation_days - leaveBalance.vacation_used} วัน
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">ลาป่วย:</span>
                  <div className="text-right">
                    <p className="font-semibold">
                      ใช้ไป {leaveBalance.sick_used} / {leaveBalance.sick_days} วัน
                    </p>
                    <p className="text-xs text-muted-foreground">
                      เหลือ {leaveBalance.sick_days - leaveBalance.sick_used} วัน
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">ลากิจ:</span>
                  <div className="text-right">
                    <p className="font-semibold">
                      ใช้ไป {leaveBalance.personal_used} / {leaveBalance.personal_days} วัน
                    </p>
                    <p className="text-xs text-muted-foreground">
                      เหลือ {leaveBalance.personal_days - leaveBalance.personal_used} วัน
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;