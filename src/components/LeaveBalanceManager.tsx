import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeaveBalanceManagerProps {
  userId: string;
  userName: string;
  currentBalance?: any;
  onSuccess: () => void;
}

export const LeaveBalanceManager = ({ userId, userName, currentBalance, onSuccess }: LeaveBalanceManagerProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    vacation_days: currentBalance?.vacation_days || 6,
    sick_days: currentBalance?.sick_days || 30,
    personal_days: currentBalance?.personal_days || 3,
  });

  const handleSave = async () => {
    const { error } = await supabase
      .from("leave_balances")
      .upsert({
        user_id: userId,
        year: formData.year,
        vacation_days: formData.vacation_days,
        sick_days: formData.sick_days,
        personal_days: formData.personal_days,
      }, {
        onConflict: "user_id,year"
      });

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("ตั้งค่าวันลาสำเร็จ");
      setOpen(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings size={14} className="mr-2" />
          ตั้งค่าวันลา
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ตั้งค่าวันลาเริ่มต้น</DialogTitle>
          <DialogDescription>{userName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>ปี</Label>
            <Input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label>วันลาพักร้อน (วัน)</Label>
            <Input
              type="number"
              value={formData.vacation_days}
              onChange={(e) => setFormData({ ...formData, vacation_days: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label>วันลาป่วย (วัน)</Label>
            <Input
              type="number"
              value={formData.sick_days}
              onChange={(e) => setFormData({ ...formData, sick_days: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label>วันลากิจ (วัน)</Label>
            <Input
              type="number"
              value={formData.personal_days}
              onChange={(e) => setFormData({ ...formData, personal_days: parseFloat(e.target.value) })}
            />
          </div>
          <Button onClick={handleSave} className="w-full">
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
