import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface DailyPaymentDialogProps {
  onSuccess?: () => void;
}

const DailyPaymentDialog = ({ onSuccess }: DailyPaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    worker_id: "",
    category_id: "",
    payment_date: new Date().toISOString().split('T')[0],
    amount: "",
    description: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      supabase.from("projects").select("id, name").eq("status", "in_progress").then(({ data }) => setProjects(data || []));
      supabase.from("workers").select("*").eq("is_active", true).then(({ data }) => setWorkers(data || []));
      supabase.from("expense_categories").select("*").eq("is_active", true).then(({ data }) => setCategories(data || []));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("daily_payments").insert({
      ...formData,
      amount: parseFloat(formData.amount),
      created_by: user.id,
    });

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("สร้างรายการจ่ายเงินสำเร็จ");
      setOpen(false);
      setFormData({
        project_id: "",
        worker_id: "",
        category_id: "",
        payment_date: new Date().toISOString().split('T')[0],
        amount: "",
        description: "",
        notes: "",
      });
      onSuccess?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={20} />
          เพิ่มรายการจ่ายเงิน
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มรายการจ่ายเงินใหม่</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>โครงการ *</Label>
              <Select value={formData.project_id} onValueChange={v => setFormData({...formData, project_id: v})} required>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกโครงการ" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>ช่าง</Label>
              <Select value={formData.worker_id} onValueChange={v => setFormData({...formData, worker_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกช่าง (ถ้ามี)" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.full_name} {w.daily_rate ? `(฿${w.daily_rate}/วัน)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>หมวดหมู่</Label>
              <Select value={formData.category_id} onValueChange={v => setFormData({...formData, category_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>วันที่จ่าย *</Label>
              <Input 
                type="date" 
                value={formData.payment_date} 
                onChange={e => setFormData({...formData, payment_date: e.target.value})} 
                required 
              />
            </div>

            <div className="col-span-2">
              <Label>จำนวนเงิน (บาท) *</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
                required 
              />
            </div>

            <div className="col-span-2">
              <Label>รายละเอียด</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                rows={2} 
                placeholder="ระบุรายละเอียดการจ่ายเงิน"
              />
            </div>

            <div className="col-span-2">
              <Label>หมายเหตุ</Label>
              <Textarea 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                rows={2} 
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DailyPaymentDialog;
