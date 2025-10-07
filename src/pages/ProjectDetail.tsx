import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Calendar, TrendingUp, Building2, User, ShoppingCart, Package, Wrench } from "lucide-react";
import { toast } from "sonner";

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [materialExpenses, setMaterialExpenses] = useState<any[]>([]);
  const [laborExpenses, setLaborExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [materialDateFilter, setMaterialDateFilter] = useState("");
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState("");
  const [laborDateFilter, setLaborDateFilter] = useState("");
  const [laborCategoryFilter, setLaborCategoryFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    
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
    setLoading(false);
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
  const totalMaterialExpenses = materialExpenses.reduce((sum, e) => sum + (e.status === "paid" ? e.total_amount : 0), 0);
  const totalLaborExpenses = laborExpenses.reduce((sum, e) => sum + (e.status === "paid" ? e.total_amount : 0), 0);
  const totalExpenses = totalPurchases + totalMaterialExpenses + totalLaborExpenses;

  // Filter functions
  const filteredMaterialExpenses = materialExpenses.filter(expense => {
    const dateMatch = !materialDateFilter || expense.invoice_date === materialDateFilter;
    const categoryMatch = !materialCategoryFilter || 
      expense.items?.some((item: any) => item.category_id === materialCategoryFilter);
    return dateMatch && categoryMatch;
  });

  const filteredLaborExpenses = laborExpenses.filter(expense => {
    const dateMatch = !laborDateFilter || expense.invoice_date === laborDateFilter;
    const categoryMatch = !laborCategoryFilter || 
      expense.items?.some((item: any) => item.category_id === laborCategoryFilter);
    return dateMatch && categoryMatch;
  });

  if (loading) return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  if (!project) return null;

  return (
    <div className="p-8 space-y-6">
      <Button variant="outline" onClick={() => navigate("/projects")} className="gap-2">
        <ArrowLeft size={20} />
        กลับ
      </Button>

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
            <CardTitle>สรุปค่าใช้จ่าย</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">งบประมาณ</p>
              <p className="text-2xl font-bold text-primary">{project.budget ? formatCurrency(project.budget) : "-"}</p>
            </div>
            
            <div className="p-4 bg-accent/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">ค่าใช้จ่ายที่อนุมัติแล้ว</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(totalExpenses)}</p>
            </div>

            {project.budget && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">คงเหลือ</p>
                <p className="text-2xl font-bold">{formatCurrency(project.budget - totalExpenses)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package size={20} />
                  บัญชีวัสดุ ({filteredMaterialExpenses.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={materialDateFilter}
                    onChange={(e) => setMaterialDateFilter(e.target.value)}
                    className="w-40"
                  />
                  <Select value={materialCategoryFilter} onValueChange={setMaterialCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="หมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">ทั้งหมด</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench size={20} />
                  บัญชีค่าแรง ({filteredLaborExpenses.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={laborDateFilter}
                    onChange={(e) => setLaborDateFilter(e.target.value)}
                    className="w-40"
                  />
                  <Select value={laborCategoryFilter} onValueChange={setLaborCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="หมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">ทั้งหมด</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
