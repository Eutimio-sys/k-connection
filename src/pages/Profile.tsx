import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Calendar, Briefcase, FileText, ArrowLeft, Camera, Lock, History } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import SalaryHistoryDialog from "@/components/SalaryHistoryDialog";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [yearSummary, setYearSummary] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [nickname, setNickname] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);
  
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [salaryHistoryOpen, setSalaryHistoryOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    fetchProfile();
    fetchDocumentTypes();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchYearSummary();
    }
  }, [selectedYear, profile]);

  const fetchDocumentTypes = async () => {
    const { data } = await supabase
      .from("document_types")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    setDocumentTypes(data || []);
  };

  const fetchYearSummary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Fetch tax and social security data for the year
      const { data: taxData } = await supabase
        .from("employee_tax_social_security")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", selectedYear);

      // Fetch salary records for the year
      const { data: salaryData } = await supabase
        .from("salary_records")
        .select("*")
        .eq("user_id", user.id)
        .gte("effective_date", `${selectedYear}-01-01`)
        .lte("effective_date", `${selectedYear}-12-31`)
        .order("effective_date", { ascending: false });

      // Calculate totals
      const totalTax = taxData?.reduce((sum, record) => sum + Number(record.tax_amount), 0) || 0;
      const totalSocialSecurity = taxData?.reduce((sum, record) => sum + Number(record.social_security_amount), 0) || 0;
      
      // Calculate total income (salary * 12 months using latest salary)
      const latestSalary = salaryData && salaryData.length > 0 ? Number(salaryData[0].salary_amount) : 0;
      const totalIncome = latestSalary * 12;

      setYearSummary({
        totalIncome,
        totalTax,
        totalSocialSecurity,
        latestSalary,
        taxRecords: taxData || [],
        salaryRecords: salaryData || []
      });
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setCurrentUserId(user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error("เกิดข้อผิดพลาด");
      } else {
        setProfile(data);
        setNickname(data.nickname || "");
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 2MB');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('อัพโหลดรูปภาพสำเร็จ');
      fetchProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  }

  const handleSaveNickname = async () => {
    try {
      setSavingNickname(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('บันทึกชื่อเล่นสำเร็จ');
      fetchProfile();
    } catch (e: any) {
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setSavingNickname(false);
    }
  };

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
        <Card>
          <CardHeader>
            <CardTitle>รูปโปรไฟล์</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-32 h-32">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                ) : (
                  <AvatarFallback className="text-4xl bg-primary/10">
                    {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 rounded-full"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="w-4 h-4" />
              </Button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">พนักงาน</p>
            </div>
          </CardContent>
        </Card>

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
                <Label>ชื่อเล่น</Label>
                <div className="flex gap-2">
                  <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="เช่น ต้น, โจ้" />
                  <Button onClick={handleSaveNickname} disabled={savingNickname}>
                    บันทึก
                  </Button>
                </div>
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
              <Label>ลักษณะงาน (Job Description)</Label>
              <Input value={profile?.job_description || "-"} disabled />
            </div>

            <div>
              <Label>ธนาคาร</Label>
              <Input value={profile?.bank_name || "-"} disabled />
            </div>

            <div>
              <Label>เลขที่บัญชี</Label>
              <Input value={profile?.bank_account_number || "-"} disabled />
            </div>

            <div className="md:col-span-2">
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
                <span className="font-medium">{roles.length ? roles.map((r) => r === 'admin' ? 'ผู้ดูแลระบบ' : r === 'manager' ? 'ผู้จัดการ' : r === 'accountant' ? 'บัญชี' : r === 'purchaser' ? 'จัดซื้อ' : 'พนักงาน').join(', ') : 'พนักงาน'}</span>
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

          <Card>
            <CardHeader>
              <CardTitle>ความปลอดภัย</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setPasswordDialogOpen(true)}
                className="w-full gap-2"
                variant="outline"
              >
                <Lock size={16} />
                เปลี่ยนรหัสผ่าน
              </Button>
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

        {yearSummary && (
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>สรุปประจำปี</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSalaryHistoryOpen(true)}
                  className="gap-2"
                >
                  <History size={16} />
                  ดูประวัติ
                </Button>
                <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year + 543}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground mb-2">รายได้ทั้งปี</p>
                  <p className="text-3xl font-bold text-primary">
                    ฿{yearSummary.totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    เงินเดือน: ฿{yearSummary.latestSalary.toLocaleString('th-TH', { minimumFractionDigits: 2 })}/เดือน
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-destructive/5 border border-destructive/10">
                  <p className="text-sm text-muted-foreground mb-2">ภาษีทั้งปี</p>
                  <p className="text-3xl font-bold text-destructive">
                    ฿{yearSummary.totalTax.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {yearSummary.taxRecords.length} รายการ
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-accent/5 border border-accent/10">
                  <p className="text-sm text-muted-foreground mb-2">ประกันสังคมทั้งปี</p>
                  <p className="text-3xl font-bold text-accent">
                    ฿{yearSummary.totalSocialSecurity.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {yearSummary.taxRecords.length} รายการ
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/30">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">รายได้สุทธิ (หลังหักภาษีและประกันสังคม):</span>
                  <span className="text-2xl font-bold text-primary">
                    ฿{(yearSummary.totalIncome - yearSummary.totalTax - yearSummary.totalSocialSecurity).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ChangePasswordDialog 
        open={passwordDialogOpen} 
        onOpenChange={setPasswordDialogOpen}
      />
      
      <SalaryHistoryDialog
        open={salaryHistoryOpen}
        onOpenChange={setSalaryHistoryOpen}
        userId={currentUserId}
        year={selectedYear}
      />
    </div>
  );
};

export default Profile;