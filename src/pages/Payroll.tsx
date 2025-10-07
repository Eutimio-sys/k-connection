import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, DollarSign, History } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Payroll = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchEmployees();
    fetchHistory();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate]);

  const fetchEmployees = async () => {
    setLoading(true);
    
    // Fetch all employees with their latest salary and tax data
    const { data: employeesData, error: employeesError } = await supabase
      .from("profiles")
      .select(`
        *,
        salary_records(salary_amount, effective_date)
      `)
      .order("full_name");

    if (employeesError) {
      toast.error("เกิดข้อผิดพลาด: " + employeesError.message);
      setLoading(false);
      return;
    }

    // Get current year and month
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Calculate previous month
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Process employees to get latest salary
    const processedEmployees = (employeesData || []).map((emp: any) => {
      const salaries = emp.salary_records || [];
      const latestSalary = salaries.sort(
        (a: any, b: any) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
      )[0];
      return {
        ...emp,
        current_salary: latestSalary?.salary_amount || 0,
      };
    });

    // Fetch previous month's tax data for each employee
    const userIds = processedEmployees.map(emp => emp.id);
    const { data: previousTaxData } = await supabase
      .from("employee_tax_social_security")
      .select("*")
      .in("user_id", userIds)
      .eq("year", previousYear)
      .eq("month", previousMonth);

    // Create a map of previous tax data by user_id
    const previousTaxMap = (previousTaxData || []).reduce((acc: any, record: any) => {
      acc[record.user_id] = record.tax_amount || 0;
      return acc;
    }, {});

    // Initialize form data with current salary and previous tax
    const initialFormData: Record<string, any> = {};
    processedEmployees.forEach((emp) => {
      initialFormData[emp.id] = {
        salary: emp.current_salary || 0,
        tax: previousTaxMap[emp.id] || 0,
        social_security: 750,
        year: currentYear,
        month: currentMonth,
      };
    });

    setEmployees(processedEmployees);
    setFormData(initialFormData);
    setLoading(false);
  };

  const fetchHistory = async () => {
    // Step 1: fetch records only from employee_tax_social_security
    const { data: ets, error: etsError } = await supabase
      .from("employee_tax_social_security")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    if (etsError) {
      toast.error("เกิดข้อผิดพลาด: " + etsError.message);
      return;
    }

    // Step 2: fetch related profiles in a separate query
    const userIds = Array.from(new Set((ets || []).map((r: any) => r.user_id))).filter(Boolean);
    let profilesMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, position, department")
        .in("id", userIds as string[]);
      if (profErr) {
        toast.error("เกิดข้อผิดพลาด: " + profErr.message);
      } else {
        profilesMap = (profs || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Step 3: merge data client-side
    const merged = (ets || []).map((r: any) => ({
      ...r,
      user: profilesMap[r.user_id] || null,
    }));

    setHistoryData(merged);
  };

  const handleInputChange = (employeeId: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (employeeId: string) => {
    setSaving(employeeId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      setSaving(null);
      return;
    }

    const empData = formData[employeeId];
    
    try {
      // Save tax and social security record using upsert with proper conflict handling
      const { error: taxError } = await supabase
        .from("employee_tax_social_security")
        .upsert({
          user_id: employeeId,
          year: parseInt(empData.year),
          month: parseInt(empData.month),
          tax_amount: parseFloat(empData.tax) || 0,
          social_security_amount: parseFloat(empData.social_security) || 0,
          created_by: user.id,
        }, {
          onConflict: 'user_id,year,month'
        });

      if (taxError) throw taxError;

      toast.success("บันทึกข้อมูลสำเร็จ");
      fetchHistory();
      
      // Refresh to get new previous month data
      fetchEmployees();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    }
    
    setSaving(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const getTotalSummary = () => {
    const total = {
      salary: 0,
      tax: 0,
      socialSecurity: 0,
      netPay: 0,
    };

    historyData.forEach((record) => {
      const emp = employees.find(e => e.id === record.user_id);
      const salary = emp?.current_salary || 0;
      const tax = Number(record.tax_amount) || 0;
      const socialSecurity = Number(record.social_security_amount) || 0;
      
      total.salary += salary;
      total.tax += tax;
      total.socialSecurity += socialSecurity;
      total.netPay += (salary - tax - socialSecurity);
    });

    return total;
  };

  if (loading) {
    return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              บัญชีเงินเดือน
            </h1>
          </div>
          <p className="text-muted-foreground text-lg ml-14">
            จัดการเงินเดือน ภาษี และประกันสังคมพนักงาน
          </p>
        </div>
      </div>

      <Tabs defaultValue="entry" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="entry">บันทึกข้อมูล</TabsTrigger>
          <TabsTrigger value="history">ประวัติ</TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-4">
          {employees.map((employee) => (
            <Card key={employee.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-lg">{employee.full_name}</p>
                      <p className="text-sm font-normal text-muted-foreground">
                        {employee.position || "ไม่ระบุตำแหน่ง"} - {employee.department || "ไม่ระบุแผนก"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div>
                      <p className="text-sm text-muted-foreground">เงินเดือน</p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(employee.current_salary)}
                      </p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">ยอดจ่ายคงเหลือ</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(
                          employee.current_salary - 
                          (parseFloat(formData[employee.id]?.tax) || 0) - 
                          (parseFloat(formData[employee.id]?.social_security) || 0)
                        )}
                      </p>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label>ปี</Label>
                    <Input
                      type="number"
                      value={formData[employee.id]?.year || ""}
                      onChange={(e) => handleInputChange(employee.id, "year", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>เดือน</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={formData[employee.id]?.month || ""}
                      onChange={(e) => handleInputChange(employee.id, "month", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>ภาษีหัก ณ ที่จ่าย (บาท)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData[employee.id]?.tax || ""}
                      onChange={(e) => handleInputChange(employee.id, "tax", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>ประกันสังคม (บาท)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="750"
                      value={formData[employee.id]?.social_security || ""}
                      onChange={(e) => handleInputChange(employee.id, "social_security", e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleSave(employee.id)}
                      disabled={saving === employee.id}
                      className="w-full"
                    >
                      <Save size={16} className="mr-2" />
                      {saving === employee.id ? "กำลังบันทึก..." : "บันทึก"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History size={20} />
                ประวัติการจ่ายเงินเดือน
              </CardTitle>
              <div className="flex items-end gap-4 mt-4">
                <div className="flex-1">
                  <Label>วันที่เริ่มต้น</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>วันที่สิ้นสุด</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {historyData.length > 0 ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-blue-50 dark:bg-blue-950">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">ยอดรวมเงินเดือน</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(getTotalSummary().salary)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 dark:bg-red-950">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">ยอดรวมภาษี</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(getTotalSummary().tax)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 dark:bg-orange-950">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">ยอดรวมประกันสังคม</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {formatCurrency(getTotalSummary().socialSecurity)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 dark:bg-green-950">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">ยอดจ่ายคงเหลือ</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(getTotalSummary().netPay)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* History Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่บันทึก</TableHead>
                        <TableHead>พนักงาน</TableHead>
                        <TableHead>ตำแหน่ง</TableHead>
                        <TableHead>ปี/เดือน</TableHead>
                        <TableHead className="text-right">เงินเดือน</TableHead>
                        <TableHead className="text-right">ภาษี</TableHead>
                        <TableHead className="text-right">ประกันสังคม</TableHead>
                        <TableHead className="text-right">ยอดจ่ายคงเหลือ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((record) => {
                        const emp = employees.find(e => e.id === record.user_id);
                        const salary = emp?.current_salary || 0;
                        const tax = Number(record.tax_amount) || 0;
                        const socialSecurity = Number(record.social_security_amount) || 0;
                        const netPay = salary - tax - socialSecurity;
                        
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              {new Date(record.created_at).toLocaleDateString("th-TH")}
                            </TableCell>
                            <TableCell className="font-medium">
                              {record.user?.full_name || "-"}
                            </TableCell>
                            <TableCell>{record.user?.position || "-"}</TableCell>
                            <TableCell>
                              {record.month}/{record.year}
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">
                              {formatCurrency(salary)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(tax)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              {formatCurrency(socialSecurity)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(netPay)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  ไม่พบข้อมูลในช่วงเวลาที่เลือก
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payroll;
