import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Employees = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  type Role = Database["public"]["Enums"]["user_role"];
  const sb = supabase as any;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [usersRes, featuresRes, permissionsRes] = await Promise.all([
      sb.from("profiles").select("*").order("full_name"),
      sb.from("features").select("*").eq("is_active", true).order("category, name"),
      sb.from("role_permissions").select("*"),
    ]);

    if (usersRes.error) toast.error("เกิดข้อผิดพลาด: " + usersRes.error.message);
    else setUsers(usersRes.data || []);

    if (featuresRes.error) toast.error("เกิดข้อผิดพลาด: " + featuresRes.error.message);
    else setFeatures(featuresRes.data || []);

    if (permissionsRes.error) toast.error("เกิดข้อผิดพลาด: " + permissionsRes.error.message);
    else setRolePermissions(permissionsRes.data || []);

    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("อัพเดท role สำเร็จ");
      fetchData();
    }
  };

  const handlePermissionToggle = async (role: string, featureCode: string, currentValue: boolean) => {
    const existing = rolePermissions.find(
      (p) => p.role === role && p.feature_code === featureCode
    );

    if (existing) {
      const { error } = await sb
        .from("role_permissions")
        .update({ can_access: !currentValue })
        .eq("id", existing.id);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("อัพเดทสิทธิ์สำเร็จ");
        fetchData();
      }
    } else {
      const { error } = await sb
        .from("role_permissions")
        .insert({ role, feature_code: featureCode, can_access: true });

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("เพิ่มสิทธิ์สำเร็จ");
        fetchData();
      }
    }
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
    return <Badge className={r.className}>{r.label}</Badge>;
  };

  const hasPermission = (role: string, featureCode: string) => {
    const perm = rolePermissions.find(
      (p) => p.role === role && p.feature_code === featureCode
    );
    return perm ? perm.can_access : false;
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    const category = feature.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, any[]>);

  const categoryLabels: Record<string, string> = {
    general: "ทั่วไป",
    management: "การจัดการ",
    accounting: "บัญชี",
    hr: "ทรัพยากรบุคคล",
    other: "อื่นๆ",
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
              จัดการ Users & สิทธิ์
            </h1>
          </div>
          <p className="text-muted-foreground text-lg ml-14">
            จัดการผู้ใช้งาน บทบาท และสิทธิ์การเข้าถึงฟีเจอร์ต่างๆ
          </p>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            ผู้ใช้งานทั้งหมด ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>ตำแหน่ง</TableHead>
                <TableHead>แผนก</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead className="text-right">เปลี่ยน Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.position || "-"}</TableCell>
                  <TableCell>{user.department || "-"}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-right">
                    <select
                      className="border rounded-md p-1 text-sm"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    >
                      <option value="worker">พนักงาน</option>
                      <option value="purchaser">จัดซื้อ</option>
                      <option value="accountant">บัญชี</option>
                      <option value="manager">ผู้จัดการ</option>
                      <option value="admin">ผู้ดูแลระบบ</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} />
            จัดการสิทธิ์ตาม Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {(Object.entries(groupedFeatures) as [string, any[]][]) 
              .map(([category, categoryFeatures]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-4">
                  {categoryLabels[category] || category}
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/3">ฟีเจอร์</TableHead>
                        <TableHead className="text-center">Admin</TableHead>
                        <TableHead className="text-center">Manager</TableHead>
                        <TableHead className="text-center">Accountant</TableHead>
                        <TableHead className="text-center">Purchaser</TableHead>
                        <TableHead className="text-center">Worker</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryFeatures.map((feature) => (
                        <TableRow key={feature.code}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{feature.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {feature.description}
                              </p>
                            </div>
                          </TableCell>
                          {["admin", "manager", "accountant", "purchaser", "worker"].map(
                            (role) => (
                              <TableCell key={role} className="text-center">
                                <Checkbox
                                  checked={hasPermission(role, feature.code)}
                                  onCheckedChange={() =>
                                    handlePermissionToggle(
                                      role,
                                      feature.code,
                                      hasPermission(role, feature.code)
                                    )
                                  }
                                />
                              </TableCell>
                            )
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Employees;
