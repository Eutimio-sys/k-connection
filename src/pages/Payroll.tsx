import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Payroll = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchEmployees();
  }, []);

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

    // Initialize form data with current salary
    const initialFormData: Record<string, any> = {};
    processedEmployees.forEach((emp) => {
      initialFormData[emp.id] = {
        salary: emp.current_salary || "",
        tax: "",
        social_security: "",
        notes: "",
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      };
    });

    setEmployees(processedEmployees);
    setFormData(initialFormData);
    setLoading(false);
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
      toast.error("กรุณาเข้าสระบบ");
      setSaving(null);
      return;
    }

    const empData = formData[employeeId];
    
    try {
      // Save tax and social security record
      const { error: taxError } = await supabase
        .from("employee_tax_social_security")
        .upsert({
          user_id: employeeId,
          year: empData.year,
          month: empData.month,
          tax_amount: parseFloat(empData.tax) || 0,
          social_security_amount: parseFloat(empData.social_security) || 0,
          notes: empData.notes,
          created_by: user.id,
        }, {
          onConflict: 'user_id,year,month'
        });

      if (taxError) throw taxError;

      toast.success("บันทึกข้อมูลสำเร็จ");
      
      // Clear form for this employee
      setFormData(prev => ({
        ...prev,
        [employeeId]: {
          salary: prev[employeeId].salary,
          tax: "",
          social_security: "",
          notes: "",
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        },
      }));
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

      <div className="space-y-4">
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
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">เงินเดือนปัจจุบัน</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(employee.current_salary)}
                  </p>
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
                    placeholder="0.00"
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
              <div className="mt-4">
                <Label>หมายเหตุ</Label>
                <Textarea
                  placeholder="หมายเหตุเพิ่มเติม..."
                  value={formData[employee.id]?.notes || ""}
                  onChange={(e) => handleInputChange(employee.id, "notes", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Payroll;
