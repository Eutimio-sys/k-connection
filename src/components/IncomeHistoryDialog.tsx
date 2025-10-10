import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface IncomeHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

interface Income {
  id: string;
  amount: number;
  income_date: string;
  description: string;
  notes: string;
  vat_amount: number;
  withholding_tax_amount: number;
  payment_account: any;
  creator?: { full_name: string };
  created_at: string;
}

const IncomeHistoryDialog = ({ open, onOpenChange, projectId, onSuccess }: IncomeHistoryDialogProps) => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [hasVat, setHasVat] = useState(false);
  const [hasWithholdingTax, setHasWithholdingTax] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    income_date: new Date().toISOString().split('T')[0],
    payment_account_id: "",
    description: "",
    notes: "",
    vat_amount: "",
    withholding_tax_amount: "",
    is_outside_company: false,
  });

  useEffect(() => {
    if (open && projectId) {
      console.log("Fetching incomes for project:", projectId);
      fetchIncomes();
      fetchPaymentAccounts();
    }
  }, [open, projectId]);

  const fetchIncomes = async () => {
    if (!projectId) {
      console.error("No project ID provided");
      return;
    }

    console.log("Fetching project_income for projectId:", projectId);
    const { data, error } = await supabase
      .from("project_income")
      .select(`
        *,
        payment_account:payment_accounts(name, bank_name, account_number)
      `)
      .eq("project_id", projectId)
      .order("income_date", { ascending: false });
    
    if (error) {
      console.error("Error fetching incomes:", error);
    } else {
      console.log("Fetched incomes:", data);
      
      // Fetch creator names separately
      const userIds = data?.map(income => income.created_by).filter(Boolean) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const enrichedData: Income[] = data?.map(income => ({
          ...income,
          creator: profileMap.get(income.created_by)
        })) || [];
        
        setIncomes(enrichedData);
        return;
      }
    }
    
    setIncomes(data || []);
  };

  const fetchPaymentAccounts = async () => {
    const { data } = await supabase
      .from("payment_accounts")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    setPaymentAccounts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Calculate VAT and withholding tax based on checkboxes
    const baseAmount = parseFloat(formData.amount);
    const vatAmount = hasVat ? baseAmount * 0.07 : 0;
    const withholdingTaxAmount = hasWithholdingTax ? baseAmount * 0.03 : 0;
    
    const { error } = await supabase.from("project_income").insert({
      project_id: projectId,
      amount: baseAmount,
      income_date: formData.income_date,
      payment_account_id: formData.payment_account_id || null,
      description: formData.description,
      notes: formData.notes,
      vat_amount: vatAmount,
      withholding_tax_amount: withholdingTaxAmount,
      is_outside_company: formData.is_outside_company,
      created_by: user?.id,
    });

    if (error) {
      toast.error("เกิดข้อผิดพลาด");
      console.error(error);
    } else {
      toast.success("เพิ่มรายการเบิกเงินสำเร็จ");
      setFormData({
        amount: "",
        income_date: new Date().toISOString().split('T')[0],
        payment_account_id: "",
        description: "",
        notes: "",
        vat_amount: "",
        withholding_tax_amount: "",
        is_outside_company: false,
      });
      setHasVat(false);
      setHasWithholdingTax(false);
      setShowAddForm(false);
      fetchIncomes();
      if (onSuccess) onSuccess();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบรายการนี้?")) return;

    const { error } = await supabase.from("project_income").delete().eq("id", id);
    
    if (error) toast.error("เกิดข้อผิดพลาด");
    else {
      toast.success("ลบรายการสำเร็จ");
      fetchIncomes();
      if (onSuccess) onSuccess();
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  const totalIncome = incomes.reduce((sum, income) => sum + (income.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>ประวัติการเบิกเงิน</span>
            <div className="text-2xl font-bold text-primary">
              รวม: {formatCurrency(totalIncome)}
            </div>
          </DialogTitle>
          <DialogDescription>
            จัดการรายการเบิกเงินสำหรับโครงการนี้
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus size={16} />
              เพิ่มรายการเบิกเงิน
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>จำนวนเงิน *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>วันที่เบิก *</Label>
                  <Input
                    type="date"
                    value={formData.income_date}
                    onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasVat"
                    checked={hasVat}
                    onCheckedChange={(checked) => setHasVat(checked === true)}
                  />
                  <Label htmlFor="hasVat" className="text-sm font-normal cursor-pointer">
                    มี VAT 7%
                  </Label>
                </div>
                
                {hasVat && (
                  <div className="ml-6 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      VAT 7%: {formData.amount ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(parseFloat(formData.amount.toString()) * 0.07) : "฿0.00"}
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasWithholding"
                    checked={hasWithholdingTax}
                    onCheckedChange={(checked) => setHasWithholdingTax(checked === true)}
                  />
                  <Label htmlFor="hasWithholding" className="text-sm font-normal cursor-pointer">
                    มีหักณที่จ่าย 3%
                  </Label>
                </div>
                
                {hasWithholdingTax && (
                  <div className="ml-6 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      หักณที่จ่าย 3%: {formData.amount ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(parseFloat(formData.amount.toString()) * 0.03) : "฿0.00"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>บัญชีที่รับเงิน</Label>
                <Select
                  value={formData.payment_account_id}
                  onValueChange={(value) => setFormData({ ...formData, payment_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบัญชี" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {account.bank_name} ({account.account_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>รายละเอียด</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="เช่น เบิกงวดที่ 1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isOutsideCompany"
                  checked={formData.is_outside_company}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_outside_company: checked === true })}
                />
                <Label htmlFor="isOutsideCompany" className="text-sm font-normal cursor-pointer">
                  รับเงินแบบไม่ผ่านบริษัท (ไม่นำมาคำนวณภาษี)
                </Label>
              </div>

              <div>
                <Label>หมายเหตุ</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึก</Button>
              </div>
            </form>
          )}

          {incomes.length === 0 && !showAddForm ? (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">ยังไม่มีรายการเบิกเงิน</p>
              <p className="text-sm text-muted-foreground mb-4">เริ่มบันทึกการเบิกเงินของโครงการนี้</p>
            </div>
          ) : incomes.length === 0 ? null : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>บัญชี</TableHead>
                  <TableHead className="text-right">จำนวนเงิน</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">หักณที่จ่าย</TableHead>
                  <TableHead>ผู้บันทึก</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>
                      {new Date(income.income_date).toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{income.description || "-"}</div>
                        {income.notes && (
                          <div className="text-sm text-muted-foreground">{income.notes}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {income.payment_account ? (
                        <div className="text-sm">
                          <div className="font-medium">{income.payment_account.name}</div>
                          <div className="text-muted-foreground">
                            {income.payment_account.bank_name} - {income.payment_account.account_number}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(income.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(income.vat_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(income.withholding_tax_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{income.creator?.full_name || "-"}</div>
                        <div className="text-muted-foreground">
                          {new Date(income.created_at).toLocaleDateString("th-TH")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(income.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomeHistoryDialog;
