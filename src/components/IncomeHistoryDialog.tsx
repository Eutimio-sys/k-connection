import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface IncomeHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

const IncomeHistoryDialog = ({ open, onOpenChange, projectId, onSuccess }: IncomeHistoryDialogProps) => {
  const [incomes, setIncomes] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    income_date: new Date().toISOString().split('T')[0],
    payment_account_id: "",
    description: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchIncomes();
      fetchPaymentAccounts();
    }
  }, [open, projectId]);

  const fetchIncomes = async () => {
    const { data } = await supabase
      .from("project_income")
      .select(`
        *,
        payment_account:payment_accounts(name, bank_name, account_number),
        creator:profiles!created_by(full_name)
      `)
      .eq("project_id", projectId)
      .order("income_date", { ascending: false });
    
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
    
    const { error } = await supabase.from("project_income").insert({
      project_id: projectId,
      amount: parseFloat(formData.amount),
      income_date: formData.income_date,
      payment_account_id: formData.payment_account_id || null,
      description: formData.description,
      notes: formData.notes,
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
      });
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

  const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount || 0), 0);

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

          {incomes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">ยังไม่มีรายการเบิกเงิน</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>บัญชี</TableHead>
                  <TableHead className="text-right">จำนวนเงิน</TableHead>
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
