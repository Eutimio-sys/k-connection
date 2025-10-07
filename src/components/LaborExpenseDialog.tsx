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
  amount: number;
  notes: string;
}

interface Deduction {
  description: string;
  amount: number;
}

const LaborExpenseDialog = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([{ category_id: "", description: "", amount: 0, notes: "" }]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [withholdingTaxRate, setWithholdingTaxRate] = useState(3);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    const [workersRes, projectsRes, companiesRes, categoriesRes] = await Promise.all([
      supabase.from("workers").select("*").eq("is_active", true),
      supabase.from("projects").select("*"),
      supabase.from("companies").select("*").eq("is_active", true),
      supabase.from("expense_categories").select("*").eq("is_active", true),
    ]);
    
    if (workersRes.data) setWorkers(workersRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
  };

  const generateInvoiceNumber = () => {
    const company = companies.find(c => c.id === selectedCompany);
    const companyCode = company?.code || "COMP";
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${companyCode.toLowerCase()}${day}${month}${year}`;
  };

  const addItem = () => {
    setItems([...items, { category_id: "", description: "", amount: 0, notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addDeduction = () => {
    setDeductions([...deductions, { description: "", amount: 0 }]);
  };

  const removeDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const updateDeduction = (index: number, field: keyof Deduction, value: any) => {
    const newDeductions = [...deductions];
    newDeductions[index] = { ...newDeductions[index], [field]: value };
    setDeductions(newDeductions);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateWithholdingTax = (subtotal: number) => {
    return (subtotal * withholdingTaxRate) / 100;
  };

  const calculateTotalDeductions = () => {
    return deductions.reduce((sum, d) => sum + d.amount, 0);
  };

  const calculateNetAmount = (subtotal: number, withholdingTax: number, totalDeductions: number) => {
    return subtotal - withholdingTax - totalDeductions;
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
    const invoiceNumber = generateInvoiceNumber();
    const workerId = formData.get("worker_id") as string;
    const projectId = selectedProject;
    const companyId = selectedCompany;
    const invoiceDate = formData.get("invoice_date") as string;
    const notes = formData.get("notes") as string;

    if (!projectId || !companyId || items.some(i => !i.category_id || !i.description)) {
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
      const { error: uploadError } = await supabase.storage
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
    const withholdingTaxAmount = calculateWithholdingTax(subtotal);
    const totalDeductions = calculateTotalDeductions();
    const netAmount = calculateNetAmount(subtotal, withholdingTaxAmount, totalDeductions);
    const totalAmount = subtotal;

    const { data: expense, error: expenseError } = await supabase
      .from("labor_expenses")
      .insert({
        invoice_number: invoiceNumber,
        worker_id: workerId || null,
        project_id: projectId,
        company_id: companyId,
        invoice_date: invoiceDate,
        subtotal,
        withholding_tax_rate: withholdingTaxRate,
        withholding_tax_amount: withholdingTaxAmount,
        total_amount: totalAmount,
        net_amount: netAmount,
        notes,
        receipt_image_url: receiptUrl,
        created_by: user.id,
      })
      .select()
      .single();

    if (expenseError) {
      toast.error("เกิดข้อผิดพลาด");
      console.error(expenseError);
      setLoading(false);
      return;
    }

    const itemsToInsert = items.map(item => ({
      labor_expense_id: expense.id,
      category_id: item.category_id,
      description: item.description,
      amount: item.amount,
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

    if (deductions.length > 0) {
      const deductionsToInsert = deductions.map(d => ({
        labor_expense_id: expense.id,
        description: d.description,
        amount: d.amount,
      }));

      const { error: deductionsError } = await supabase
        .from("labor_expense_deductions")
        .insert(deductionsToInsert);

      if (deductionsError) {
        toast.error("เกิดข้อผิดพลาดในการบันทึกรายการหัก");
        setLoading(false);
        return;
      }
    }

    toast.success("บันทึกสำเร็จ");
    setOpen(false);
    resetForm();
    if (onSuccess) onSuccess();
    setLoading(false);
  };

  const resetForm = () => {
    setItems([{ category_id: "", description: "", amount: 0, notes: "" }]);
    setDeductions([]);
    setWithholdingTaxRate(3);
    setImageFile(null);
    setImagePreview("");
    setSelectedCompany("");
    setSelectedProject("");
  };

  const subtotal = calculateSubtotal();
  const withholdingTax = calculateWithholdingTax(subtotal);
  const totalDeductions = calculateTotalDeductions();
  const netAmount = calculateNetAmount(subtotal, withholdingTax, totalDeductions);

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
              <Label>เลขที่ใบเสร็จ (สร้างอัตโนมัติ)</Label>
              <Input value={generateInvoiceNumber()} disabled className="bg-muted" />
            </div>
            <div>
              <Label htmlFor="invoice_date">วันที่</Label>
              <Input id="invoice_date" name="invoice_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_id">บริษัท *</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany} required>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบริษัท" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code ? `[${c.code}] ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project_id">โครงการ *</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject} required>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกโครงการ" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code ? `[${p.code}] ${p.name}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                          <SelectItem key={c.id} value={c.id}>
                            {c.code ? `[${c.code}] ${c.name}` : c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>จำนวนเงิน *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={item.amount} 
                      onChange={(e) => updateItem(index, "amount", parseFloat(e.target.value) || 0)} 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <Label>รายละเอียด *</Label>
                  <Input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} required />
                </div>

                <div>
                  <Label>หมายเหตุ</Label>
                  <Input value={item.notes} onChange={(e) => updateItem(index, "notes", e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>รายการหัก</Label>
              <Button type="button" size="sm" variant="outline" onClick={addDeduction}>
                <Plus className="h-4 w-4 mr-1" />
                เพิ่มรายการหัก
              </Button>
            </div>
            
            {deductions.map((deduction, index) => (
              <div key={index} className="border p-3 rounded-lg">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label>รายการ (เช่น หักค่าบัตร, หักเบิกล่วงหน้า)</Label>
                    <Input 
                      value={deduction.description} 
                      onChange={(e) => updateDeduction(index, "description", e.target.value)}
                      placeholder="ระบุรายการหัก"
                    />
                  </div>
                  <div className="w-40">
                    <Label>จำนวน</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={deduction.amount} 
                      onChange={(e) => updateDeduction(index, "amount", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeDeduction(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
              <Label htmlFor="withholding_tax_rate" className="mb-0">หัก ณ ที่จ่าย (%):</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="withholding_tax_rate"
                  name="withholding_tax_rate"
                  type="number"
                  step="0.01"
                  value={withholdingTaxRate}
                  onChange={(e) => setWithholdingTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-20"
                />
                <span className="font-medium w-32 text-right text-destructive">
                  -{new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(withholdingTax)}
                </span>
              </div>
            </div>
            {totalDeductions > 0 && (
              <div className="flex justify-between text-destructive">
                <span>รายการหักทั้งหมด:</span>
                <span className="font-medium">-{new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(totalDeductions)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>ยอดสุทธิ:</span>
              <span className="text-accent">{new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(netAmount)}</span>
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
