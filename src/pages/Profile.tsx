import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, MapPin, Calendar, Briefcase, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    date_of_birth: "",
    position: "",
    department: "",
    id_card: "",
    emergency_contact: "",
    emergency_phone: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

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
        setFormData({
          full_name: data.full_name || "",
          phone: data.phone || "",
          address: data.address || "",
          date_of_birth: data.date_of_birth || "",
          position: data.position || "",
          department: data.department || "",
          id_card: data.id_card || "",
          emergency_contact: data.emergency_contact || "",
          emergency_phone: data.emergency_phone || "",
        });
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update(formData)
        .eq("id", user.id);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("บันทึกข้อมูลสำเร็จ");
        fetchProfile();
      }
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          โปรไฟล์ของฉัน
        </h1>
        <p className="text-muted-foreground text-lg">จัดการข้อมูลส่วนตัวของคุณ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">ชื่อ-นามสกุล *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="id_card">เลขบัตรประชาชน</Label>
                <Input
                  id="id_card"
                  value={formData.id_card}
                  onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
                  placeholder="X-XXXX-XXXXX-XX-X"
                />
              </div>

              <div>
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0XX-XXX-XXXX"
                />
              </div>

              <div>
                <Label htmlFor="date_of_birth">วันเกิด</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="position">ตำแหน่ง</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="department">แผนก</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">ที่อยู่</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
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
                <Label htmlFor="emergency_contact">ชื่อผู้ติดต่อ</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="ชื่อ-นามสกุล"
                />
              </div>
              <div>
                <Label htmlFor="emergency_phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                  placeholder="0XX-XXX-XXXX"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </Button>
      </div>
    </div>
  );
};

export default Profile;