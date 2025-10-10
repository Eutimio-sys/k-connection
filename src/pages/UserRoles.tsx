import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, UserCog, Settings, Trash2, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [inactiveUsers, setInactiveUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleData, setNewRoleData] = useState({ code: '', name: '', description: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    full_name: '',
    position: '',
    department: '',
    phone: '',
    id_card: '',
    role: 'worker'
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch active users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, position, department")
        .eq("is_active", true)
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch inactive users (soft deleted)
      const { data: inactiveProfilesData, error: inactiveError } = await supabase
        .from("profiles")
        .select("id, full_name, email, position, department")
        .eq("is_active", false)
        .order("full_name");

      if (inactiveError) throw inactiveError;

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
      setInactiveUsers(inactiveProfilesData || []);
      setUserRoles(rolesData || []);
      setRoles(allRolesData || []);
      setFeatures(featuresData || []);
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

  const handleChangeRole = async (userId: string, newRoleCode: string) => {
    try {
      setSaving(userId);
      
      // ลบ role เก่าทั้งหมดของ user
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // เพิ่ม role ใหม่
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: newRoleCode,
        });

      if (insertError) throw insertError;

      toast.success("เปลี่ยนบทบาทสำเร็จ");
      await fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setSaving(userToDelete.id);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("กรุณาเข้าสู่ระบบก่อน");
        return;
      }

      // Call edge function to delete user from auth
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("ลบผู้ใช้ออกจากระบบสำเร็จ");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      
      // Update local state immediately
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setInactiveUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setUserRoles(prev => prev.filter(ur => ur.user_id !== userToDelete.id));
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password || !newUserData.full_name) {
      toast.error("กรุณากรอกอีเมล รหัสผ่าน และชื่อ-นามสกุล");
      return;
    }

    if (newUserData.password.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: newUserData
      });

      if (error) throw error;

      toast.success("เพิ่มผู้ใช้สำเร็จ");
      setAddUserDialogOpen(false);
      setNewUserData({
        email: '',
        password: '',
        full_name: '',
        position: '',
        department: '',
        phone: '',
        id_card: '',
        role: 'worker'
      });
      await fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setCreatingUser(false);
    }
  };



  const getRoleBadgeVariant = (roleCode: string) => {
    switch (roleCode) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "project_manager":
        return "default";
      case "foreman":
        return "secondary";
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <UserCog className="h-4 w-4 mr-2" />
            จัดการสิทธิ์ผู้ใช้
          </TabsTrigger>
          <TabsTrigger value="deleted">
            <UserCog className="h-4 w-4 mr-2" />
            ผู้ใช้ที่ถูกลบ ({inactiveUsers.length})
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Settings className="h-4 w-4 mr-2" />
            จัดการสิทธิ์ตาม Role
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    รายการผู้ใช้และบทบาท
                  </CardTitle>
                  <CardDescription>
                    ผู้ใช้แต่ละคนสามารถมีได้เพียง 1 บทบาทเท่านั้น
                  </CardDescription>
                </div>
                <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      เพิ่มผู้ใช้
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
                      <DialogDescription>
                        กรอกข้อมูลผู้ใช้ใหม่และกำหนดบทบาท
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">อีเมล *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                          placeholder="example@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">รหัสผ่าน *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUserData.password}
                          onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                          placeholder="อย่างน้อย 6 ตัวอักษร"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full_name">ชื่อ-นามสกุล *</Label>
                        <Input
                          id="full_name"
                          value={newUserData.full_name}
                          onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                          placeholder="นาย/นาง/นางสาว..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">บทบาท *</Label>
                        <Select
                          value={newUserData.role}
                          onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกบทบาท" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.code} value={role.code}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position">ตำแหน่ง</Label>
                        <Input
                          id="position"
                          value={newUserData.position}
                          onChange={(e) => setNewUserData({ ...newUserData, position: e.target.value })}
                          placeholder="เช่น พนักงาน, หัวหน้างาน"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">แผนก</Label>
                        <Input
                          id="department"
                          value={newUserData.department}
                          onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                          placeholder="เช่น ก่อสร้าง, บัญชี"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                        <Input
                          id="phone"
                          value={newUserData.phone}
                          onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                          placeholder="0xx-xxx-xxxx"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="id_card">เลขบัตรประชาชน</Label>
                        <Input
                          id="id_card"
                          value={newUserData.id_card}
                          onChange={(e) => setNewUserData({ ...newUserData, id_card: e.target.value })}
                          placeholder="x-xxxx-xxxxx-xx-x"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setAddUserDialogOpen(false)}
                        disabled={creatingUser}
                      >
                        ยกเลิก
                      </Button>
                      <Button onClick={handleCreateUser} disabled={creatingUser}>
                        {creatingUser ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>เลือกบทบาท</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const userRolesList = getUserRoles(user.id);
                    const currentRole = userRolesList[0] || null;
                    const isSaving = saving === user.id;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.position || "-"}</TableCell>
                        <TableCell>{user.department || "-"}</TableCell>
                        <TableCell>
                          <Select
                            disabled={isSaving}
                            value={currentRole || ""}
                            onValueChange={(value) => handleChangeRole(user.id, value)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="เลือกบทบาท">
                                {currentRole ? getRoleLabel(currentRole) : "เลือกบทบาท"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.code} value={role.code}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteDialogOpen(true);
                            }}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 size={14} />
                            ลบ
                          </Button>
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

        <TabsContent value="deleted" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                ผู้ใช้ที่ถูกลบชั่วคราว ({inactiveUsers.length})
              </CardTitle>
              <CardDescription>
                ผู้ใช้เหล่านี้ยังสามารถ login ได้ กดลบเพื่อลบออกจากระบบอย่างถาวร
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inactiveUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ไม่มีผู้ใช้ที่ถูกลบชั่วคราว</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ-นามสกุล</TableHead>
                      <TableHead>อีเมล</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                      <TableHead>แผนก</TableHead>
                      <TableHead className="text-right">ลบอย่างถาวร</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveUsers.map((user) => {
                      const isSaving = saving === user.id;
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.position || "-"}</TableCell>
                          <TableCell>{user.department || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteDialogOpen(true);
                              }}
                              className="gap-1"
                            >
                              <Trash2 size={14} />
                              {isSaving ? "กำลังลบ..." : "ลบอย่างถาวร"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
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
                กำหนดว่าแต่ละบทบาทสามารถเข้าถึงฟีเจอร์ใดได้บ้าง แบ่งตามหมวดหมู่ของระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <h3 className="text-lg font-semibold">
                      {category === 'general' && '🔧 ทั่วไป'}
                      {category === 'hr' && '👥 ทรัพยากรบุคคล'}
                      {category === 'accounting' && '💰 บัญชี'}
                      {category === 'management' && '📊 จัดการ'}
                      {category === 'communication' && '💬 สื่อสาร'}
                      {!['general', 'hr', 'accounting', 'management', 'communication'].includes(category) && category}
                    </h3>
                    <Badge variant="outline">{categoryFeatures.length} ฟีเจอร์</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[280px] sticky left-0 bg-background z-10">ฟีเจอร์</TableHead>
                          {roles.map(role => (
                            <TableHead key={role.code} className="text-center min-w-[100px]">
                              <Badge variant={getRoleBadgeVariant(role.code)} className="whitespace-nowrap">
                                {role.name}
                              </Badge>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryFeatures.map((feature) => (
                          <TableRow key={feature.id} className="hover:bg-muted/50">
                            <TableCell className="sticky left-0 bg-background">
                              <div>
                                <div className="font-medium">{feature.name}</div>
                                {feature.description && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
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
                                  <div className="flex items-center justify-center">
                                    <Switch
                                      checked={hasAccess}
                                      disabled={isSaving}
                                      onCheckedChange={() => handleTogglePermission(role.code, feature.code, hasAccess)}
                                    />
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ <strong>{userToDelete?.full_name}</strong> ออกจากระบบ?
              <br />
              การดำเนินการนี้จะลบข้อมูลทั้งหมดของผู้ใช้และไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบผู้ใช้
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
