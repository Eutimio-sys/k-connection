import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import DailyPaymentFromExpenseDialog from "@/components/DailyPaymentFromExpenseDialog";

const DailyPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile) setUserRole(profile.role);
    }

    const { data, error } = await supabase
      .from("daily_payments")
      .select(`
        *,
        project:projects(name),
        worker:workers(full_name, bank_name, bank_account),
        category:expense_categories(name),
        payment_account:payment_accounts(name, bank_name, account_number),
        payment_type:payment_types(name),
        creator:profiles!created_by(full_name)
      `)
      .eq("payment_date", selectedDate)
      .order("created_at", { ascending: false });

    if (error) toast.error("เกิดข้อผิดพลาด");
    else setPayments(data || []);
    setLoading(false);
  };

  const handleMarkAsPaid = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("daily_payments").update({
      status: "paid",
      paid_by: user?.id,
      paid_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) toast.error("เกิดข้อผิดพลาด");
    else { toast.success("ทำรายการสำเร็จ"); fetchData(); }
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from("daily_payments").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error("เกิดข้อผิดพลาด");
    else { toast.success("ยกเลิกสำเร็จ"); fetchData(); }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      pending: { label: "รอจ่าย", variant: "secondary" },
      paid: { label: "จ่ายแล้ว", variant: "default" },
      cancelled: { label: "ยกเลิก", variant: "destructive" },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  const totalPending = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalAmount = payments.filter(p => p.status !== "cancelled").reduce((sum, p) => sum + p.amount, 0);

  const canManage = userRole === "admin" || userRole === "manager" || userRole === "accountant";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            รายการโอน
          </h1>
          <p className="text-muted-foreground text-lg">สรุปยอดที่ต้องโอนเงินในแต่ละวัน</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border rounded-md"
          />
          <DailyPaymentFromExpenseDialog onSuccess={fetchData} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-yellow-900">รอจ่าย</CardTitle>
            <DollarSign className="w-8 h-8 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-900">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-yellow-700 mt-1">
              {payments.filter(p => p.status === "pending").length} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-900">จ่ายแล้ว</CardTitle>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-green-700 mt-1">
              {payments.filter(p => p.status === "paid").length} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">รวมทั้งหมด</CardTitle>
            <Calendar className="w-8 h-8 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(selectedDate).toLocaleDateString("th-TH", { 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="text-center py-12"><p className="text-muted-foreground">กำลังโหลด...</p></div>
      ) : payments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">ยังไม่มีรายการโอนเงินในวันนี้</p>
          <DailyPaymentFromExpenseDialog onSuccess={fetchData} />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>รายการโอนเงิน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((payment) => (
              <div 
                key={payment.id} 
                className={`flex items-start justify-between p-4 border rounded-lg ${
                  payment.status === 'cancelled' ? 'opacity-50 bg-muted/30' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-lg">{payment.worker?.full_name || "ไม่ระบุช่าง"}</h4>
                    {getStatusBadge(payment.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium">โครงการ</p>
                      <p>{payment.project?.name}</p>
                    </div>
                    <div>
                      <p className="font-medium">หมวดหมู่</p>
                      <p>{payment.category?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="font-medium">บัญชีที่ใช้โอน</p>
                      <p>{payment.payment_account ? `${payment.payment_account.name} - ${payment.payment_account.bank_name}` : "-"}</p>
                    </div>
                    <div>
                      <p className="font-medium">ประเภทการโอน</p>
                      <p>{payment.payment_type?.name || "-"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium">ธนาคารผู้รับ</p>
                      <p>{payment.worker?.bank_name || "-"}</p>
                    </div>
                    <div>
                      <p className="font-medium">เลขบัญชีผู้รับ</p>
                      <p className="font-mono">{payment.worker?.bank_account || "-"}</p>
                    </div>
                  </div>

                  {payment.description && (
                    <p className="text-sm text-muted-foreground">{payment.description}</p>
                  )}

                  {payment.notes && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">หมายเหตุ:</span> {payment.notes}
                    </p>
                  )}
                </div>

                <div className="ml-4 text-right space-y-2">
                  <p className="text-2xl font-bold text-accent">{formatCurrency(payment.amount)}</p>
                  
                  {canManage && payment.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleMarkAsPaid(payment.id)} className="gap-1">
                        <CheckCircle size={16} />
                        จ่ายแล้ว
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(payment.id)} className="gap-1">
                        <XCircle size={16} />
                        ยกเลิก
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyPayments;
