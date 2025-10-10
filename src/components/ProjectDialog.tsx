import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface ProjectDialogProps {
  onSuccess?: () => void;
  companies: any[];
  editData?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ProjectDialog = ({ onSuccess, companies, editData, open: controlledOpen, onOpenChange }: ProjectDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [budgetBreakdown, setBudgetBreakdown] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    company_id: "",
    location: "",
    description: "",
    start_date: "",
    end_date: "",
    budget: "",
    status: "planning",
  });

  useEffect(() => {
    fetchCategories();
  }, []);


  const fetchCategories = async () => {
    const { data } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (data) {
      setCategories(data);
      // Initialize budget breakdown with all categories set to 0
      if (!editData) {
        const initialBreakdown: Record<string, number> = {};
        data.forEach(cat => {
          initialBreakdown[cat.id] = 0;
        });
        setBudgetBreakdown(initialBreakdown);
      }
    }
  };

  useEffect(() => {
    if (open && editData) {
      setFormData({
        code: editData.code || "",
        name: editData.name || "",
        company_id: editData.company_id || "",
        location: editData.location || "",
        description: editData.description || "",
        start_date: editData.start_date || "",
        end_date: editData.end_date || "",
        budget: editData.budget?.toString() || "",
        status: editData.status || "planning",
      });
      setBudgetBreakdown(editData.budget_breakdown || {});
    } else if (!open) {
      setFormData({ 
        code: "", 
        name: "", 
        company_id: "", 
        location: "", 
        description: "", 
        start_date: "", 
        end_date: "", 
        budget: "", 
        status: "planning" 
      });
      // Reset to all categories when closing
      const initialBreakdown: Record<string, number> = {};
      categories.forEach(cat => {
        initialBreakdown[cat.id] = 0;
      });
      setBudgetBreakdown(initialBreakdown);
    }
  }, [open, editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      setLoading(false);
      return;
    }

    const projectData = {
      ...formData,
      budget: totalCategoryBudget || null,
      budget_breakdown: budgetBreakdown,
    };

    let error;
    if (editData) {
      const result = await supabase.from("projects").update(projectData).eq("id", editData.id);
      error = result.error;
    } else {
      const result = await supabase.from("projects").insert({
        ...projectData,
        created_by: user.id,
      });
      error = result.error;
    }

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success(editData ? "แก้ไขโครงการสำเร็จ" : "สร้างโครงการสำเร็จ");
      setOpen(false);
      if (!editData) {
        setFormData({ code: "", name: "", company_id: "", location: "", description: "", start_date: "", end_date: "", budget: "", status: "planning" });
        setBudgetBreakdown({});
      }
      onSuccess?.();
    }
    setLoading(false);
  };

  const updateCategoryBudget = (categoryId: string, amount: number) => {
    const newBreakdown = { ...budgetBreakdown, [categoryId]: amount };
    setBudgetBreakdown(newBreakdown);
    // Auto-update budget from category breakdown total
    const total = Object.values(newBreakdown).reduce((sum, val) => sum + Number(val || 0), 0);
    setFormData({ ...formData, budget: total.toString() });
  };

  const totalCategoryBudget = Object.values(budgetBreakdown).reduce((sum, val) => sum + Number(val || 0), 0);

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
          <DialogTitle>{editData ? 'แก้ไขโครงการ' : 'สร้างโครงการใหม่'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>รหัสโครงการ *</Label>
              <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="เช่น PRJ001" required />
            </div>
            <div>
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
              <Label>งบประมาณรวม (บาท)</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={totalCategoryBudget || 0} 
                disabled 
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                *งบประมาณรวมจะถูกคำนวณอัตโนมัติจากงบประมาณแยกหมวดหมู่
              </p>
            </div>

            <div className="col-span-2">
              <Label>งบประมาณแยกหมวดหมู่</Label>
              <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-3 mt-2">
                {categories.map(cat => {
                  const amount = budgetBreakdown[cat.id] || 0;
                  return (
                    <div key={cat.id} className="flex gap-2 items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{cat.category_type === 'material' ? 'วัสดุ' : cat.category_type === 'labor' ? 'ค่าแรง' : cat.category_type === 'labor_contractor' ? 'ช่างรับเหมา' : 'อื่นๆ'}</p>
                      </div>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={amount || 0}
                        onChange={e => updateCategoryBudget(cat.id, parseFloat(e.target.value) || 0)}
                        className="w-40"
                        placeholder="งบประมาณ"
                      />
                    </div>
                  );
                })}
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">ไม่พบหมวดหมู่</p>
                )}
                {categories.length > 0 && (
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>รวมงบประมาณแยกหมวดหมู่:</span>
                    <span className="text-primary">{new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(totalCategoryBudget)}</span>
                  </div>
                )}
              </div>
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
