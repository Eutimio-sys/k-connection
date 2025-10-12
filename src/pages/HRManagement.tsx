import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FileText, ArrowLeft, Eye, Pencil, DollarSign, Plus, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { EmployeeEditDialog } from "@/components/EmployeeEditDialog";
import AddEmployeeDialog from "@/components/AddEmployeeDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const HRManagement = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [employeeToPermanentDelete, setEmployeeToPermanentDelete] = useState<any>(null);
  const [deletingPermanently, setDeletingPermanently] = useState(false);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [selectedEmployeeForTax, setSelectedEmployeeForTax] = useState<any>(null);
  const [taxFormData, setTaxFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    tax_amount: "",
    social_security_amount: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch employees with company info
      const { data: employeesData, error: employeesError } = await supabase
        .from("profiles")
        .select(`
          *,
          company:companies(name)
        `)
        .eq("is_active", true)
        .order("full_name");

      if (employeesError) throw employeesError;

      // Skip fetching roles - show all data without role-based access
      const userRolesMap: Record<string, string> = {};

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (companiesError) throw companiesError;

      setCompanies(companiesData || []);

      // Fetch all salary records
      const { data: salariesData, error: salariesError } = await supabase
        .from("salary_records")
        .select("user_id, salary_amount, effective_date")
        .order("effective_date", { ascending: false });

      if (salariesError) {
        console.error("Salary fetch error:", salariesError);
      }

      const latestSalaryByUser: Record<string, number> = {};
      (salariesData || []).forEach((rec: any) => {
        if (latestSalaryByUser[rec.user_id] === undefined) {
          latestSalaryByUser[rec.user_id] = Number(rec.salary_amount) || 0;
        }
      });

      const processedEmployees = (employeesData || []).map((emp: any) => ({
        ...emp,
        current_salary: latestSalaryByUser[emp.id] ?? null,
        role: userRolesMap[emp.id] || "worker", // Add role from user_roles table
      }));

      setEmployees(processedEmployees);

      // Fetch document requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("document_requests")
        .select(`
          *,
          user:profiles!document_requests_user_id_fkey(full_name, position, department, company_id),
          document_type:document_types(name, description),
          processor:profiles!document_requests_processed_by_fkey(full_name)
        `)
        .order("requested_at", { ascending: false });

      if (requestsError) {
        console.error("Document requests error:", requestsError);
      } else {
        setDocumentRequests(requestsData || []);
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    }

    setLoading(false);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    // Soft delete - mark as inactive instead of deleting
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", employeeToDelete.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("ปิดการใช้งานพนักงานสำเร็จ");
      // Update employees state immediately
      setEmployees(prev => prev.filter(emp => emp.id !== employeeToDelete.id));
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!employeeToPermanentDelete) return;

    setDeletingPermanently(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: employeeToPermanentDelete.id }
      });

      if (error) throw error;

      toast.success("ลบผู้ใช้ถาวรสำเร็จ");
      setEmployees(prev => prev.filter(emp => emp.id !== employeeToPermanentDelete.id));
      setPermanentDeleteDialogOpen(false);
      setEmployeeToPermanentDelete(null);
    } catch (error: any) {
      console.error("Permanent delete error:", error);
      toast.error("เกิดข้อผิดพลาด: " + (error.message || "ไม่สามารถลบผู้ใช้ได้"));
    } finally {
      setDeletingPermanently(false);
    }
  };

  const handleProcessRequest = async (requestId: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("document_requests")
        .update({
          status,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success(status === 'approved' ? "อนุมัติคำขอสำเร็จ" : status === 'completed' ? "ดำเนินการเสร็จสิ้น" : "ปฏิเสธคำขอสำเร็จ");
        fetchData();
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "รอดำเนินการ", variant: "secondary" },
      approved: { label: "อนุมัติ", variant: "default" },
      completed: { label: "เสร็จสิ้น", variant: "outline" },
      rejected: { label: "ปฏิเสธ", variant: "destructive" },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; className: string }> = {
      admin: { label: "ผู้ดูแลระบบ", className: "bg-purple-100 text-purple-800" },
      manager: { label: "ผู้จัดการ", className: "bg-blue-100 text-blue-800" },
      accountant: { label: "บัญชี", className: "bg-green-100 text-green-800" },
      purchaser: { label: "จัดซื้อ", className: "bg-orange-100 text-orange-800" },
      worker: { label: "พนักงาน", className: "bg-gray-100 text-gray-800" },
    };
    const r = roles[role] || roles.worker;
    return <span className={`px-2 py-1 rounded-full text-xs ${r.className}`}>{r.label}</span>;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const handleAddTaxRecord = async () => {
    if (!selectedEmployeeForTax) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("employee_tax_social_security")
      .insert({
        user_id: selectedEmployeeForTax.id,
        year: taxFormData.year,
        month: taxFormData.month,
        tax_amount: parseFloat(taxFormData.tax_amount) || 0,
        social_security_amount: parseFloat(taxFormData.social_security_amount) || 0,
        notes: taxFormData.notes,
        created_by: user.id,
      });

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("บันทึกข้อมูลสำเร็จ");
      setTaxDialogOpen(false);
      setTaxFormData({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        tax_amount: "",
        social_security_amount: "",
        notes: "",
      });
      fetchData();
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  }

  // Filter data based on selected company
  const filteredEmployees = selectedCompanyId === "all" 
    ? employees 
    : employees.filter(emp => emp.company_id === selectedCompanyId);

  const filteredDocumentRequests = selectedCompanyId === "all"
    ? documentRequests
    : documentRequests.filter(req => req.user?.company_id === selectedCompanyId);

  return (
    <div className="p-8 space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            จัดการทรัพยากรบุคคล
          </h1>
        </div>
        <p className="text-muted-foreground text-lg ml-14">จัดการข้อมูลพนักงานและคำขอเอกสาร</p>
      </div>

      <Card className="bg-gradient-to-r from-background to-muted/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="font-medium whitespace-nowrap">กรองตามบริษัท:</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-[300px]">
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
        </CardContent>
      </Card>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="employees">พนักงาน</TabsTrigger>
          <TabsTrigger value="salary-tax">เงินเดือน/ภาษี/ประกันสังคม</TabsTrigger>
          <TabsTrigger value="documents">คำขอเอกสาร</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                รายชื่อพนักงานทั้งหมด ({filteredEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>บริษัท</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>เบอร์โทร</TableHead>
                    <TableHead>บทบาท</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.full_name}</TableCell>
                      <TableCell>{emp.company?.name || "-"}</TableCell>
                      <TableCell>{emp.position || "-"}</TableCell>
                      <TableCell>{emp.department || "-"}</TableCell>
                      <TableCell>{emp.phone || "-"}</TableCell>
                      <TableCell>{getRoleBadge(emp.role)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setEditDialogOpen(true);
                            }}
                            className="gap-1"
                          >
                            <Pencil size={14} />
                            แก้ไข
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            className="gap-1"
                          >
                            <Eye size={14} />
                            รายละเอียด
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEmployeeToDelete(emp);
                              setDeleteDialogOpen(true);
                            }}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 size={14} />
                            ปิดใช้งาน
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary-tax">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign size={20} />
                จัดการเงินเดือน ภาษี และประกันสังคม
              </CardTitle>
              <Dialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedEmployeeForTax(null);
                      setTaxFormData({
                        year: new Date().getFullYear(),
                        month: new Date().getMonth() + 1,
                        tax_amount: "",
                        social_security_amount: "",
                        notes: "",
                      });
                    }}
                  >
                    <Plus size={16} className="mr-2" />
                    เพิ่มข้อมูล
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>บันทึกภาษีและประกันสังคม</DialogTitle>
                    <DialogDescription>แบบฟอร์มบันทึกภาษีและประกันสังคมประจำเดือนสำหรับพนักงาน</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>พนักงาน *</Label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={selectedEmployeeForTax?.id || ""}
                        onChange={(e) => {
                          const emp = filteredEmployees.find(emp => emp.id === e.target.value);
                          setSelectedEmployeeForTax(emp);
                        }}
                      >
                        <option value="">เลือกพนักงาน</option>
                        {filteredEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name} - {emp.position || "ไม่ระบุตำแหน่ง"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>ปี *</Label>
                        <Input
                          type="number"
                          value={taxFormData.year}
                          onChange={(e) => setTaxFormData({ ...taxFormData, year: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>เดือน *</Label>
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={taxFormData.month}
                          onChange={(e) => setTaxFormData({ ...taxFormData, month: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>ภาษีหัก ณ ที่จ่าย (บาท)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={taxFormData.tax_amount}
                        onChange={(e) => setTaxFormData({ ...taxFormData, tax_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>ประกันสังคม (บาท)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={taxFormData.social_security_amount}
                        onChange={(e) => setTaxFormData({ ...taxFormData, social_security_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>หมายเหตุ</Label>
                      <Input
                        value={taxFormData.notes}
                        onChange={(e) => setTaxFormData({ ...taxFormData, notes: e.target.value })}
                      />
                    </div>
                    <Button 
                      onClick={handleAddTaxRecord} 
                      className="w-full"
                      disabled={!selectedEmployeeForTax}
                    >
                      บันทึก
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>บริษัท</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead className="text-right">เงินเดือนปัจจุบัน</TableHead>
                    <TableHead className="text-right">ภาษีสะสม (ปีนี้)</TableHead>
                    <TableHead className="text-right">ประกันสังคมสะสม (ปีนี้)</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <EmployeeTaxRow key={emp.id} employee={emp} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                คำขอเอกสาร ({filteredDocumentRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDocumentRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">ยังไม่มีคำขอเอกสาร</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>พนักงาน</TableHead>
                      <TableHead>ประเภทเอกสาร</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                      <TableHead>วันที่ขอ</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocumentRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.user?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.user?.position} - {request.user?.department}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.document_type?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.document_type?.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{request.notes || "-"}</TableCell>
                        <TableCell>
                          {new Date(request.requested_at).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleProcessRequest(request.id, 'approved')}
                              >
                                อนุมัติ
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleProcessRequest(request.id, 'rejected')}
                              >
                                ปฏิเสธ
                              </Button>
                            </div>
                          )}
                          {request.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcessRequest(request.id, 'completed')}
                            >
                              ทำเสร็จแล้ว
                            </Button>
                          )}
                          {(request.status === 'completed' || request.status === 'rejected') && request.processor && (
                            <p className="text-xs text-muted-foreground">
                              โดย {request.processor.full_name}
                            </p>
                          )}
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

      {selectedEmployee && (
        <EmployeeEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          employee={selectedEmployee}
          onSuccess={fetchData}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการปิดใช้งาน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการปิดการใช้งานพนักงาน {employeeToDelete?.full_name} ใช่หรือไม่?
              <br />
              <strong>หมายเหตุ:</strong> การปิดการใช้งานจะทำให้พนักงานไม่สามารถเข้าสู่ระบบได้ แต่ยังสามารถเปิดใช้งานใหม่ได้ในภายหลัง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive hover:bg-destructive/90">
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">⚠️ ลบผู้ใช้ถาวร</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-foreground">
                คุณกำลังจะลบบัญชีผู้ใช้ {employeeToPermanentDelete?.full_name} ({employeeToPermanentDelete?.email}) <span className="text-red-600">ถาวร</span>
              </p>
              <div className="bg-red-50 dark:bg-red-950 p-3 rounded border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  ⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้!
                </p>
                <ul className="mt-2 text-xs text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>บัญชีผู้ใช้จะถูกลบออกจากระบบทั้งหมด</li>
                  <li>ข้อมูลส่วนตัว บทบาท และสิทธิ์จะถูกลบ</li>
                  <li>อีเมลนี้สามารถสร้างบัญชีใหม่ได้อีกครั้ง</li>
                  <li>ข้อมูลที่เกี่ยวข้องอาจถูกลบหรือโอนให้แอดมินคนอื่น</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPermanently}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDelete} 
              disabled={deletingPermanently}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingPermanently ? "กำลังลบ..." : "ยืนยันลบถาวร"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const EmployeeTaxRow = ({ employee }: { employee: any }) => {
  const [taxData, setTaxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTaxData = async () => {
    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from("employee_tax_social_security")
      .select("*")
      .eq("user_id", employee.id)
      .eq("year", currentYear);

    if (!error && data) {
      const totalTax = data.reduce((sum, record) => sum + parseFloat(String(record.tax_amount || 0)), 0);
      const totalSS = data.reduce((sum, record) => sum + parseFloat(String(record.social_security_amount || 0)), 0);
      setTaxData({ totalTax, totalSS });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTaxData();
  }, [employee.id]);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "฿0.00";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{employee.full_name}</TableCell>
      <TableCell>{employee.company?.name || "-"}</TableCell>
      <TableCell>{employee.position || "-"}</TableCell>
      <TableCell className="text-right font-medium text-primary">
        {formatCurrency(employee.current_salary)}
      </TableCell>
      <TableCell className="text-right">
        {loading ? "..." : formatCurrency(taxData?.totalTax || 0)}
      </TableCell>
      <TableCell className="text-right">
        {loading ? "..." : formatCurrency(taxData?.totalSS || 0)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Navigate to employee detail page
            window.location.href = `/employees/${employee.id}`;
          }}
        >
          <Eye size={14} className="mr-1" />
          ดูรายละเอียด
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default HRManagement;
