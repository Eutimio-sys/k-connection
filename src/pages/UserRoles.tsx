import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, UserCog, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  position: string | null;
  department: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface Feature {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
}

interface RolePermission {
  id: string;
  role: string;
  feature_code: string;
  can_access: boolean;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function UserRoles() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleData, setNewRoleData] = useState({ code: '', name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, position, department")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at");

      if (rolesError) throw rolesError;

      // Fetch all roles from roles table
      const { data: allRolesData, error: allRolesError } = await supabase
        .from("roles")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (allRolesError) throw allRolesError;

      // Fetch all features
      const { data: featuresData, error: featuresError } = await supabase
        .from("features")
        .select("*")
        .eq("is_active", true)
        .order("category, name");

      if (featuresError) throw featuresError;

      // Fetch role permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("role_permissions")
        .select("*");

      if (permissionsError) throw permissionsError;

      setUsers(profilesData || []);
      setUserRoles(rolesData || []);
      setRoles(allRolesData || []);
      setFeatures(featuresData || []);
      setRolePermissions(permissionsData || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserRoles = (userId: string): string[] => {
    return userRoles
      .filter(ur => ur.user_id === userId)
      .map(ur => ur.role);
  };

  const handleAddRole = async (userId: string, roleCode: string) => {
    try {
      setSaving(userId);
      
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: roleCode,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error("ผู้ใช้มีบทบาทนี้อยู่แล้ว");
        } else {
          throw error;
        }
      } else {
        toast.success("เพิ่มบทบาทสำเร็จ");
        await fetchData();
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveRole = async (userId: string, roleCode: string) => {
    try {
      setSaving(userId);
      
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", roleCode);

      if (error) throw error;

      toast.success("ลบบทบาทสำเร็จ");
      await fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(null);
    }
  };

  const getRoleBadgeVariant = (roleCode: string) => {
    switch (roleCode) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "accountant":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (roleCode: string) => {
    const role = roles.find(r => r.code === roleCode);
    return role?.name || roleCode;
  };


  const hasPermission = (roleCode: string, featureCode: string): boolean => {
    const permission = rolePermissions.find(
      p => p.role === roleCode && p.feature_code === featureCode
    );
    return permission?.can_access || false;
  };

  const handleTogglePermission = async (roleCode: string, featureCode: string, currentValue: boolean) => {
    try {
      setSaving(`${roleCode}-${featureCode}`);

      // Check if permission exists
      const existing = rolePermissions.find(
        p => p.role === roleCode && p.feature_code === featureCode
      );

      if (existing) {
        // Update existing permission
        const { error } = await supabase
          .from("role_permissions")
          .update({ can_access: !currentValue })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new permission
        const { error } = await supabase
          .from("role_permissions")
          .insert({
            role: roleCode,
            feature_code: featureCode,
            can_access: !currentValue
          });

        if (error) throw error;
      }

      toast.success("อัปเดตสิทธิ์สำเร็จ");
      await fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(null);
    }
  };

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">จัดการสิทธิ์ผู้ใช้</h1>
          <p className="text-muted-foreground">กำหนดบทบาทและสิทธิ์การเข้าถึงของผู้ใช้ในระบบ</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">
            <UserCog className="h-4 w-4 mr-2" />
            จัดการสิทธิ์ผู้ใช้
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Settings className="h-4 w-4 mr-2" />
            จัดการสิทธิ์ตาม Role
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                รายการผู้ใช้และบทบาท
              </CardTitle>
              <CardDescription>
                คุณสามารถกำหนดบทบาทได้หลายบทบาทต่อผู้ใช้หนึ่งคน
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>บทบาทปัจจุบัน</TableHead>
                    <TableHead>เพิ่มบทบาท</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const userRolesList = getUserRoles(user.id);
                    const isSaving = saving === user.id;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.position || "-"}</TableCell>
                        <TableCell>{user.department || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userRolesList.length === 0 ? (
                              <Badge variant="outline">ไม่มีบทบาท</Badge>
                            ) : (
                              userRolesList.map((roleCode) => (
                                <Badge
                                  key={roleCode}
                                  variant={getRoleBadgeVariant(roleCode)}
                                  className="cursor-pointer hover:opacity-80"
                                  onClick={() => handleRemoveRole(user.id, roleCode)}
                                >
                                  {getRoleLabel(roleCode)} ×
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={isSaving}
                            onValueChange={(value) => handleAddRole(user.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="เลือกบทบาท" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles
                                .filter(role => !userRolesList.includes(role.code))
                                .map((role) => (
                                  <SelectItem key={role.code} value={role.code}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>คำอธิบายบทบาท</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {roles.map(role => (
                <div key={role.code} className="flex items-start gap-2">
                  <Badge variant={getRoleBadgeVariant(role.code)}>{role.name}</Badge>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                จัดการสิทธิ์การเข้าถึงตามบทบาท
              </CardTitle>
              <CardDescription>
                กำหนดว่าแต่ละบทบาทสามารถเข้าถึงฟีเจอร์ใดได้บ้าง
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">ฟีเจอร์</TableHead>
                        {roles.map(role => (
                          <TableHead key={role.code} className="text-center">
                            {role.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryFeatures.map((feature) => (
                        <TableRow key={feature.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{feature.name}</div>
                              {feature.description && (
                                <div className="text-xs text-muted-foreground">
                                  {feature.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          {roles.map(role => {
                            const hasAccess = hasPermission(role.code, feature.code);
                            const isSaving = saving === `${role.code}-${feature.code}`;
                            
                            return (
                              <TableCell key={role.code} className="text-center">
                                <Switch
                                  checked={hasAccess}
                                  disabled={isSaving}
                                  onCheckedChange={() => handleTogglePermission(role.code, feature.code, hasAccess)}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
