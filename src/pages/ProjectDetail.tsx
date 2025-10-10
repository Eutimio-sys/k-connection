import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Calendar, TrendingUp, Building2, User, ShoppingCart, Package, Wrench, DollarSign, Info, RefreshCcw, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import IncomeHistoryDialog from "@/components/IncomeHistoryDialog";
import ProjectChat from "@/components/ProjectChat";

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [materialExpenses, setMaterialExpenses] = useState<any[]>([]);
  const [laborExpenses, setLaborExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [projectIncome, setProjectIncome] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [materialDetailOpen, setMaterialDetailOpen] = useState(false);
  const [laborDetailOpen, setLaborDetailOpen] = useState(false);
  const [budgetBreakdownOpen, setBudgetBreakdownOpen] = useState(false);
  
  // Filter states
  const [materialStartDate, setMaterialStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [materialEndDate, setMaterialEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState("all");
  const [materialWorkerFilter, setMaterialWorkerFilter] = useState("all");
  
  const [laborStartDate, setLaborStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [laborEndDate, setLaborEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [laborCategoryFilter, setLaborCategoryFilter] = useState("all");
  const [laborWorkerFilter, setLaborWorkerFilter] = useState("all");
  
  const [workers, setWorkers] = useState<any[]>([]);
  const refreshTimeout = useRef<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  // Refresh data when page becomes visible (user returns to this tab/page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [id]);

  // ใช้ realtime แทนการ polling เพื่อลดการกระตุกของหน้า
  useEffect(() => {
    if (!id) return;
    const handleChange = () => {
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
      refreshTimeout.current = window.setTimeout(() => {
        fetchData(false);
      }, 400);
    };

    const channel = supabase
      .channel(`project-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `project_id=eq.${id}` }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labor_expenses', filter: `project_id=eq.${id}` }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_income', filter: `project_id=eq.${id}` }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_requests', filter: `project_id=eq.${id}` }, handleChange)
      .subscribe();

    return () => {
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchData = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select(`*, company:companies(name, tax_id, phone), creator:profiles!created_by(full_name)`)
      .eq("id", id)
      .single();

    if (projectError) {
      toast.error("เกิดข้อผิดพลาด");
      navigate("/projects");
    } else {
      setProject(projectData);
    }

    const { data: purchasesData } = await supabase
      .from("purchase_requests")
      .select(`*, category:expense_categories(name)`)
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    setPurchases(purchasesData || []);

    // Fetch material expenses
    const { data: materialData } = await supabase
      .from("expenses")
      .select(`
        *,
        vendor:vendors(name),
        items:expense_items(*, category:expense_categories(name))
      `)
      .eq("project_id", id)
      .order("invoice_date", { ascending: false });

    setMaterialExpenses(materialData || []);

    // Fetch labor expenses
    const { data: laborData } = await supabase
      .from("labor_expenses")
      .select(`
        *,
        worker:workers(full_name),
        items:labor_expense_items(*, category:expense_categories(name))
      `)
      .eq("project_id", id)
      .order("invoice_date", { ascending: false });

    setLaborExpenses(laborData || []);

    // Fetch categories
    const { data: categoriesData } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("name");

    setCategories(categoriesData || []);

    // Fetch workers
    const { data: workersData } = await supabase
      .from("workers")
      .select("*")
      .eq("is_active", true)
      .order("full_name");

    setWorkers(workersData || []);

    // Fetch project income
    const { data: incomeData } = await supabase
      .from("project_income")
      .select("*")
      .eq("project_id", id)
      .order("income_date", { ascending: false });

    setProjectIncome(incomeData || []);
    
    if (showLoading) setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      planning: { label: "วางแผน", variant: "secondary" },
      in_progress: { label: "กำลังดำเนินการ", variant: "default" },
      completed: { label: "เสร็จสิ้น", variant: "outline" },
      on_hold: { label: "พักงาน", variant: "secondary" },
      cancelled: { label: "ยกเลิก", variant: "destructive" },
    };
    const c = config[status] || config.planning;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  const totalPurchases = purchases.reduce((sum, p) => sum + (p.status === "approved" ? p.estimated_price : 0), 0);
  const totalMaterialExpenses = materialExpenses.reduce((sum, e) => sum + (e.status !== "cancelled" ? e.total_amount : 0), 0);
  const totalLaborExpenses = laborExpenses.reduce((sum, e) => sum + (e.status !== "cancelled" ? e.total_amount : 0), 0);
  const totalExpenses = totalPurchases + totalMaterialExpenses + totalLaborExpenses;
  const totalIncome = projectIncome.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

  // Calculate totals by category using proportional allocation to match expense totals
  const aggregateByCategory = (expensesArr: any[], getExpenseTotal: (e: any) => number) => {
    const acc: Record<string, number> = {};
    expensesArr.forEach((expense) => {
      if (expense.status === "cancelled" || !expense.items?.length) return;
      const itemsTotal = expense.items.reduce((s: number, it: any) => s + Number(it.amount || 0), 0);
      const expenseTotal = getExpenseTotal(expense);
      if (itemsTotal <= 0 || expenseTotal <= 0) return;
      const ratio = expenseTotal / itemsTotal;
      expense.items.forEach((item: any) => {
        const categoryName = item.category?.name || "อื่นๆ";
        const allocated = Number(item.amount || 0) * ratio;
        acc[categoryName] = (acc[categoryName] || 0) + allocated;
      });
    });
    return acc;
  };

  const totalMaterialByCategory = aggregateByCategory(materialExpenses, (e) => Number(e.total_amount || 0));
  const totalLaborByCategory = aggregateByCategory(laborExpenses, (e) => Number(e.net_amount || e.total_amount || 0));

  // Filter functions
  const filteredMaterialExpenses = materialExpenses.filter(expense => {
    const dateMatch = (!materialStartDate || expense.invoice_date >= materialStartDate) &&
                      (!materialEndDate || expense.invoice_date <= materialEndDate);
    const categoryMatch = !materialCategoryFilter || materialCategoryFilter === "all" ||
      expense.items?.some((item: any) => item.category_id === materialCategoryFilter);
    return dateMatch && categoryMatch;
  });

  const filteredLaborExpenses = laborExpenses.filter(expense => {
    const dateMatch = (!laborStartDate || expense.invoice_date >= laborStartDate) &&
                      (!laborEndDate || expense.invoice_date <= laborEndDate);
    const categoryMatch = !laborCategoryFilter || laborCategoryFilter === "all" ||
      expense.items?.some((item: any) => item.category_id === laborCategoryFilter);
    const workerMatch = !laborWorkerFilter || laborWorkerFilter === "all" ||
      expense.worker_id === laborWorkerFilter;
    return dateMatch && categoryMatch && workerMatch;
  });

  if (loading) return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  if (!project) return null;

  return (
    <div className="p-8 space-y-6">
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate("/projects")} className="gap-2">
          <ArrowLeft size={20} />
          กลับ
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            fetchData();
            toast.success("รีเฟรชข้อมูลแล้ว");
          }} 
          className="gap-2"
          disabled={loading}
        >
          <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
          รีเฟรช
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
          <p className="text-muted-foreground text-lg">{project.description || "ไม่มีคำอธิบาย"}</p>
        </div>
        {getStatusBadge(project.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ข้อมูลโครงการ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">สถานที่</p>
                  <p className="font-medium">{project.location || "ไม่ระบุ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">บริษัท</p>
                  <p className="font-medium">{project.company?.name || "ไม่ระบุ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">วันที่เริ่ม</p>
                  <p className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">วันที่สิ้นสุด</p>
                  <p className="font-medium">{project.end_date ? new Date(project.end_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">ผู้สร้าง</p>
                  <p className="font-medium">{project.creator?.full_name || "ไม่ทราบ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <TrendingUp className="text-primary" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">งบประมาณ</p>
                  <p className="font-semibold text-primary">{project.budget ? formatCurrency(project.budget) : "ไม่ระบุ"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สรุปการเงิน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="p-4 bg-primary/5 rounded-lg cursor-pointer hover:shadow-md transition-shadow border-2 border-primary/20"
              onClick={() => setBudgetBreakdownOpen(true)}
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-muted-foreground font-medium">ประมาณการรวมทั้งหมด</p>
                <Info size={16} className="text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary mb-1">{project.budget ? formatCurrency(project.budget) : "-"}</p>
              {project.budget_breakdown && Object.keys(project.budget_breakdown).length > 0 && (
                <p className="text-xs text-muted-foreground">คลิกเพื่อดูรายละเอียดแยกหมวดหมู่</p>
              )}
            </div>
            
            <div 
              className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setMaterialDetailOpen(true)}
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-muted-foreground font-medium">ค่าวัสดุ</p>
                <Info size={16} className="text-blue-600" />
              </div>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">{formatCurrency(totalMaterialExpenses)}</p>
              {Object.keys(totalMaterialByCategory).length > 0 && (
                <div className="space-y-1 text-sm">
                  {Object.entries(totalMaterialByCategory).slice(0, 3).map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-muted-foreground">
                      <span>• {category}</span>
                      <span>{formatCurrency(Number(amount))}</span>
                    </div>
                  ))}
                  {Object.keys(totalMaterialByCategory).length > 3 && (
                    <p className="text-xs text-muted-foreground italic">คลิกเพื่อดูทั้งหมด...</p>
                  )}
                </div>
              )}
            </div>

            <div 
              className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLaborDetailOpen(true)}
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-muted-foreground font-medium">ค่าแรง</p>
                <Info size={16} className="text-orange-600" />
              </div>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-2">{formatCurrency(totalLaborExpenses)}</p>
              {Object.keys(totalLaborByCategory).length > 0 && (
                <div className="space-y-1 text-sm">
                  {Object.entries(totalLaborByCategory).slice(0, 3).map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-muted-foreground">
                      <span>• {category}</span>
                      <span>{formatCurrency(Number(amount))}</span>
                    </div>
                  ))}
                  {Object.keys(totalLaborByCategory).length > 3 && (
                    <p className="text-xs text-muted-foreground italic">คลิกเพื่อดูทั้งหมด...</p>
                  )}
                </div>
              )}
            </div>
            
            <div 
              className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setIncomeDialogOpen(true)}
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-muted-foreground font-medium">เงินที่เบิกมาแล้ว</p>
                <DollarSign size={16} className="text-green-600" />
              </div>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">คลิกเพื่อดูประวัติ ({projectIncome.length} รายการ)</p>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-muted-foreground mb-3 font-medium">Cash Flow</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">เงินที่เบิกมา</span>
                  <span className="font-semibold text-green-600">+ {formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ค่าวัสดุ</span>
                  <span className="font-semibold text-blue-600">- {formatCurrency(totalMaterialExpenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ค่าแรง</span>
                  <span className="font-semibold text-orange-600">- {formatCurrency(totalLaborExpenses)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">คงเหลือ</span>
                    <span className={`text-xl font-bold ${
                      (totalIncome - totalMaterialExpenses - totalLaborExpenses) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(totalIncome - totalMaterialExpenses - totalLaborExpenses)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-accent/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">รวมค่าใช้จ่ายทั้งหมด</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(totalExpenses)}</p>
            </div>

            {project.budget && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">ส่วนต่างจากประมาณการ</p>
                <p className={`text-2xl font-bold ${
                  (project.budget - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(project.budget - totalExpenses)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {id && (
        <IncomeHistoryDialog
          open={incomeDialogOpen}
          onOpenChange={setIncomeDialogOpen}
          projectId={id}
          onSuccess={fetchData}
        />
      )}

      {/* Material Detail Dialog */}
      <Dialog open={materialDetailOpen} onOpenChange={setMaterialDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>รายละเอียดค่าวัสดุ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">รวมค่าวัสดุทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalMaterialExpenses)}</p>
            </div>
            {Object.entries(totalMaterialByCategory).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center p-3 border rounded-lg">
                <span className="font-medium">{category}</span>
                <span className="text-lg font-semibold text-blue-600">{formatCurrency(Number(amount))}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Budget Breakdown Detail Dialog */}
      <Dialog open={budgetBreakdownOpen} onOpenChange={setBudgetBreakdownOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดงบประมาณแยกหมวดหมู่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">งบประมาณรวมทั้งหมด</p>
              <p className="text-2xl font-bold text-primary">{project.budget ? formatCurrency(project.budget) : "-"}</p>
            </div>
            
            {project.budget_breakdown && Object.keys(project.budget_breakdown).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead className="text-right">ประมาณการ</TableHead>
                    <TableHead className="text-right">ใช้จริง</TableHead>
                    <TableHead className="text-right">คงเหลือ</TableHead>
                    <TableHead className="text-center">%ที่ใช้</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(project.budget_breakdown as Record<string, number>).map(([catId, budgetAmount]) => {
                    const category = categories.find(c => c.id === catId);
                    const categoryName = category?.name || "ไม่ระบุ";
                    
                    const materialActual = (totalMaterialByCategory[categoryName] || 0);
                    const laborActual = (totalLaborByCategory[categoryName] || 0);
                    const actualTotal = materialActual + laborActual;
                    const remaining = Number(budgetAmount) - actualTotal;
                    const percentUsed = Number(budgetAmount) > 0 ? (actualTotal / Number(budgetAmount)) * 100 : 0;
                    
                    return (
                      <TableRow key={catId}>
                        <TableCell className="font-medium">{categoryName}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(Number(budgetAmount))}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(actualTotal)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm font-semibold ${percentUsed > 100 ? 'text-red-600' : percentUsed > 80 ? 'text-orange-600' : 'text-green-600'}`}>
                              {percentUsed.toFixed(1)}%
                            </span>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${percentUsed > 100 ? 'bg-red-600' : percentUsed > 80 ? 'bg-orange-600' : 'bg-green-600'}`}
                                style={{ width: `${Math.min(percentUsed, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>รวมทั้งหมด</TableCell>
                    <TableCell className="text-right text-primary">
                      {formatCurrency(Object.values(project.budget_breakdown as Record<string, number>).reduce((sum, val) => sum + Number(val || 0), 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalMaterialExpenses + totalLaborExpenses)}
                    </TableCell>
                    <TableCell className={`text-right ${
                      (Object.values(project.budget_breakdown as Record<string, number>).reduce((sum, val) => sum + Number(val || 0), 0) - totalMaterialExpenses - totalLaborExpenses) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(
                        Object.values(project.budget_breakdown as Record<string, number>).reduce((sum, val) => sum + Number(val || 0), 0) - 
                        totalMaterialExpenses - 
                        totalLaborExpenses
                      )}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">ไม่มีข้อมูลงบประมาณแยกหมวดหมู่</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Labor Detail Dialog */}
      <Dialog open={laborDetailOpen} onOpenChange={setLaborDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>รายละเอียดค่าแรง</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">รวมค่าแรงทั้งหมด</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalLaborExpenses)}</p>
            </div>
            {Object.entries(totalLaborByCategory).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center p-3 border rounded-lg">
                <span className="font-medium">{category}</span>
                <span className="text-lg font-semibold text-orange-600">{formatCurrency(Number(amount))}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="purchases" className="gap-2">
            <ShoppingCart size={16} />
            ใบขอซื้อ
          </TabsTrigger>
          <TabsTrigger value="material" className="gap-2">
            <Package size={16} />
            บัญชีวัสดุ
          </TabsTrigger>
          <TabsTrigger value="labor" className="gap-2">
            <Wrench size={16} />
            บัญชีค่าแรง
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageCircle size={16} />
            แชท
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart size={20} />
                ใบขอซื้อ ({purchases.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ยังไม่มีใบขอซื้อ</p>
              ) : (
                <div className="space-y-3">
                  {purchases.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium">{p.item_name}</p>
                        <p className="text-sm text-muted-foreground">{p.quantity} {p.unit} • {p.category?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-accent">{formatCurrency(p.estimated_price)}</p>
                        <Badge variant={p.status === "approved" ? "default" : p.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                          {p.status === "approved" ? "อนุมัติ" : p.status === "pending" ? "รออนุมัติ" : "ปฏิเสธ"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package size={20} />
                บัญชีวัสดุ ({filteredMaterialExpenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <div>
                  <span className="text-sm text-muted-foreground">ตั้งแต่วันที่</span>
                  <Input 
                    type="date" 
                    value={materialStartDate}
                    onChange={(e) => setMaterialStartDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">ถึงวันที่</span>
                  <Input 
                    type="date" 
                    value={materialEndDate}
                    onChange={(e) => setMaterialEndDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">หมวดหมู่</span>
                  <Select value={materialCategoryFilter} onValueChange={setMaterialCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="หมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {categories.filter(cat => ['material', 'labor_contractor', 'other'].includes(cat.category_type)).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredMaterialExpenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ไม่พบรายการ</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่ใบแจ้งหนี้</TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead>ร้านค้า</TableHead>
                      <TableHead>รายการ</TableHead>
                      <TableHead className="text-right">จำนวนเงิน</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterialExpenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.invoice_number}</TableCell>
                        <TableCell>{new Date(expense.invoice_date).toLocaleDateString("th-TH")}</TableCell>
                        <TableCell>{expense.vendor?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {expense.items?.map((item: any) => (
                              <div key={item.id} className="text-sm">
                                <span className="font-medium">{item.category?.name}</span>
                                <span className="text-muted-foreground"> - {item.description}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(expense.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={expense.status === 'paid' ? 'default' : 'secondary'}>
                            {expense.status === 'paid' ? 'จ่ายแล้ว' : 'รอจ่าย'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labor" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench size={20} />
                บัญชีค่าแรง ({filteredLaborExpenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <div>
                  <span className="text-sm text-muted-foreground">ตั้งแต่วันที่</span>
                  <Input 
                    type="date" 
                    value={laborStartDate}
                    onChange={(e) => setLaborStartDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">ถึงวันที่</span>
                  <Input 
                    type="date" 
                    value={laborEndDate}
                    onChange={(e) => setLaborEndDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">หมวดหมู่</span>
                  <Select value={laborCategoryFilter} onValueChange={setLaborCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="หมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {categories.filter(cat => ['labor', 'labor_contractor'].includes(cat.category_type)).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">ช่าง</span>
                  <Select value={laborWorkerFilter} onValueChange={setLaborWorkerFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="เลือกช่าง" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {workers.map(worker => (
                        <SelectItem key={worker.id} value={worker.id}>{worker.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredLaborExpenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ไม่พบรายการ</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่ใบเสร็จ</TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead>ช่าง</TableHead>
                      <TableHead>รายการ</TableHead>
                      <TableHead className="text-right">จำนวนเงิน</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLaborExpenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.invoice_number}</TableCell>
                        <TableCell>{new Date(expense.invoice_date).toLocaleDateString("th-TH")}</TableCell>
                        <TableCell>{expense.worker?.full_name || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {expense.items?.map((item: any) => (
                              <div key={item.id} className="text-sm">
                                <span className="font-medium">{item.category?.name}</span>
                                <span className="text-muted-foreground"> - {item.description}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(expense.net_amount || expense.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={expense.status === 'paid' ? 'default' : 'secondary'}>
                            {expense.status === 'paid' ? 'จ่ายแล้ว' : 'รอจ่าย'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          {id && <ProjectChat projectId={id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
