import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Building, User, FileText } from "lucide-react";
import { toast } from "sonner";
import LaborExpenseDialog from "@/components/LaborExpenseDialog";

const LaborAccounting = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("labor_expenses")
      .select(`
        *,
        worker:workers(full_name, bank_name, bank_account),
        project:projects(name),
        company:companies(name),
        items:labor_expense_items(*, category:expense_categories(name))
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("เกิดข้อผิดพลาด");
      console.error(error);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "รอดำเนินการ", variant: "secondary" },
      approved: { label: "อนุมัติแล้ว", variant: "default" },
      paid: { label: "จ่ายแล้ว", variant: "outline" },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            บัญชีค่าแรงงาน
          </h1>
          <p className="text-muted-foreground text-lg">จัดการและติดตามค่าใช้จ่ายด้านแรงงาน</p>
        </div>
        <LaborExpenseDialog onSuccess={fetchExpenses} />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      ) : expenses.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">ยังไม่มีรายการค่าแรงงานในระบบ</p>
          <LaborExpenseDialog onSuccess={fetchExpenses} />
        </Card>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-elegant transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">ใบเสร็จ: {expense.invoice_number}</CardTitle>
                      {getStatusBadge(expense.status)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">ช่าง</p>
                      <p className="font-medium">{expense.worker?.full_name || "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <FileText size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">โครงการ</p>
                      <p className="font-medium">{expense.project?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Building size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">บริษัท</p>
                      <p className="font-medium">{expense.company?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">วันที่</p>
                      <p className="font-medium">
                        {new Date(expense.invoice_date).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                  </div>
                </div>

                {expense.worker && (
                  <div className="text-sm bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">ข้อมูลธนาคาร</p>
                    <p><span className="font-medium">ธนาคาร:</span> {expense.worker.bank_name || "-"}</p>
                    <p><span className="font-medium">เลขบัญชี:</span> {expense.worker.bank_account || "-"}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">รายการค่าแรง</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>หมวดหมู่</TableHead>
                        <TableHead>รายละเอียด</TableHead>
                        <TableHead className="text-right">จำนวน</TableHead>
                        <TableHead className="text-right">ราคา/หน่วย</TableHead>
                        <TableHead className="text-right">รวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expense.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.category?.name}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount || item.quantity * item.unit_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end border-t pt-4">
                  <div className="space-y-2 min-w-[250px]">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ยอดรวม:</span>
                      <span className="font-medium">{formatCurrency(expense.subtotal)}</span>
                    </div>
                    {expense.vat_rate > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">VAT {expense.vat_rate}%:</span>
                        <span className="font-medium">{formatCurrency(expense.vat_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>รวมทั้งสิ้น:</span>
                      <span className="text-accent">{formatCurrency(expense.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {expense.receipt_image_url && (
                  <div className="pt-4 border-t">
                    <a 
                      href={expense.receipt_image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      ดูใบเสร็จ
                    </a>
                  </div>
                )}

                {expense.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">หมายเหตุ:</span> {expense.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LaborAccounting;
