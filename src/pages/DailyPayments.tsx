import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, CheckCircle, XCircle, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import DailyPaymentFromExpenseDialog from "@/components/DailyPaymentFromExpenseDialog";
import DailyPaymentDetailDialog from "@/components/DailyPaymentDetailDialog";
import DailyPaymentDialog from "@/components/DailyPaymentDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportDailyPaymentsToExcel } from "@/utils/exportExcel";

const DailyPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [companies, setCompanies] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchFilterData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('daily-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_payments'
        },
        () => {
          // Refetch data when any change occurs
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, startDate, endDate, selectedCompany, selectedProject, selectedStatus]);

  const fetchFilterData = async () => {
    const [companiesRes, projectsRes] = await Promise.all([
      supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
      supabase.from("projects").select("id, name").order("name"),
    ]);
    setCompanies(companiesRes.data || []);
    setProjects(projectsRes.data || []);
  };

  const fetchData = async () => {
    setLoading(true);
    // Skip role checks - allow manage actions for everyone

    let query = supabase
      .from("daily_payments")
      .select(`
        *,
        project:projects(name, company_id, company:companies(name)),
        worker:workers(full_name, bank_name, bank_account),
        category:expense_categories(name),
        payment_account:payment_accounts(name, bank_name, account_number),
        payment_type:payment_types(name),
        creator:profiles!created_by(full_name)
      `);

    // Apply filters
    if (startDate && endDate) {
      query = query.gte("payment_date", startDate).lte("payment_date", endDate);
    } else if (!startDate && !endDate) {
      query = query.eq("payment_date", selectedDate);
    }

    if (selectedCompany !== "all") {
      query = query.eq("project.company_id", selectedCompany);
    }

    if (selectedProject !== "all") {
      query = query.eq("project_id", selectedProject);
    }

    if (selectedStatus !== "all") {
      query = query.eq("status", selectedStatus);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) toast.error("เกิดข้อผิดพลาด");
    else setPayments(data || []);
    setLoading(false);
  };

  const handleMarkAsPaid = async (id: string, currentPayment: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Generate slip number for this payment
    const invDate = new Date(currentPayment.payment_date);
    const year = invDate.getFullYear();
    const month = String(invDate.getMonth() + 1).padStart(2, '0');
    const day = String(invDate.getDate()).padStart(2, '0');
    const companyCode = currentPayment.project?.company?.name?.substring(0, 4).toUpperCase() || 'COMP';
    const projectCode = currentPayment.project?.code || 'PROJ';
    
    // Count existing slips for this date to generate sequence
    const { count } = await supabase
      .from("daily_payments")
      .select("*", { count: 'exact', head: true })
      .eq("payment_date", currentPayment.payment_date)
      .eq("status", "paid");
    
    const slipNumber = `${companyCode}-${projectCode}-${day}${month}${year}-Slip-${String((count || 0) + 1).padStart(3, '0')}`;
    
    const { data, error } = await supabase
      .from("daily_payments")
      .update({
        status: "paid",
        paid_by: user?.id,
        paid_at: new Date().toISOString(),
        description: slipNumber, // Store slip number in description
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error || !data) {
      toast.error("อัปเดตไม่สำเร็จ (สิทธิ์ไม่เพียงพอหรือไม่มีรายการ)");
      return;
    }

    toast.success("ทำรายการสำเร็จ - เลขที่สลิป: " + slipNumber);
    fetchData();
  };

  const handleCancel = async (id: string) => {
    const { data, error } = await supabase
      .from("daily_payments")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error || !data) {
      toast.error("อัปเดตไม่สำเร็จ (สิทธิ์ไม่เพียงพอหรือไม่มีรายการ)");
      return;
    }

    toast.success("ยกเลิกสำเร็จ");
    fetchData();
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

  const canManage = true;

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter size={16} />
            {showFilters ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
          </Button>
          <DailyPaymentFromExpenseDialog onSuccess={fetchData} />
          <Button onClick={() => exportDailyPaymentsToExcel(payments)} className="gap-2">
            <Download size={16} />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>ตั้งแต่วันที่</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>ถึงวันที่</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label>บริษัท</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบริษัท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>โครงการ</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกโครงการ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>สถานะ</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="pending">รอจ่าย</SelectItem>
                    <SelectItem value="paid">จ่ายแล้ว</SelectItem>
                    <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                className={`flex items-start justify-between p-4 border rounded-lg cursor-pointer ${
                  payment.status === 'cancelled' ? 'opacity-50 bg-muted/30' : 
                  payment.status === 'paid' ? 'opacity-50 bg-muted/30' : 
                  'hover:bg-muted/50'
                }`}
                onClick={() => {
                  setSelectedPayment(payment);
                  setDetailDialogOpen(true);
                }}
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
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" onClick={() => handleMarkAsPaid(payment.id, payment)} className="gap-1">
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

      {/* Detail Dialog */}
      {selectedPayment && (
        <DailyPaymentDetailDialog
          payment={selectedPayment}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          onSuccess={fetchData}
          canManage={canManage}
        />
      )}
    </div>
  );
};

export default DailyPayments;
