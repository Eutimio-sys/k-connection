import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LeaveBalanceManager } from "./LeaveBalanceManager";

interface EmployeeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  onSuccess: () => void;
}

export const EmployeeEditDialog = ({ open, onOpenChange, employee, onSuccess }: EmployeeEditDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: employee?.full_name || "",
    phone: employee?.phone || "",
    address: employee?.address || "",
    date_of_birth: employee?.date_of_birth || "",
    position: employee?.position || "",
    department: employee?.department || "",
    id_card: employee?.id_card || "",
    emergency_contact: employee?.emergency_contact || "",
    emergency_phone: employee?.emergency_phone || "",
    hire_date: employee?.hire_date || "",
    role: employee?.role || "worker",
  });

  useEffect(() => {
    if (employee?.id) {
      fetchLeaveBalance();
    }
  }, [employee]);

  const fetchLeaveBalance = async () => {
    const currentYear = new Date().getFullYear();
    const { data } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("user_id", employee.id)
      .eq("year", currentYear)
      .maybeSingle();
    setLeaveBalance(data);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update(formData)
      .eq("id", employee.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("บันทึกข้อมูลสำเร็จ");
      onSuccess();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>แก้ไขข้อมูลพนักงาน</DialogTitle>
            {employee?.id && (
              <LeaveBalanceManager
                userId={employee.id}
                userName={employee.full_name}
                currentBalance={leaveBalance}
                onSuccess={fetchLeaveBalance}
              />
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
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

            <div>
              <Label htmlFor="hire_date">วันที่เริ่มงาน</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="role">บทบาท</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">พนักงาน</SelectItem>
                  <SelectItem value="purchaser">จัดซื้อ</SelectItem>
                  <SelectItem value="accountant">บัญชี</SelectItem>
                  <SelectItem value="manager">ผู้จัดการ</SelectItem>
                  <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergency_contact">ผู้ติดต่อฉุกเฉิน</Label>
              <Input
                id="emergency_contact"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div>
              <Label htmlFor="emergency_phone">เบอร์โทรฉุกเฉิน</Label>
              <Input
                id="emergency_phone"
                value={formData.emergency_phone}
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                placeholder="0XX-XXX-XXXX"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
