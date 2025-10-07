import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface ExpenseItem {
  id: string;
  invoice_number: string;
  project_id: string;
  total_amount: number;
  net_amount?: number;
  notes?: string;
  project: { name: string };
  vendor?: { id: string; name: string; bank_name: string; bank_account: string };
  worker?: { id: string; full_name: string; bank_name: string; bank_account: string };
}

const DailyPaymentFromExpenseDialog = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expenseType, setExpenseType] = useState<"material" | "labor">("material");
  const [materialItems, setMaterialItems] = useState<ExpenseItem[]>([]);
  const [laborItems, setLaborItems] = useState<ExpenseItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentType, setPaymentType] = useState("");

  useEffect(() => {
    if (open) {
      fetchExpenseItems();
      supabase.from("payment_accounts").select("*").eq("is_active", true).order("name").then(({ data }) => setPaymentAccounts(data || []));
    }
  }, [open, expenseType]);

  const fetchExpenseItems = async () => {
    if (expenseType === "material") {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id,
          invoice_number,
          project_id,
          total_amount,
          notes,
          project:projects(name),
          vendor:vendors(id, name, bank_name, bank_account)
        `)
        .eq("status", "approved");

      if (!error && data) {
        setMaterialItems(data as any);
      }
    } else {
      const { data, error } = await supabase
        .from("labor_expenses")
        .select(`
          id,
          invoice_number,
          project_id,
          net_amount,
          notes,
          project:projects(name),
          worker:workers(id, full_name, bank_name, bank_account)
        `)
        .eq("status", "approved");

      if (!error && data) {
        setLaborItems(data as any);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error("กรุณาเลือกรายการอย่างน้อย 1 รายการ");
      return;
    }
    if (!paymentAccountId || !paymentType) {
      toast.error("กรุณาเลือกบัญชีที่ใช้โอนและประเภทการโอน");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      setLoading(false);
      return;
    }

    const items = expenseType === "material" ? materialItems : laborItems;
    const paymentsToInsert = selectedItems.map(itemId => {
      const item = items.find(i => i.id === itemId);
      if (!item) return null;

      const payee = expenseType === "material" ? item.vendor : item.worker;
      const amount = expenseType === "material" ? item.total_amount : (item.net_amount || 0);

      return {
        project_id: item.project_id,
        worker_id: expenseType === "labor" ? item.worker?.id : null,
        payment_date: paymentDate,
        amount: amount,
        category_id: null,
        description: `${item.invoice_number}${item.notes ? ` - ${item.notes}` : ''}`,
        notes: `${payee?.bank_name || ""} ${payee?.bank_account || ""}`,
        expense_type: expenseType,
        expense_item_id: item.id,
        payment_account_id: paymentAccountId,
        payment_type: paymentType,
        created_by: user.id,
        status: "pending",
      };
    }).filter(Boolean);

    const { error } = await supabase.from("daily_payments").insert(paymentsToInsert);

    if (error) {
      toast.error("เกิดข้อผิดพลาด");
      console.error(error);
    } else {
      toast.success("สร้างรายการโอนเงินสำเร็จ");
      setOpen(false);
      setSelectedItems([]);
      setPaymentAccountId("");
      setPaymentType("");
      onSuccess?.();
    }
    setLoading(false);
  };

  const items = expenseType === "material" ? materialItems : laborItems;
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          เลือกรายการโอนเงิน
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เลือกรายการโอนเงิน</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ประเภทบัญชี</Label>
              <Select value={expenseType} onValueChange={(v: any) => setExpenseType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">บัญชีวัสดุ</SelectItem>
                  <SelectItem value="labor">บัญชีค่าแรง</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>วันที่จ่าย</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <Label>บัญชีที่ใช้โอน *</Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId} required>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบัญชี" />
                </SelectTrigger>
                <SelectContent>
                  {paymentAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} - {acc.bank_name} {acc.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ประเภทการโอน *</Label>
              <Select value={paymentType} onValueChange={setPaymentType} required>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">โอนเงิน</SelectItem>
                  <SelectItem value="cash">เงินสด</SelectItem>
                  <SelectItem value="cheque">เช็ค</SelectItem>
                  <SelectItem value="other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
            <Label className="mb-3 block">เลือกรายการที่ต้องจ่าย</Label>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีรายการที่อนุมัติแล้ว</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const payee = expenseType === "material" 
                    ? item.vendor?.name 
                    : item.worker?.full_name;
                  const bank = expenseType === "material"
                    ? item.vendor?.bank_name
                    : item.worker?.bank_name;
                  const account = expenseType === "material"
                    ? item.vendor?.bank_account
                    : item.worker?.bank_account;
                  const amount = expenseType === "material" ? item.total_amount : (item.net_amount || 0);

                  return (
                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded hover:bg-muted/50">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                      />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{item.invoice_number}</p>
                        <p className="text-muted-foreground">
                          โครงการ: {item.project.name}
                        </p>
                        <p className="text-muted-foreground">
                          {payee && `${payee} | `}
                          {bank && `${bank} `}
                          {account}
                        </p>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                        <p className="font-semibold text-accent mt-1">{formatCurrency(amount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              เลือกแล้ว {selectedItems.length} รายการ
            </div>
            <div className="text-lg font-semibold">
              รวม: {formatCurrency(
                items
                  .filter(i => selectedItems.includes(i.id))
                  .reduce((sum, i) => {
                    const amount = expenseType === "material" ? i.total_amount : (i.net_amount || 0);
                    return sum + amount;
                  }, 0)
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || selectedItems.length === 0}>
              {loading ? "กำลังบันทึก..." : "สร้างรายการโอนเงิน"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DailyPaymentFromExpenseDialog;
