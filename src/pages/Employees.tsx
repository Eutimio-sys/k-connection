import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

const Employees = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile) setUserRole(profile.role);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) toast.error("เกิดข้อผิดพลาด");
    else setEmployees(data || []);
    setLoading(false);
  };

  const handleUpdateRole = async (employeeId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole as "admin" | "manager" | "accountant" | "purchaser" | "worker" })
      .eq("id", employeeId);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("อัปเดตบทบาทสำเร็จ");
      fetchData();
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      admin: { label: "ผู้ดูแลระบบ", variant: "destructive" },
      manager: { label: "ผู้จัดการ", variant: "default" },
      accountant: { label: "บัญชี", variant: "secondary" },
      purchaser: { label: "จัดซื้อ", variant: "outline" },
      worker: { label: "พนักงาน", variant: "secondary" },
    };
    const config = roleConfig[role] || roleConfig.worker;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canManageRoles = userRole === "admin";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            จัดการพนักงาน
          </h1>
          <p className="text-muted-foreground text-lg">บริหารข้อมูลพนักงานและสิทธิ์การเข้าถึง</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">พนักงานทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ผู้ดูแลระบบ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {employees.filter(e => e.role === "admin").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ผู้จัดการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {employees.filter(e => e.role === "manager").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">พนักงานทั่วไป</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {employees.filter(e => e.role === "worker").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            รายชื่อพนักงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">กำลังโหลด...</p>
          ) : employees.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">ยังไม่มีข้อมูลพนักงาน</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>วันที่สมัคร</TableHead>
                  {canManageRoles && <TableHead className="text-right">จัดการ</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.full_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-muted-foreground" />
                        {employee.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-muted-foreground" />
                          {employee.phone}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{getRoleBadge(employee.role)}</TableCell>
                    <TableCell>
                      {new Date(employee.created_at).toLocaleDateString("th-TH")}
                    </TableCell>
                    {canManageRoles && (
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedEmployee(employee)}
                            >
                              แก้ไข
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>แก้ไขบทบาท - {employee.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>บทบาท</Label>
                                <Select 
                                  defaultValue={employee.role}
                                  onValueChange={(value) => handleUpdateRole(employee.id, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                                    <SelectItem value="manager">ผู้จัดการ</SelectItem>
                                    <SelectItem value="accountant">บัญชี</SelectItem>
                                    <SelectItem value="purchaser">จัดซื้อ</SelectItem>
                                    <SelectItem value="worker">พนักงาน</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p><strong>ผู้ดูแลระบบ:</strong> สิทธิ์เต็มทุกอย่าง</p>
                                <p><strong>ผู้จัดการ:</strong> จัดการโครงการ, อนุมัติใบขอซื้อ</p>
                                <p><strong>บัญชี:</strong> จัดการการเงิน, บัญชี</p>
                                <p><strong>จัดซื้อ:</strong> สร้างใบขอซื้อ</p>
                                <p><strong>พนักงาน:</strong> ดูข้อมูลพื้นฐาน</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Employees;
