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

const Approvals = () => {
  const navigate = useNavigate();
  const [laborExpenses, setLaborExpenses] = useState<any[]>([]);
  const [materialExpenses, setMaterialExpenses] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPendingItems();
  }, []);

  const fetchAllPendingItems = async () => {
    setLoading(true);

    // Fetch pending labor expenses
    const { data: laborData } = await supabase
      .from("labor_expenses")
      .select(`
        *,
        worker:workers(full_name),
        project:projects(name),
        company:companies(name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // Fetch pending material expenses
    const { data: materialData } = await supabase
      .from("expenses")
      .select(`
        *,
        vendor:vendors(name),
        project:projects(name),
        company:companies(name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // Fetch pending leave requests
    const { data: leaveData } = await supabase
      .from("leave_requests")
      .select(`
        *,
        user:profiles!leave_requests_user_id_fkey(full_name, position, department)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setLaborExpenses(laborData || []);
    setMaterialExpenses(materialData || []);
    setLeaveRequests(leaveData || []);
    setLoading(false);
  };

  const handleLaborApproval = async (id: string, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("labor_expenses")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด");
    } else {
      toast.success(status === "approved" ? "อนุมัติสำเร็จ" : "ปฏิเสธสำเร็จ");
      fetchAllPendingItems();
    }
  };

  const handleMaterialApproval = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("expenses")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด");
    } else {
      toast.success(status === "approved" ? "อนุมัติสำเร็จ" : "ปฏิเสธสำเร็จ");
      fetchAllPendingItems();
    }
  };

  const handleLeaveApproval = async (id: string, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด");
    } else {
      toast.success(status === "approved" ? "อนุมัติสำเร็จ" : "ปฏิเสธสำเร็จ");
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
                        <TableCell className="font-medium">{expense.invoice_number}</TableCell>
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
                              onClick={() => handleLaborApproval(expense.id, "approved")}
                              className="gap-1"
                            >
                              <CheckCircle size={14} />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleLaborApproval(expense.id, "rejected")}
                              className="gap-1"
                            >
                              <XCircle size={14} />
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
                        <TableCell className="font-medium">{expense.invoice_number}</TableCell>
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
                              onClick={() => handleMaterialApproval(expense.id, "approved")}
                              className="gap-1"
                            >
                              <CheckCircle size={14} />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleMaterialApproval(expense.id, "rejected")}
                              className="gap-1"
                            >
                              <XCircle size={14} />
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
                        <TableCell className="font-medium">{request.user?.full_name}</TableCell>
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
                              onClick={() => handleLeaveApproval(request.id, "approved")}
                              className="gap-1"
                            >
                              <CheckCircle size={14} />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleLeaveApproval(request.id, "rejected")}
                              className="gap-1"
                            >
                              <XCircle size={14} />
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
    </div>
  );
};

export default Approvals;
