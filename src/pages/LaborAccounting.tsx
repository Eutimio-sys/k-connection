import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Building, User, FileText, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import LaborExpenseDialog from "@/components/LaborExpenseDialog";
import LaborExpenseDetailDialog from "@/components/LaborExpenseDetailDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportLaborExpensesToExcel } from "@/utils/exportExcel";

const LaborAccounting = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    projectId: "all",
    workerId: "all",
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    fetchExpenses();
    fetchFilterData();
  }, []);

  const fetchFilterData = async () => {
    const [projectsRes, workersRes] = await Promise.all([
      supabase.from("projects").select("id, name").order("name"),
      supabase.from("workers").select("id, full_name").eq("is_active", true).order("full_name"),
    ]);
    setProjects(projectsRes.data || []);
    setWorkers(workersRes.data || []);
  };

  const fetchExpenses = async () => {
    setLoading(true);
    let query = supabase
      .from("labor_expenses")
      .select(`
        *,
        worker:workers(full_name, bank_name, bank_account),
        project:projects(name),
        company:companies(name),
        items:labor_expense_items(*, category:expense_categories(name)),
        deductions:labor_expense_deductions(*)
      `);

    if (filters.startDate) {
      query = query.gte("invoice_date", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("invoice_date", filters.endDate);
    }
    if (filters.projectId && filters.projectId !== "all") {
      query = query.eq("project_id", filters.projectId);
    }
    if (filters.workerId && filters.workerId !== "all") {
      query = query.eq("worker_id", filters.workerId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast.error("เกิดข้อผิดพลาด");
      console.error(error);
    } else {
      // Fetch creator and updater profiles separately
      const expensesWithProfiles = await Promise.all(
        (data || []).map(async (expense) => {
          const profiles: any = {};
          
          if (expense.created_by) {
            const { data: creator } = await supabase
              .from('profiles')
              .select('id, full_name, nickname, avatar_url, email')
              .eq('id', expense.created_by)
              .maybeSingle();
            profiles.created_by_profile = creator;
          }
          
          if (expense.updated_by) {
            const { data: updater } = await supabase
              .from('profiles')
              .select('id, full_name, nickname, avatar_url, email')
              .eq('id', expense.updated_by)
              .maybeSingle();
            profiles.updated_by_profile = updater;
          }
          
          return { ...expense, ...profiles };
        })
      );
      setExpenses(expensesWithProfiles);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "รอดำเนินการ", variant: "secondary" },
      approved: { label: "อนุมัติแล้ว", variant: "default" },
      paid: { label: "จ่ายแล้ว", variant: "outline" },
      rejected: { label: "ปฏิเสธ", variant: "destructive" },
      cancelled: { label: "ยกเลิก", variant: "outline" },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  const handleExpenseClick = (expense: any) => {
    setSelectedExpense(expense);
    setDetailDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            บัญชีค่าแรงงาน
          </h1>
          <p className="text-muted-foreground text-lg">จัดการและติดตามค่าใช้จ่ายด้านแรงงาน</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportLaborExpensesToExcel(expenses)} 
            className="gap-2"
            disabled={expenses.length === 0}
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="h-4 w-4" />
            ตัวกรอง
          </Button>
          <LaborExpenseDialog onSuccess={fetchExpenses} />
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>วันที่เริ่มต้น</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>วันที่สิ้นสุด</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div>
                <Label>โครงการ</Label>
                <Select value={filters.projectId} onValueChange={(value) => setFilters({ ...filters, projectId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ช่าง</Label>
                <Select value={filters.workerId} onValueChange={(value) => setFilters({ ...filters, workerId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Button variant="outline" onClick={() => setFilters({ startDate: "", endDate: "", projectId: "all", workerId: "all" })}>
                ล้างตัวกรอง
              </Button>
              <Button onClick={fetchExpenses}>ค้นหา</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            <Card 
              key={expense.id} 
              className={`cursor-pointer ${expense.status === 'cancelled' ? 'opacity-50 bg-muted/30 hover:shadow-none' : 'hover:shadow-elegant transition-shadow'}`}
              onClick={() => handleExpenseClick(expense)}
            >
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
                        <TableHead className="text-right">จำนวนเงิน</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expense.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.category?.name}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount)}
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
                    {expense.withholding_tax_rate > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span className="text-muted-foreground">หัก ณ ที่จ่าย {expense.withholding_tax_rate}%:</span>
                        <span className="font-medium">-{formatCurrency(expense.withholding_tax_amount)}</span>
                      </div>
                    )}
                    {expense.deductions && expense.deductions.length > 0 && (
                      <>
                        <div className="text-sm font-medium border-t pt-2">รายการหัก:</div>
                        {expense.deductions.map((deduction: any) => (
                          <div key={deduction.id} className="flex justify-between text-sm text-destructive">
                            <span className="text-muted-foreground">{deduction.description}:</span>
                            <span className="font-medium">-{formatCurrency(deduction.amount)}</span>
                          </div>
                        ))}
                      </>
                    )}
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>ยอดสุทธิ:</span>
                      <span className="text-accent">{formatCurrency(expense.net_amount || expense.total_amount)}</span>
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

      {selectedExpense && (
        <LaborExpenseDetailDialog
          expense={selectedExpense}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          onSuccess={fetchExpenses}
        />
      )}
    </div>
  );
};

export default LaborAccounting;
