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
      // Call create-user edge function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
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
          role: 'worker',
        }
      });

      if (error) throw error;

      // Create initial salary record if salary is provided
      if (data?.user && formData.salary && parseFloat(formData.salary) > 0) {
        const { error: salaryError } = await supabase
          .from("salary_records")
          .insert({
            user_id: data.user.id,
            salary_amount: parseFloat(formData.salary),
            effective_date: formData.hire_date || new Date().toISOString().split('T')[0],
            created_by: data.user.id,
          });

        if (salaryError) console.error("Salary record error:", salaryError);
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
    } catch (error: any) {
      console.error("Error creating employee:", error);
      
      // Handle specific error cases
      let errorMessage = "เกิดข้อผิดพลาด";
      
      if (error.message?.includes("already been registered") || error.message?.includes("already registered") || error.message?.includes("email_exists")) {
        errorMessage = "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น หรือลบผู้ใช้เก่าออกจากระบบก่อน";
      } else if (error.message?.includes("email")) {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
