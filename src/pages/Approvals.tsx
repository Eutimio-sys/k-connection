import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, FileText, Users, Calendar, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import ExpenseDetailDialog from "@/components/ExpenseDetailDialog";
import LaborExpenseDetailDialog from "@/components/LaborExpenseDetailDialog";
import LeaveRequestDetailDialog from "@/components/LeaveRequestDetailDialog";

const Approvals = () => {
  const navigate = useNavigate();
  const [laborExpenses, setLaborExpenses] = useState<any[]>([]);
  const [materialExpenses, setMaterialExpenses] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLaborExpense, setSelectedLaborExpense] = useState<any>(null);
  const [selectedMaterialExpense, setSelectedMaterialExpense] = useState<any>(null);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<any>(null);
  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  useEffect(() => {
    fetchAllPendingItems();
  }, []);

  const fetchAllPendingItems = async () => {
    setLoading(true);

    // Fetch pending labor expenses with full details
    const { data: laborData } = await supabase
      .from("labor_expenses")
      .select(`
        *,
        worker:workers(full_name),
        project:projects(name),
        company:companies(name),
        labor_expense_items(*),
        labor_expense_deductions(*)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // Fetch pending material expenses with full details
    const { data: materialData } = await supabase
      .from("expenses")
      .select(`
        *,
        vendor:vendors(name),
        project:projects(name),
        company:companies(name),
        expense_items(*)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // Fetch pending leave requests with approver info
    const { data: leaveData } = await supabase
      .from("leave_requests")
      .select(`
        *,
        user:profiles!leave_requests_user_id_fkey(full_name, position, department),
        approver:profiles!leave_requests_approved_by_fkey(full_name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // Fetch category names for labor expense items
    const laborWithCategories = await Promise.all(
      (laborData || []).map(async (expense) => {
        const itemsWithCategories = await Promise.all(
          (expense.labor_expense_items || []).map(async (item: any) => {
            const { data: category } = await supabase
              .from('expense_categories')
              .select('name')
              .eq('id', item.category_id)
              .single();
            return { ...item, category };
          })
        );
        return { ...expense, labor_expense_items: itemsWithCategories };
      })
    );

    // Fetch category names for material expense items
    const materialWithCategories = await Promise.all(
      (materialData || []).map(async (expense) => {
        const itemsWithCategories = await Promise.all(
          (expense.expense_items || []).map(async (item: any) => {
            const { data: category } = await supabase
              .from('expense_categories')
              .select('name')
              .eq('id', item.category_id)
              .single();
            return { ...item, category };
          })
        );
        return { ...expense, expense_items: itemsWithCategories };
      })
    );

    // Fetch profiles for labor expenses
    const laborWithProfiles = await Promise.all(
      (laborWithCategories || []).map(async (expense) => {
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

    // Fetch profiles for material expenses
    const materialWithProfiles = await Promise.all(
      (materialWithCategories || []).map(async (expense) => {
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

    // Fetch profiles for leave requests
    const leaveWithProfiles = await Promise.all(
      (leaveData || []).map(async (request) => {
        const profiles: any = {};
        
        if (request.updated_by) {
          const { data: updater } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', request.updated_by)
            .maybeSingle();
          profiles.updated_by_profile = updater;
        }
        
        return { ...request, ...profiles };
      })
    );

    setLaborExpenses(laborWithProfiles);
    setMaterialExpenses(materialWithProfiles);
    setLeaveRequests(leaveWithProfiles);
    setLoading(false);
  };

  const handleLaborClick = (expense: any) => {
    setSelectedLaborExpense(expense);
    setLaborDialogOpen(true);
  };

  const handleMaterialClick = (expense: any) => {
    setSelectedMaterialExpense(expense);
    setMaterialDialogOpen(true);
  };

  const handleLeaveClick = (request: any) => {
    setSelectedLeaveRequest(request);
    setLeaveDialogOpen(true);
  };

  const handleApproveLaborExpense = async (expenseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("labor_expenses")
      .update({ 
        status: "approved", 
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", expenseId);

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการอนุมัติ");
      console.error(error);
    } else {
      toast.success("อนุมัติสำเร็จ");
      fetchAllPendingItems();
    }
  };

  const handleRejectLaborExpense = async (expenseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("labor_expenses")
      .update({ 
        status: "rejected", 
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", expenseId);

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการปฏิเสธ");
      console.error(error);
    } else {
      toast.success("ปฏิเสธสำเร็จ");
      fetchAllPendingItems();
    }
  };

  const handleApproveMaterialExpense = async (expenseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("expenses")
      .update({ 
        status: "approved", 
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", expenseId);

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการอนุมัติ");
      console.error(error);
    } else {
      toast.success("อนุมัติสำเร็จ");
      fetchAllPendingItems();
    }
  };

  const handleRejectMaterialExpense = async (expenseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("expenses")
      .update({ 
        status: "rejected", 
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", expenseId);

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการปฏิเสธ");
      console.error(error);
    } else {
      toast.success("ปฏิเสธสำเร็จ");
      fetchAllPendingItems();
    }
  };

  const handleApproveLeaveRequest = async (requestId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("leave_requests")
      .update({ 
        status: "approved", 
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการอนุมัติ");
      console.error(error);
    } else {
      toast.success("อนุมัติสำเร็จ");
      fetchAllPendingItems();
    }
  };

  const handleRejectLeaveRequest = async (requestId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("leave_requests")
      .update({ 
        status: "rejected", 
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการปฏิเสธ");
      console.error(error);
    } else {
      toast.success("ปฏิเสธสำเร็จ");
      fetchAllPendingItems();
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  const totalPending = laborExpenses.length + materialExpenses.length + leaveRequests.length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              อนุมัติรายการ
            </h1>
            <p className="text-muted-foreground text-lg">
              รายการที่รออนุมัติทั้งหมด: {totalPending} รายการ
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="labor" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="labor" className="gap-2">
            <Users className="h-4 w-4" />
            บัญชีค่าแรง ({laborExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="material" className="gap-2">
            <FileText className="h-4 w-4" />
            บัญชีวัสดุ ({materialExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            <Calendar className="h-4 w-4" />
            คำขอลา ({leaveRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="labor" className="space-y-4 mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">กำลังโหลด...</p>
              </CardContent>
            </Card>
          ) : laborExpenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">ไม่มีรายการที่รออนุมัติ</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่</TableHead>
                      <TableHead>ช่าง</TableHead>
                      <TableHead>โครงการ</TableHead>
                      <TableHead>บริษัท</TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead className="text-right">จำนวนเงิน</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laborExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => handleLaborClick(expense)}
                            className="text-primary hover:underline cursor-pointer"
                          >
                            {expense.invoice_number}
                          </button>
                        </TableCell>
                        <TableCell>{expense.worker?.full_name || "-"}</TableCell>
                        <TableCell>{expense.project?.name}</TableCell>
                        <TableCell>{expense.company?.name}</TableCell>
                        <TableCell>{format(new Date(expense.invoice_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right font-semibold text-accent">
                          {formatCurrency(expense.net_amount || expense.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleApproveLaborExpense(expense.id)}
                              variant="success"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRejectLaborExpense(expense.id)}
                              variant="destructive"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              ปฏิเสธ
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="material" className="space-y-4 mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">กำลังโหลด...</p>
              </CardContent>
            </Card>
          ) : materialExpenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">ไม่มีรายการที่รออนุมัติ</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่บิล</TableHead>
                      <TableHead>ร้านค้า</TableHead>
                      <TableHead>โครงการ</TableHead>
                      <TableHead>บริษัท</TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead className="text-right">จำนวนเงิน</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => handleMaterialClick(expense)}
                            className="text-primary hover:underline cursor-pointer"
                          >
                            {expense.invoice_number}
                          </button>
                        </TableCell>
                        <TableCell>{expense.vendor?.name || "-"}</TableCell>
                        <TableCell>{expense.project?.name}</TableCell>
                        <TableCell>{expense.company?.name}</TableCell>
                        <TableCell>{format(new Date(expense.invoice_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right font-semibold text-accent">
                          {formatCurrency(expense.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleApproveMaterialExpense(expense.id)}
                              variant="success"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRejectMaterialExpense(expense.id)}
                              variant="destructive"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              ปฏิเสธ
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leave" className="space-y-4 mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">กำลังโหลด...</p>
              </CardContent>
            </Card>
          ) : leaveRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">ไม่มีรายการที่รออนุมัติ</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>พนักงาน</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                      <TableHead>ประเภทการลา</TableHead>
                      <TableHead>วันที่เริ่มต้น</TableHead>
                      <TableHead>วันที่สิ้นสุด</TableHead>
                      <TableHead>จำนวนวัน</TableHead>
                      <TableHead>เหตุผล</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => handleLeaveClick(request)}
                            className="text-primary hover:underline cursor-pointer"
                          >
                            {request.user?.full_name}
                          </button>
                        </TableCell>
                        <TableCell>{request.user?.position || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {
                              {
                                sick: "ลาป่วย",
                                personal: "ลากิจ",
                                vacation: "ลาพักร้อน",
                                maternity: "ลาคลอด",
                                unpaid: "ลาไม่รับค่าจ้าง",
                              }[request.leave_type] || request.leave_type
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(request.start_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{format(new Date(request.end_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{request.days_count} วัน</TableCell>
                        <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleApproveLeaveRequest(request.id)}
                              variant="success"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRejectLeaveRequest(request.id)}
                              variant="destructive"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              ปฏิเสธ
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialogs */}
      {selectedLaborExpense && (
        <LaborExpenseDetailDialog
          expense={selectedLaborExpense}
          open={laborDialogOpen}
          onOpenChange={setLaborDialogOpen}
          onSuccess={fetchAllPendingItems}
          showApprovalButtons={true}
        />
      )}

      {selectedMaterialExpense && (
        <ExpenseDetailDialog
          expense={selectedMaterialExpense}
          open={materialDialogOpen}
          onOpenChange={setMaterialDialogOpen}
          onSuccess={fetchAllPendingItems}
        />
      )}

      {selectedLeaveRequest && (
        <LeaveRequestDetailDialog
          request={selectedLeaveRequest}
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
          onSuccess={fetchAllPendingItems}
          showApprovalButtons={true}
        />
      )}
    </div>
  );
};

export default Approvals;
