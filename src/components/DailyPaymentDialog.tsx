import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import { dailyPaymentSchema, validateData } from "@/lib/validationSchemas";

interface DailyPaymentDialogProps {
  payment?: any;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DailyPaymentDialog = ({ payment, onSuccess, open: controlledOpen, onOpenChange }: DailyPaymentDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    project_id: payment?.project_id || "",
    worker_id: payment?.worker_id || "",
    payment_date: payment?.payment_date || new Date().toISOString().split('T')[0],
    amount: payment?.amount || "",
    category_id: payment?.category_id || "",
    payment_account_id: payment?.payment_account_id || "",
    payment_type_id: payment?.payment_type_id || "",
    description: payment?.description || "",
    notes: payment?.notes || "",
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (payment) {
      setFormData({
        project_id: payment.project_id || "",
        worker_id: payment.worker_id || "",
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        amount: payment.amount || "",
        category_id: payment.category_id || "",
        payment_account_id: payment.payment_account_id || "",
        payment_type_id: payment.payment_type_id || "",
        description: payment.description || "",
        notes: payment.notes || "",
      });
    }
  }, [payment]);

  const fetchData = async () => {
    const [projectsRes, workersRes, categoriesRes, accountsRes, typesRes] = await Promise.all([
      supabase.from("projects").select("id, name").order("name"),
      supabase.from("workers").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("expense_categories").select("id, name").eq("is_active", true).order("name"),
      supabase.from("payment_accounts").select("id, name, bank_name").eq("is_active", true).order("name"),
      supabase.from("payment_types").select("id, name").eq("is_active", true).order("name"),
    ]);

    if (projectsRes.data) setProjects(projectsRes.data);
    if (workersRes.data) setWorkers(workersRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (accountsRes.data) setPaymentAccounts(accountsRes.data);
    if (typesRes.data) setPaymentTypes(typesRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateData(dailyPaymentSchema, {
      project_id: formData.project_id,
      payment_date: formData.payment_date,
      amount: parseFloat(formData.amount as string),
      worker_id: formData.worker_id || undefined,
      category_id: formData.category_id || undefined,
      payment_account_id: formData.payment_account_id || undefined,
      payment_type_id: formData.payment_type_id || undefined,
      description: formData.description || undefined,
      notes: formData.notes || undefined,
    });

    if (!validation.success) {
      if ('errors' in validation) {
        toast.error(validation.errors[0]);
      }
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      setLoading(false);
      return;
    }

    const dataToSave = {
      ...formData,
      amount: parseFloat(formData.amount as string),
      worker_id: formData.worker_id || null,
      category_id: formData.category_id || null,
      payment_account_id: formData.payment_account_id || null,
      payment_type_id: formData.payment_type_id || null,
    };

    let error;
    if (payment) {
      // Cancel old payment when editing
      await supabase
        .from("daily_payments")
        .update({ status: "cancelled" })
        .eq("id", payment.id);
      
      // Create new payment with edited data
      const result = await supabase
        .from("daily_payments")
        .insert({
          ...dataToSave,
          created_by: user.id,
          status: "pending",
        });
      error = result.error;
    } else {
      // Create new payment
      const result = await supabase
        .from("daily_payments")
        .insert({
          ...dataToSave,
          created_by: user.id,
          status: "pending",
        });
      error = result.error;
    }

    if (error) {
      console.error("Daily payment save error:", error);
      const userMessage = error.message?.includes("RLS") 
        ? "คุณไม่มีสิทธิ์ทำรายการนี้" 
        : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
      toast.error(userMessage);
    } else {
      toast.success(payment ? "แก้ไขรายการสำเร็จ" : "เพิ่มรายการสำเร็จ");
      setOpen(false);
      setFormData({
        project_id: "",
        worker_id: "",
        payment_date: new Date().toISOString().split('T')[0],
        amount: "",
        category_id: "",
        payment_account_id: "",
        payment_type_id: "",
        description: "",
        notes: "",
      });
      onSuccess?.();
    }

    setLoading(false);
  };

  const dialogContent = (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{payment ? "แก้ไขรายการโอนเงิน" : "เพิ่มรายการโอนเงิน"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="project_id">โครงการ *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกโครงการ" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="worker_id">ช่าง/ผู้รับเงิน</Label>
            <Select
              value={formData.worker_id}
              onValueChange={(value) => setFormData({ ...formData, worker_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกช่าง (ถ้ามี)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ไม่ระบุ</SelectItem>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">วันที่จ่าย *</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">จำนวนเงิน *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">หมวดหมู่</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกหมวดหมู่ (ถ้ามี)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ไม่ระบุ</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_account_id">บัญชีที่ใช้โอน</Label>
            <Select
              value={formData.payment_account_id}
              onValueChange={(value) => setFormData({ ...formData, payment_account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกบัญชี (ถ้ามี)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ไม่ระบุ</SelectItem>
                {paymentAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {account.bank_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_type_id">ประเภทการโอน</Label>
            <Select
              value={formData.payment_type_id}
              onValueChange={(value) => setFormData({ ...formData, payment_type_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท (ถ้ามี)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ไม่ระบุ</SelectItem>
                {paymentTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">รายละเอียด</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="ระบุรายละเอียดเพิ่มเติม"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">หมายเหตุ</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="หมายเหตุเพิ่มเติม"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "กำลังบันทึก..." : payment ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (controlledOpen !== undefined) {
    return <Dialog open={open} onOpenChange={setOpen}>{dialogContent}</Dialog>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          {payment ? <Edit className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {payment ? "แก้ไข" : "เพิ่มรายการโอนเงิน"}
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};

export default DailyPaymentDialog;
