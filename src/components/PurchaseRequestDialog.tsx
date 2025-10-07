import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface PurchaseRequestDialogProps {
  onSuccess?: () => void;
}

const PurchaseRequestDialog = ({ onSuccess }: PurchaseRequestDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    category_id: "",
    item_name: "",
    description: "",
    quantity: "",
    unit: "",
    estimated_price: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      supabase.from("projects").select("id, name").eq("status", "in_progress").then(({ data }) => setProjects(data || []));
      supabase.from("expense_categories").select("*").eq("is_active", true).then(({ data }) => setCategories(data || []));
      supabase.from("profiles").select("id, full_name, role").in("role", ["admin", "manager"]).then(({ data }) => setApprovers(data || []));
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

    const { data: request, error } = await supabase.from("purchase_requests").insert({
      ...formData,
      quantity: parseFloat(formData.quantity),
      estimated_price: parseFloat(formData.estimated_price),
      requested_by: user.id,
    }).select().single();

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      setLoading(false);
      return;
    }

    // Insert approvers
    if (selectedApprovers.length > 0 && request) {
      const approverRecords = selectedApprovers.map(approverId => ({
        purchase_request_id: request.id,
        approver_id: approverId,
      }));
      
      const { error: approverError } = await supabase
        .from("purchase_request_approvers")
        .insert(approverRecords);

      if (approverError) {
        toast.error("เกิดข้อผิดพลาดในการเพิ่มผู้อนุมัติ");
        setLoading(false);
        return;
      }
    }

    toast.success("สร้างใบขอซื้อสำเร็จ");
    setOpen(false);
    setFormData({ project_id: "", category_id: "", item_name: "", description: "", quantity: "", unit: "", estimated_price: "", notes: "" });
    setSelectedApprovers([]);
    onSuccess?.();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={20} />
          สร้างใบขอซื้อ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สร้างใบขอซื้อใหม่</DialogTitle>
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
              <Label>หมวดหมู่ *</Label>
              <Select value={formData.category_id} onValueChange={v => setFormData({...formData, category_id: v})} required>
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

            <div className="col-span-2">
              <Label>ชื่อรายการ *</Label>
              <Input value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} required />
            </div>

            <div>
              <Label>จำนวน *</Label>
              <Input type="number" step="0.01" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
            </div>

            <div>
              <Label>หน่วย *</Label>
              <Input value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="เช่น ชิ้น, กก., เมตร" required />
            </div>

            <div className="col-span-2">
              <Label>ราคาประมาณการ (บาท) *</Label>
              <Input type="number" step="0.01" value={formData.estimated_price} onChange={e => setFormData({...formData, estimated_price: e.target.value})} required />
            </div>

            <div className="col-span-2">
              <Label>รายละเอียด</Label>
              <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} />
            </div>

            <div className="col-span-2">
              <Label>หมายเหตุ</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} />
            </div>

            <div className="col-span-2">
              <Label>ผู้อนุมัติ (เลือกได้หลายคน)</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {approvers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">ไม่มีผู้อนุมัติในระบบ</p>
                ) : (
                  approvers.map(approver => (
                    <label key={approver.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedApprovers.includes(approver.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApprovers([...selectedApprovers, approver.id]);
                          } else {
                            setSelectedApprovers(selectedApprovers.filter(id => id !== approver.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{approver.full_name} ({approver.role})</span>
                    </label>
                  ))
                )}
              </div>
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

export default PurchaseRequestDialog;
