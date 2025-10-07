import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ExpenseItem {
  category_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  notes: string;
}

const LaborExpenseDialog = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([{ category_id: "", description: "", quantity: 1, unit_price: 0, notes: "" }]);
  const [vatRate, setVatRate] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    const [workersRes, projectsRes, companiesRes, categoriesRes] = await Promise.all([
      supabase.from("workers").select("*").eq("is_active", true),
      supabase.from("projects").select("*").eq("status", "active"),
      supabase.from("companies").select("*").eq("is_active", true),
      supabase.from("expense_categories").select("*").eq("is_active", true),
    ]);
    
    if (workersRes.data) setWorkers(workersRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
  };

  const addItem = () => {
    setItems([...items, { category_id: "", description: "", quantity: 1, unit_price: 0, notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateVAT = (subtotal: number, vatRate: number) => {
    return (subtotal * vatRate) / 100;
  };

  const calculateTotal = (subtotal: number, vat: number) => {
    return subtotal + vat;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const invoiceNumber = formData.get("invoice_number") as string;
    const workerId = formData.get("worker_id") as string;
    const projectId = formData.get("project_id") as string;
    const companyId = formData.get("company_id") as string;
    const invoiceDate = formData.get("invoice_date") as string;
    const notes = formData.get("notes") as string;

    if (!invoiceNumber || !projectId || !companyId || items.some(i => !i.category_id || !i.description)) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      setLoading(false);
      return;
    }

    let receiptUrl = "";
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from("receipts")
        .upload(fileName, imageFile);

      if (uploadError) {
        toast.error("เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ");
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(fileName);
      receiptUrl = publicUrl;
    }

    const subtotal = calculateSubtotal();
    const vatAmount = calculateVAT(subtotal, vatRate);
    const totalAmount = calculateTotal(subtotal, vatAmount);

    const { data: expense, error: expenseError } = await supabase
      .from("labor_expenses")
      .insert({
        invoice_number: invoiceNumber,
        worker_id: workerId || null,
        project_id: projectId,
        company_id: companyId,
        invoice_date: invoiceDate,
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        notes,
        receipt_image_url: receiptUrl,
        created_by: user.id,
      })
      .select()
      .single();

    if (expenseError) {
      toast.error("เกิดข้อผิดพลาด");
      setLoading(false);
      return;
    }

    const itemsToInsert = items.map(item => ({
      labor_expense_id: expense.id,
      category_id: item.category_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.quantity * item.unit_price,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from("labor_expense_items")
      .insert(itemsToInsert);

    if (itemsError) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกรายการ");
      setLoading(false);
      return;
    }

    toast.success("บันทึกสำเร็จ");
    setOpen(false);
    resetForm();
    if (onSuccess) onSuccess();
    setLoading(false);
  };

  const resetForm = () => {
    setItems([{ category_id: "", description: "", quantity: 1, unit_price: 0, notes: "" }]);
    setVatRate(0);
    setImageFile(null);
    setImagePreview("");
  };

  const subtotal = calculateSubtotal();
  const vatAmount = calculateVAT(subtotal, vatRate);
  const total = calculateTotal(subtotal, vatAmount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มค่าแรงงาน
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มรายการค่าแรงงาน</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice_number">เลขที่ใบเสร็จ *</Label>
              <Input id="invoice_number" name="invoice_number" required />
            </div>
            <div>
              <Label htmlFor="invoice_date">วันที่</Label>
              <Input id="invoice_date" name="invoice_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="worker_id">ช่าง</Label>
              <Select name="worker_id">
                <SelectTrigger>
                  <SelectValue placeholder="เลือกช่าง" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project_id">โครงการ *</Label>
              <Select name="project_id" required>
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
          </div>

          <div>
            <Label htmlFor="company_id">บริษัท *</Label>
            <Select name="company_id" required>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>รายการค่าแรง</Label>
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                เพิ่มรายการ
              </Button>
            </div>
            
            {items.map((item, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">รายการ {index + 1}</h4>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>หมวดหมู่ *</Label>
                    <Select value={item.category_id} onValueChange={(v) => updateItem(index, "category_id", v)} required>
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
                    <Label>รายละเอียด *</Label>
                    <Input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>จำนวน</Label>
                    <Input type="number" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>ราคา/หน่วย</Label>
                    <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                <div>
                  <Label>หมายเหตุ</Label>
                  <Input value={item.notes} onChange={(e) => updateItem(index, "notes", e.target.value)} />
                </div>

                <div className="text-right font-medium">
                  รวม: {new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(item.quantity * item.unit_price)}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>ยอดรวม:</span>
              <span className="font-medium">{new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="vat_rate" className="mb-0">VAT (%):</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="vat_rate"
                  name="vat_rate"
                  type="number"
                  step="0.01"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  className="w-20"
                />
                <span className="font-medium w-32 text-right">
                  {new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(vatAmount)}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>รวมทั้งสิ้น:</span>
              <span className="text-accent">{new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(total)}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="receipt">รูปใบเสร็จ</Label>
            {imagePreview ? (
              <div className="relative mt-2">
                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg" />
                <Button type="button" variant="destructive" size="sm" onClick={removeImage} className="absolute top-2 right-2">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Input id="receipt" type="file" accept="image/*" onChange={handleImageChange} className="mt-2" />
            )}
          </div>

          <div>
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea id="notes" name="notes" rows={3} />
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

export default LaborExpenseDialog;
