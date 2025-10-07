import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ExpenseDialog from "@/components/ExpenseDialog";
import ExpenseDetailDialog from "@/components/ExpenseDetailDialog";
import { Plus, FileText, ExternalLink, Edit, Filter } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Accounting = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    projectId: "all",
    vendorId: "all",
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    fetchExpenses();
    fetchFilterData();
  }, []);

  const fetchFilterData = async () => {
    const [projectsRes, vendorsRes] = await Promise.all([
      supabase.from("projects").select("id, name").order("name"),
      supabase.from("vendors").select("id, name").eq("is_active", true).order("name"),
    ]);
    setProjects(projectsRes.data || []);
    setVendors(vendorsRes.data || []);
  };

  const fetchExpenses = async () => {
    setLoading(true);
    let query = supabase
      .from("expenses")
      .select(`
        *,
        vendor:vendors(name),
        project:projects(name),
        company:companies(name),
        expense_items(
          *,
          category:expense_categories(name)
        )
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
    if (filters.vendorId && filters.vendorId !== "all") {
      query = query.eq("vendor_id", filters.vendorId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      console.error(error);
    } else {
      // Fetch creator and updater profiles separately
      const expensesWithProfiles = await Promise.all(
        (data || []).map(async (expense) => {
          const profiles: any = {};
          
          if (expense.created_by) {
            const { data: creator } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .eq('id', expense.created_by)
              .maybeSingle();
            profiles.created_by_profile = creator;
          }
          
          if (expense.updated_by) {
            const { data: updater } = await supabase
              .from('profiles')
              .select('id, full_name, email')
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
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      paid: "default",
      rejected: "destructive",
      cancelled: "outline",
    };
    const labels: Record<string, string> = {
      pending: "รอดำเนินการ",
      approved: "อนุมัติแล้ว",
      paid: "จ่ายแล้ว",
      rejected: "ปฏิเสธ",
      cancelled: "ยกเลิก",
    };
    return <Badge variant={variants[status]}>{labels[status] || status}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const handleExpenseClick = (expense: any) => {
    setSelectedExpense(expense);
    setDetailDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            บัญชีวัสดุ
          </h1>
          <p className="text-muted-foreground text-lg">จัดการค่าใช้จ่ายวัสดุและอุปกรณ์</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="h-4 w-4" />
            ตัวกรอง
          </Button>
          <ExpenseDialog onSuccess={fetchExpenses}>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              เพิ่มบิล/ค่าใช้จ่าย
            </Button>
          </ExpenseDialog>
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
                <Label>ร้านค้า</Label>
                <Select value={filters.vendorId} onValueChange={(value) => setFilters({ ...filters, vendorId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Button variant="outline" onClick={() => setFilters({ startDate: "", endDate: "", projectId: "all", vendorId: "all" })}>
                ล้างตัวกรอง
              </Button>
              <Button onClick={fetchExpenses}>ค้นหา</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </CardContent>
        </Card>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">ยังไม่มีรายการค่าใช้จ่าย</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense) => (
            <Card 
              key={expense.id}
              className={expense.status === 'cancelled' ? 'opacity-50 bg-muted/30' : ''}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-2">
                      เลขที่บิล:{" "}
                      <button
                        onClick={() => handleExpenseClick(expense)}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        {expense.invoice_number}
                      </button>
                      {expense.tax_invoice_number && (
                        <span className="text-sm text-muted-foreground ml-2">
                          (พิม: {expense.tax_invoice_number})
                        </span>
                      )}
                    </CardTitle>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>ร้านค้า: <span className="font-medium text-foreground">{expense.vendor?.name || "-"}</span></p>
                      <p>โครงการ: <span className="font-medium text-foreground">{expense.project?.name}</span></p>
                      <p>บริษัท: <span className="font-medium text-foreground">{expense.company?.name}</span></p>
                      <p>วันที่: <span className="font-medium text-foreground">{format(new Date(expense.invoice_date), "dd/MM/yyyy")}</span></p>
                      {expense.receipt_image_url && (
                        <p className="flex items-center gap-1">
                          <a 
                            href={expense.receipt_image_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            ดูรูปบิล <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(expense.status)}
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        ยอดรวม: <span className="font-medium text-foreground">{formatCurrency(expense.subtotal)}</span>
                      </p>
                      <p className="text-muted-foreground">
                        VAT {expense.vat_rate}%: <span className="font-medium text-foreground">{formatCurrency(expense.vat_amount)}</span>
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(expense.total_amount)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">รายการค่าใช้จ่าย:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>หมวดหมู่</TableHead>
                        <TableHead>รายละเอียด</TableHead>
                        <TableHead className="text-right">ราคา/หน่วย</TableHead>
                        <TableHead className="text-right">จำนวน</TableHead>
                        <TableHead className="text-right">ยอดรวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expense.expense_items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">{item.category?.name}</Badge>
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {expense.notes && (
                    <div className="pt-2 text-sm text-muted-foreground">
                      <span className="font-medium">หมายเหตุ:</span> {expense.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedExpense && (
        <ExpenseDetailDialog
          expense={selectedExpense}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          onSuccess={fetchExpenses}
        />
      )}
    </div>
  );
};

export default Accounting;
