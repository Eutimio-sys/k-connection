import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface ExpenseItem {
  category_id: string;
  description: string;
  unit_price: string;
  quantity: string;
  amount: number;
  notes: string;
}

interface ExpenseDialogProps {
  children?: React.ReactNode;
  onSuccess: () => void;
  expense?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ExpenseDialog = ({ children, onSuccess, expense, open: controlledOpen, onOpenChange }: ExpenseDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [taxInvoiceNumber, setTaxInvoiceNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasVat, setHasVat] = useState(false);
  const [vatRate, setVatRate] = useState("7");
  const [vatIncluded, setVatIncluded] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<"cash" | "credit">("cash");
  const [creditDays, setCreditDays] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptImagePreview, setReceiptImagePreview] = useState<string>("");
  const [items, setItems] = useState<ExpenseItem[]>([
    { category_id: "", description: "", unit_price: "", quantity: "1", amount: 0, notes: "" }
  ]);

  useEffect(() => {
    if (open) {
      fetchData();
      // Populate form data when editing
      if (expense) {
        setInvoiceNumber(expense.invoice_number || "");
        setTaxInvoiceNumber(expense.tax_invoice_number || "");
        setVendorId(expense.vendor_id || "");
        setProjectId(expense.project_id || "");
        setCompanyId(expense.company_id || "");
        setInvoiceDate(expense.invoice_date || new Date().toISOString().split('T')[0]);
        setHasVat(expense.vat_amount > 0);
        setVatRate(expense.vat_rate?.toString() || "7");
        setVatIncluded(false); // Reset to false for editing
        setPaymentTerms(expense.payment_terms || "cash");
        setCreditDays(expense.credit_days?.toString() || "");
        setNotes(expense.notes || "");
        setReceiptImagePreview(expense.receipt_image_url || "");
        
        // Populate items
        if (expense.expense_items && expense.expense_items.length > 0) {
          setItems(expense.expense_items.map((item: any) => ({
            category_id: item.category_id,
            description: item.description,
            unit_price: item.unit_price?.toString() || "",
            quantity: item.quantity?.toString() || "1",
            amount: item.amount || 0,
            notes: item.notes || ""
          })));
        }
      }
    }
  }, [open, expense]);

  const fetchData = async () => {
    const [vendorsRes, projectsRes, companiesRes, categoriesRes] = await Promise.all([
      supabase.from("vendors").select("*").eq("is_active", true).order("name"),
      supabase.from("projects").select("*").order("name"),
      supabase.from("companies").select("*").eq("is_active", true).order("name"),
      supabase.from("expense_categories").select("*").eq("is_active", true).eq("category_type", "material").order("name"),
    ]);

    setVendors(vendorsRes.data || []);
    setProjects(projectsRes.data || []);
    setCompanies(companiesRes.data || []);
    setCategories(categoriesRes.data || []);
  };

