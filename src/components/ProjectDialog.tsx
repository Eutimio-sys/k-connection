import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface ProjectDialogProps {
  onSuccess?: () => void;
  companies: any[];
}

const ProjectDialog = ({ onSuccess, companies }: ProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company_id: "",
    location: "",
    description: "",
    start_date: "",
    end_date: "",
    budget: "",
    status: "planning",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("projects").insert({
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      created_by: user.id,
    });

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("สร้างโครงการสำเร็จ");
      setOpen(false);
      setFormData({ name: "", company_id: "", location: "", description: "", start_date: "", end_date: "", budget: "", status: "planning" });
      onSuccess?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={20} />
          สร้างโครงการใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สร้างโครงการใหม่</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>ชื่อโครงการ *</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>

            <div>
              <Label>บริษัท *</Label>
              <Select value={formData.company_id} onValueChange={v => setFormData({...formData, company_id: v})} required>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบริษัท" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>สถานะ</Label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">วางแผน</SelectItem>
                  <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                  <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                  <SelectItem value="on_hold">พักงาน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>สถานที่</Label>
              <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>

            <div>
              <Label>วันที่เริ่ม</Label>
              <Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            </div>

            <div>
              <Label>วันที่สิ้นสุด</Label>
              <Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>

            <div className="col-span-2">
              <Label>งบประมาณ (บาท)</Label>
              <Input type="number" step="0.01" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
            </div>

            <div className="col-span-2">
              <Label>รายละเอียด</Label>
              <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={loading}>{loading ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDialog;
