import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ExpenseItem {
  category_id: string;
  description: string;
  amount: string;
  notes: string;
}

const ExpenseDialog = ({ children, onSuccess }: { children: React.ReactNode; onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ExpenseItem[]>([
    { category_id: "", description: "", amount: "", notes: "" }
  ]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    const [vendorsRes, projectsRes, companiesRes, categoriesRes] = await Promise.all([
      supabase.from("vendors").select("*").eq("is_active", true).order("name"),
      supabase.from("projects").select("*").order("name"),
      supabase.from("companies").select("*").eq("is_active", true).order("name"),
      supabase.from("expense_categories").select("*").eq("is_active", true).order("name"),
    ]);

    setVendors(vendorsRes.data || []);
    setProjects(projectsRes.data || []);
    setCompanies(companiesRes.data || []);
    setCategories(categoriesRes.data || []);
  };

  const addItem = () => {
    setItems([...items, { category_id: "", description: "", amount: "", notes: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!invoiceNumber || !projectId || !companyId) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const validItems = items.filter(item => item.category_id && item.description && item.amount);
    if (validItems.length === 0) {
      toast.error("กรุณาเพิ่มรายการค่าใช้จ่ายอย่างน้อย 1 รายการ");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const totalAmount = calculateTotal();

      // Insert expense
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          invoice_number: invoiceNumber,
          vendor_id: vendorId || null,
          project_id: projectId,
          company_id: companyId,
          invoice_date: invoiceDate,
          total_amount: totalAmount,
          notes: notes || null,
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
        amount: parseFloat(item.amount),
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
    setVendorId("");
    setProjectId("");
    setCompanyId("");
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setNotes("");
    setItems([{ category_id: "", description: "", amount: "", notes: "" }]);
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
              <Label>เลขที่บิล *</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
                required
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
              <Label>ร้านค้า</Label>
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
                      <Label>จำนวนเงิน *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateItem(index, "amount", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>รายละเอียด *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="ระบุรายละเอียด"
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

          <div className="space-y-2">
            <Label>หมายเหตุทั้งบิล</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติมสำหรับทั้งบิล"
              rows={3}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-lg font-semibold">
              ยอดรวมทั้งสิ้น: <span className="text-2xl text-primary">
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