  const addItem = () => {
    setItems([...items, { category_id: "", description: "", unit_price: "", quantity: "1", amount: 0, notes: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'unit_price' || field === 'quantity') {
      newItems[index][field] = value as string;
      const unitPrice = parseFloat(field === 'unit_price' ? (value as string) : newItems[index].unit_price) || 0;
      const quantity = parseFloat(field === 'quantity' ? (value as string) : newItems[index].quantity) || 0;
      newItems[index].amount = unitPrice * quantity;
    } else if (field === 'amount') {
      newItems[index][field] = value as number;
    } else {
      newItems[index][field] = value as string;
    }
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    
    // If VAT is included in the price, we need to extract it
    if (hasVat && vatIncluded) {
      const vatMultiplier = 1 + (parseFloat(vatRate) / 100);
      return totalAmount / vatMultiplier;
    }
    
    return totalAmount;
  };

  const calculateVAT = () => {
    if (!hasVat) return 0;
    
    if (vatIncluded) {
      // If VAT is included, calculate it from the total entered amount
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const vatMultiplier = 1 + (parseFloat(vatRate) / 100);
      const subtotal = totalAmount / vatMultiplier;
      return totalAmount - subtotal;
    } else {
      // If VAT is not included, calculate it from subtotal
      const subtotal = calculateSubtotal();
      return (subtotal * parseFloat(vatRate)) / 100;
    }
  };

  const calculateTotal = () => {
    if (vatIncluded) {
      // If VAT is included, total is what was entered
      return items.reduce((sum, item) => sum + item.amount, 0);
    }
    // If VAT is not included, add VAT to subtotal
    return calculateSubtotal() + calculateVAT();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setReceiptImage(null);
    setReceiptImagePreview("");
  };

  const generateAutoInvoiceNumber = async () => {
    if (!projectId || !companyId || !invoiceDate) return null;
    
    const { data, error } = await supabase.rpc('generate_invoice_number', {
      p_company_id: companyId,
      p_project_id: projectId,
      p_invoice_date: invoiceDate,
      p_expense_type: 'material'
    });
    
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!projectId || !companyId) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const validItems = items.filter(item => item.category_id && item.description && item.unit_price && item.quantity);
    if (validItems.length === 0) {
      toast.error("กรุณาเพิ่มรายการค่าใช้จ่ายอย่างน้อย 1 รายการ");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Generate auto invoice number if not manually set
      let finalInvoiceNumber = invoiceNumber;
      if (!finalInvoiceNumber) {
        const autoNumber = await generateAutoInvoiceNumber();
        if (autoNumber) {
          finalInvoiceNumber = autoNumber;
        } else {
          toast.error("ไม่สามารถสร้างเลขที่บิลอัตโนมัติได้");
          setLoading(false);
          return;
        }
      }

      let receiptImageUrl = null;

      // Upload image if exists
      if (receiptImage) {
        const fileExt = receiptImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        receiptImageUrl = publicUrl;
      }

      const subtotal = calculateSubtotal();
      const vatAmount = calculateVAT();
      const totalAmount = calculateTotal();

      // Insert expense
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          invoice_number: finalInvoiceNumber,
          tax_invoice_number: taxInvoiceNumber || null,
          vendor_id: vendorId || null,
          project_id: projectId,
          company_id: companyId,
          invoice_date: invoiceDate,
          subtotal: subtotal,
          vat_rate: parseFloat(vatRate),
          vat_amount: vatAmount,
          total_amount: totalAmount,
          receipt_image_url: receiptImageUrl,
          notes: notes || null,
          payment_terms: paymentTerms,
          credit_days: paymentTerms === "credit" ? parseInt(creditDays) || null : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Insert expense items
      const itemsData = validItems.map(item => ({
        expense_id: expense.id,
        category_id: item.category_id,
        description: item.description,
        unit_price: parseFloat(item.unit_price),
        quantity: parseFloat(item.quantity),
        amount: item.amount,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from("expense_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast.success("บันทึกค่าใช้จ่ายสำเร็จ");
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInvoiceNumber("");
    setTaxInvoiceNumber("");
    setVendorId("");
    setProjectId("");
    setCompanyId("");
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setHasVat(false);
    setVatRate("7");
    setVatIncluded(false);
    setPaymentTerms("cash");
    setCreditDays("");
    setNotes("");
    setReceiptImage(null);
    setReceiptImagePreview("");
    setItems([{ category_id: "", description: "", unit_price: "", quantity: "1", amount: 0, notes: "" }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มบิล/ค่าใช้จ่าย</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>เลขที่บิล (เว้นว่างเพื่อสร้างอัตโนมัติ)</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="จะสร้างอัตโนมัติ"
              />
            </div>
            <div className="space-y-2">
              <Label>เลขที่พิม</Label>
              <Input
                value={taxInvoiceNumber}
                onChange={(e) => setTaxInvoiceNumber(e.target.value)}
                placeholder="เลขที่ใบกำกับภาษี"
              />
            </div>
            <div className="space-y-2">
              <Label>วันที่ *</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>บริษัท *</Label>
              <Select value={companyId} onValueChange={setCompanyId} required>
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
            <div className="space-y-2">
              <Label>โครงการ *</Label>
              <Select value={projectId} onValueChange={setProjectId} required>
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
            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between">
                <Label>ร้านค้า</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1">
                      <Plus className="h-3 w-3" />
                      เพิ่มร้านค้า
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>เพิ่มร้านค้าใหม่</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const { error } = await supabase.from("vendors").insert({
                        name: formData.get("name") as string,
                        contact_person: formData.get("contact_person") as string || null,
                        phone: formData.get("phone") as string || null,
                        is_active: true,
                      });
                      if (error) {
                        toast.error("เกิดข้อผิดพลาด: " + error.message);
                      } else {
                        toast.success("เพิ่มร้านค้าสำเร็จ");
                        fetchData();
                        (e.target as HTMLFormElement).reset();
                      }
                    }} className="space-y-4">
                      <div>
                        <Label htmlFor="vendor-name">ชื่อร้านค้า *</Label>
                        <Input id="vendor-name" name="name" required />
                      </div>
                      <div>
                        <Label htmlFor="vendor-contact">ผู้ติดต่อ</Label>
                        <Input id="vendor-contact" name="contact_person" />
                      </div>
                      <div>
                        <Label htmlFor="vendor-phone">เบอร์โทร</Label>
                        <Input id="vendor-phone" name="phone" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="submit">บันทึก</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกร้านค้า (ถ้ามี)" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>เงื่อนไขการชำระเงิน *</Label>
              <div className="flex gap-4">
                <Select value={paymentTerms} onValueChange={(value: "cash" | "credit") => setPaymentTerms(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">เงินสด</SelectItem>
                    <SelectItem value="credit">เครดิต</SelectItem>
                  </SelectContent>
                </Select>
                {paymentTerms === "credit" && (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="number"
                      value={creditDays}
                      onChange={(e) => setCreditDays(e.target.value)}
                      placeholder="จำนวนวัน"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">วัน</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">รายการค่าใช้จ่าย</Label>
              <Button type="button" onClick={addItem} variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                เพิ่มรายการ
              </Button>
            </div>

            {items.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">รายการที่ {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>หมวดหมู่ *</Label>
                      <Select
                        value={item.category_id}
                        onValueChange={(value) => updateItem(index, "category_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกหมวดหมู่" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>รายละเอียด *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="ระบุรายละเอียด"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ราคาต่อหน่วย *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>จำนวน *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>ยอดรวม</Label>
                      <Input
                        type="text"
                        value={item.amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>หมายเหตุ</Label>
                      <Textarea
                        value={item.notes}
                        onChange={(e) => updateItem(index, "notes", e.target.value)}
                        placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>อัพโหลดรูปบิล</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1"
                />
                {receiptImagePreview && (
                  <Button type="button" variant="outline" size="icon" onClick={removeImage}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {receiptImagePreview && (
                <div className="mt-2 relative w-full max-w-md">
                  <img 
                    src={receiptImagePreview} 
                    alt="Preview" 
                    className="rounded-lg border w-full h-auto"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>หมายเหตุทั้งบิล</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติมสำหรับทั้งบิล"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3 text-sm mb-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="hasVat" 
                  checked={hasVat} 
                  onCheckedChange={(checked) => setHasVat(checked as boolean)}
                />
                <Label htmlFor="hasVat" className="cursor-pointer mb-0">มี VAT</Label>
              </div>
              {hasVat && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={vatRate}
                      onChange={(e) => setVatRate(e.target.value)}
                      className="w-20 h-8"
                      step="0.01"
                    />
                    <span>%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="vatIncluded" 
                      checked={vatIncluded} 
                      onCheckedChange={(checked) => setVatIncluded(checked as boolean)}
                    />
                    <Label htmlFor="vatIncluded" className="cursor-pointer mb-0">รายการรวม VAT แล้ว</Label>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span>ยอดรวม (ก่อน VAT):</span>
              <span className="font-medium">
                {calculateSubtotal().toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>VAT ({vatRate}%):</span>
              <span className="font-medium">
                {hasVat ? calculateVAT().toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '฿0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-lg font-semibold">ยอดรวมทั้งสิ้น:</span>
              <span className="text-2xl font-bold text-primary">
                {calculateTotal().toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
              </span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseDialog;
