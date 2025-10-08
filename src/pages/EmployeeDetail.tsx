import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, DollarSign, Calendar, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [taxRecords, setTaxRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    salary_amount: "",
    effective_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch employee profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (profileError) {
      toast.error("เกิดข้อผิดพลาด");
      navigate("/employees");
      return;
    }

    setEmployee(profileData);

    // Fetch salary records
    const { data: salaryData, error: salaryError } = await supabase
      .from("salary_records")
      .select("*, creator:created_by(full_name)")
      .eq("user_id", id)
      .order("effective_date", { ascending: false });

    if (salaryError) {
      console.error("Salary error:", salaryError);
    }

    setSalaryRecords(salaryData || []);

    // Fetch tax and social security records
    const { data: taxData } = await supabase
      .from("employee_tax_social_security")
      .select("*")
      .eq("user_id", id)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    setTaxRecords(taxData || []);

    // Fetch leave requests
    const { data: leaveData } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    setLeaveRequests(leaveData || []);

    // Fetch leave balance
    const currentYear = new Date().getFullYear();
    const { data: balanceData } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("user_id", id)
      .eq("year", currentYear)
      .maybeSingle();

    setLeaveBalance(balanceData);
    setLoading(false);
  };

  const handleAddSalary = async () => {
    if (!salaryForm.salary_amount || !salaryForm.effective_date) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("salary_records")
      .insert({
        user_id: id,
        salary_amount: parseFloat(salaryForm.salary_amount),
        effective_date: salaryForm.effective_date,
        notes: salaryForm.notes,
        created_by: user.id,
      });

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("เพิ่มข้อมูลเงินเดือนสำเร็จ");
      setDialogOpen(false);
      setSalaryForm({ salary_amount: "", effective_date: new Date().toISOString().split('T')[0], notes: "" });
      fetchData();
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  const getLeaveTypeBadge = (type: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      vacation: { label: "ลาพักร้อน", variant: "default" },
      sick: { label: "ลาป่วย", variant: "secondary" },
      personal: { label: "ลากิจ", variant: "outline" },
    };
    const c = config[type] || config.personal;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      pending: { label: "รออนุมัติ", variant: "secondary" },
      approved: { label: "อนุมัติ", variant: "default" },
      rejected: { label: "ปฏิเสธ", variant: "destructive" },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  if (loading) return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  if (!employee) return null;

  const currentSalary = salaryRecords.length > 0 ? salaryRecords[0] : null;

  return (
    <div className="p-8 space-y-6">
      <Button variant="outline" onClick={() => navigate("/employees")} className="gap-2">
        <ArrowLeft size={20} />
        กลับ
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">{employee.full_name}</h1>
          <p className="text-muted-foreground text-lg">{employee.position || "ไม่ระบุตำแหน่ง"} • {employee.department || "ไม่ระบุแผนก"}</p>
        </div>
        <Badge variant="default">{employee.role === 'admin' ? 'ผู้ดูแลระบบ' : employee.role === 'manager' ? 'ผู้จัดการ' : employee.role === 'accountant' ? 'บัญชี' : employee.role === 'purchaser' ? 'จัดซื้อ' : 'พนักงาน'}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">เงินเดือนปัจจุบัน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {currentSalary ? formatCurrency(currentSalary.salary_amount) : "ไม่ระบุ"}
            </div>
            {currentSalary && (
              <p className="text-xs text-muted-foreground mt-1">
                ตั้งแต่ {new Date(currentSalary.effective_date).toLocaleDateString("th-TH")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">วันที่เริ่มงาน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">วันลาคงเหลือ</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveBalance ? (
              <div className="space-y-1">
                <p className="text-sm">พักร้อน: {leaveBalance.vacation_days - leaveBalance.vacation_used} วัน</p>
                <p className="text-sm">ป่วย: {leaveBalance.sick_days - leaveBalance.sick_used} วัน</p>
                <p className="text-sm">กิจ: {leaveBalance.personal_days - leaveBalance.personal_used} วัน</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info" className="gap-2">
            <User size={16} />
            ข้อมูลส่วนตัว
          </TabsTrigger>
          <TabsTrigger value="salary" className="gap-2">
            <DollarSign size={16} />
            ประวัติเงินเดือน
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            <Calendar size={16} />
            ประวัติการลา
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลพนักงาน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>อีเมล</Label>
                  <p className="mt-1">{employee.email}</p>
                </div>
                <div>
                  <Label>เบอร์โทรศัพท์</Label>
                  <p className="mt-1">{employee.phone || "-"}</p>
                </div>
                <div>
                  <Label>เลขบัตรประชาชน</Label>
                  <p className="mt-1">{employee.id_card || "-"}</p>
                </div>
                <div>
                  <Label>วันเกิด</Label>
                  <p className="mt-1">{employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString("th-TH") : "-"}</p>
                </div>
                <div className="col-span-2">
                  <Label>ที่อยู่</Label>
                  <p className="mt-1">{employee.address || "-"}</p>
                </div>
                <div>
                  <Label>ผู้ติดต่อฉุกเฉิน</Label>
                  <p className="mt-1">{employee.emergency_contact || "-"}</p>
                </div>
                <div>
                  <Label>เบอร์ฉุกเฉิน</Label>
                  <p className="mt-1">{employee.emergency_phone || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ประวัติการปรับเงินเดือน</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus size={16} className="mr-2" />
                    เพิ่มข้อมูลเงินเดือน
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>เพิ่มข้อมูลเงินเดือน</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>จำนวนเงิน (บาท) *</Label>
                      <Input
                        type="number"
                        value={salaryForm.salary_amount}
                        onChange={(e) => setSalaryForm({ ...salaryForm, salary_amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>วันที่มีผล *</Label>
                      <Input
                        type="date"
                        value={salaryForm.effective_date}
                        onChange={(e) => setSalaryForm({ ...salaryForm, effective_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>หมายเหตุ</Label>
                      <Input
                        value={salaryForm.notes}
                        onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                        placeholder="เช่น การปรับเงินประจำปี"
                      />
                    </div>
                    <Button onClick={handleAddSalary} className="w-full">
                      บันทึก
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {salaryRecords.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">ยังไม่มีข้อมูลเงินเดือน</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">ประวัติเงินเดือน</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>วันที่มีผล</TableHead>
                          <TableHead className="text-right">จำนวนเงิน</TableHead>
                          <TableHead>หมายเหตุ</TableHead>
                          <TableHead>บันทึกโดย</TableHead>
                          <TableHead>วันที่บันทึก</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaryRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {new Date(record.effective_date).toLocaleDateString("th-TH")}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              {formatCurrency(record.salary_amount)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {record.notes || "-"}
                            </TableCell>
                            <TableCell>
                              {salaryRecords.find(s => s.id === record.id)?.creator?.full_name || "-"}
                            </TableCell>
                            <TableCell>
                              {new Date(record.created_at).toLocaleDateString("th-TH")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">ประวัติภาษีและประกันสังคม</h3>
                    {taxRecords.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">ยังไม่มีข้อมูลภาษีและประกันสังคม</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ปี/เดือน</TableHead>
                            <TableHead className="text-right">ภาษี</TableHead>
                            <TableHead className="text-right">ประกันสังคม</TableHead>
                            <TableHead className="text-right">รวม</TableHead>
                            <TableHead>หมายเหตุ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taxRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {record.month}/{record.year}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {formatCurrency(record.tax_amount)}
                              </TableCell>
                              <TableCell className="text-right text-orange-600">
                                {formatCurrency(record.social_security_amount)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(record.tax_amount + record.social_security_amount)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {record.notes || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>ประวัติการลา</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">ยังไม่มีประวัติการลา</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>วันที่เริ่ม</TableHead>
                      <TableHead>วันที่สิ้นสุด</TableHead>
                      <TableHead>จำนวนวัน</TableHead>
                      <TableHead>เหตุผล</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{getLeaveTypeBadge(request.leave_type)}</TableCell>
                        <TableCell>
                          {new Date(request.start_date).toLocaleDateString("th-TH")}
                        </TableCell>
                        <TableCell>
                          {new Date(request.end_date).toLocaleDateString("th-TH")}
                        </TableCell>
                        <TableCell className="font-medium">{request.days_count} วัน</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.reason}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
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

export default EmployeeDetail;
