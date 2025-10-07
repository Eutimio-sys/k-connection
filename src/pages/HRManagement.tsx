import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const HRManagement = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all employees
    const { data: employeesData, error: employeesError } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    if (employeesError) {
      toast.error("เกิดข้อผิดพลาด");
    } else {
      setEmployees(employeesData || []);
    }

    // Fetch document requests
    const { data: requestsData, error: requestsError } = await supabase
      .from("document_requests")
      .select(`
        *,
        user:profiles!document_requests_user_id_fkey(full_name, position, department),
        document_type:document_types(name, description),
        processor:profiles!document_requests_processed_by_fkey(full_name)
      `)
      .order("requested_at", { ascending: false });

    if (requestsError) {
      toast.error("เกิดข้อผิดพลาด");
    } else {
      setDocumentRequests(requestsData || []);
    }

    setLoading(false);
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
              จัดการทรัพยากรบุคคล
            </h1>
          </div>
          <p className="text-muted-foreground text-lg ml-14">จัดการข้อมูลพนักงานและคำขอเอกสาร</p>
        </div>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="employees">พนักงาน</TabsTrigger>
          <TabsTrigger value="documents">คำขอเอกสาร</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                รายชื่อพนักงานทั้งหมด ({employees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>เบอร์โทร</TableHead>
                    <TableHead>บทบาท</TableHead>
                    <TableHead>วันที่เริ่มงาน</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.full_name}</TableCell>
                      <TableCell>{emp.position || "-"}</TableCell>
                      <TableCell>{emp.department || "-"}</TableCell>
                      <TableCell>{emp.phone || "-"}</TableCell>
                      <TableCell>{getRoleBadge(emp.role)}</TableCell>
                      <TableCell>
                        {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString("th-TH") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/employees/${emp.id}`)}
                          className="gap-1"
                        >
                          <Eye size={14} />
                          รายละเอียด
                        </Button>
                      </TableCell>
                    </TableRow>
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
                คำขอเอกสาร ({documentRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documentRequests.length === 0 ? (
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
                    {documentRequests.map((request) => (
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
    </div>
  );
};

export default HRManagement;
