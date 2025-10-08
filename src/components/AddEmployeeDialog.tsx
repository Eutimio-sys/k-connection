import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface AddEmployeeDialogProps {
  onSuccess: () => void;
  companies: any[];
}

export default function AddEmployeeDialog({ onSuccess, companies }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    address: "",
    position: "",
    department: "",
    id_card: "",
    emergency_contact: "",
    emergency_phone: "",
    hire_date: "",
    date_of_birth: "",
    company_id: "",
    salary: "",
  });

  const handleSubmit = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น");
      return;
    }

    setSaving(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with additional info
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            address: formData.address,
            position: formData.position,
            department: formData.department,
            id_card: formData.id_card,
            emergency_contact: formData.emergency_contact,
            emergency_phone: formData.emergency_phone,
            hire_date: formData.hire_date || null,
            date_of_birth: formData.date_of_birth || null,
            company_id: formData.company_id || null,
          })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;

        // Create initial salary record if salary is provided
        if (formData.salary && parseFloat(formData.salary) > 0) {
          const { error: salaryError } = await supabase
            .from("salary_records")
            .insert({
              user_id: authData.user.id,
              salary_amount: parseFloat(formData.salary),
              effective_date: formData.hire_date || new Date().toISOString().split('T')[0],
              created_by: authData.user.id,
            });

          if (salaryError) throw salaryError;
        }

        toast.success("เพิ่มพนักงานสำเร็จ");
        setOpen(false);
        setFormData({
          email: "",
          password: "",
          full_name: "",
          phone: "",
          address: "",
          position: "",
          department: "",
          id_card: "",
          emergency_contact: "",
          emergency_phone: "",
          hire_date: "",
          date_of_birth: "",
          company_id: "",
          salary: "",
        });
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มพนักงาน
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มพนักงานใหม่</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>อีเมล *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>รหัสผ่าน *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ชื่อ-นามสกุล *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>เบอร์โทร</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ตำแหน่ง</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            <div>
              <Label>แผนก</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>บริษัท</Label>
              <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบริษัท" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>เงินเดือน</Label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>เลขบัตรประชาชน</Label>
              <Input
                value={formData.id_card}
                onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
              />
            </div>
            <div>
              <Label>วันเกิด</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>ที่อยู่</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ผู้ติดต่อฉุกเฉิน</Label>
              <Input
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              />
            </div>
            <div>
              <Label>เบอร์ติดต่อฉุกเฉิน</Label>
              <Input
                value={formData.emergency_phone}
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>วันที่เริ่มงาน</Label>
            <Input
              type="date"
              value={formData.hire_date}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
