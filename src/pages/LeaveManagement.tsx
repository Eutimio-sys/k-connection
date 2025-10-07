import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const LeaveManagement = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [formData, setFormData] = useState({
    leave_type: "vacation",
    start_date: "",
    end_date: "",
    reason: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (profile) setUserRole(profile.role);

      // Fetch leave balance
      const currentYear = new Date().getFullYear();
      const { data: balanceData } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", currentYear)
        .maybeSingle();

      setBalance(balanceData);

      // Fetch leave requests
      const query = supabase
        .from("leave_requests")
        .select(`
          *,
          user:profiles!leave_requests_user_id_fkey(full_name, position, department),
          approver:profiles!leave_requests_approved_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (profile?.role === 'worker') {
        query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        toast.error("เกิดข้อผิดพลาด");
      } else {
        setRequests(data || []);
      }
    }
    setLoading(false);
  };

  // Realtime updates for balances and requests
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_balances' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async () => {
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const daysCount = calculateDays(formData.start_date, formData.end_date);
      
      const { error } = await supabase
        .from("leave_requests")
        .insert({
          user_id: user.id,
          leave_type: formData.leave_type as any,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_count: daysCount,
          reason: formData.reason,
        });

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("ยื่นคำขอลาสำเร็จ");
        setDialogOpen(false);
        setFormData({
          leave_type: "vacation",
          start_date: "",
          end_date: "",
          reason: "",
        });
        fetchData();
      }
    }
  };

  const handleApprove = async (requestId: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Read the leave request first
    const { data: leaveRequest } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (!leaveRequest) {
      toast.error("ไม่พบข้อมูลคำขอลา");
      return;
    }

    const { error: updateError } = await supabase
      .from("leave_requests")
      .update({
        status,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      toast.error("เกิดข้อผิดพลาด: " + updateError.message);
      return;
    }

    // If approved, update leave_balances
    if (status === 'approved') {
      const year = new Date(leaveRequest.start_date).getFullYear();
      const { data: balance } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("user_id", leaveRequest.user_id)
        .eq("year", year)
        .maybeSingle();

      if (balance) {
        let field = '';
        if (leaveRequest.leave_type === 'vacation') field = 'vacation_used';
        else if (leaveRequest.leave_type === 'sick') field = 'sick_used';
        else if (leaveRequest.leave_type === 'personal') field = 'personal_used';

        if (field) {
          const { error: balErr } = await supabase
            .from("leave_balances")
            .update({ [field]: Number(balance[field] || 0) + Number(leaveRequest.days_count) })
            .eq("user_id", leaveRequest.user_id)
            .eq("year", year);

          if (balErr) {
            toast.error("อนุมัติแล้ว แต่ไม่สามารถอัพเดทยอดวันลาได้");
          }
        }
      }
    }

    toast.success(status === 'approved' ? "อนุมัติคำขอลาสำเร็จ" : "ปฏิเสธคำขอลาสำเร็จ");
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "รออนุมัติ", variant: "secondary" },
      approved: { label: "อนุมัติ", variant: "default" },
      rejected: { label: "ปฏิเสธ", variant: "destructive" },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getLeaveTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      sick: "ลาป่วย",
      personal: "ลากิจ",
      vacation: "ลาพักร้อน",
      maternity: "ลาคลอด",
      unpaid: "ลาไม่รับค่าจ้าง",
    };
    return types[type] || type;
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            ระบบลา
          </h1>
          <p className="text-muted-foreground text-lg">จัดการคำขอลาและดูสถิติการลา</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus size={20} />
              ยื่นคำขอลา
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>ยื่นคำขอลา</DialogTitle>
              <DialogDescription>กรอกข้อมูลการลา</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ประเภทการลา</Label>
                <Select value={formData.leave_type} onValueChange={(value) => setFormData({ ...formData, leave_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">ลาป่วย</SelectItem>
                    <SelectItem value="personal">ลากิจ</SelectItem>
                    <SelectItem value="vacation">ลาพักร้อน</SelectItem>
                    <SelectItem value="maternity">ลาคลอด</SelectItem>
                    <SelectItem value="unpaid">ลาไม่รับค่าจ้าง</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>วันที่เริ่มต้น</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>วันที่สิ้นสุด</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              {formData.start_date && formData.end_date && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    จำนวนวัน: <span className="font-semibold">{calculateDays(formData.start_date, formData.end_date)} วัน</span>
                  </p>
                </div>
              )}

              <div>
                <Label>เหตุผลในการลา</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                ยื่นคำขอ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">ลาป่วย</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balance.sick_days - balance.sick_used} / {balance.sick_days}
              </div>
              <p className="text-xs text-muted-foreground mt-1">วันที่เหลือ / จำนวนทั้งหมด</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">ลากิจ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balance.personal_days - balance.personal_used} / {balance.personal_days}
              </div>
              <p className="text-xs text-muted-foreground mt-1">วันที่เหลือ / จำนวนทั้งหมด</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">ลาพักร้อน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balance.vacation_days - balance.vacation_used} / {balance.vacation_days}
              </div>
              <p className="text-xs text-muted-foreground mt-1">วันที่เหลือ / จำนวนทั้งหมด</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} />
            รายการคำขอลา
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">กำลังโหลด...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">ยังไม่มีคำขอลา</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {userRole !== 'worker' && <TableHead>พนักงาน</TableHead>}
                  <TableHead>ประเภท</TableHead>
                  <TableHead>วันที่เริ่มต้น</TableHead>
                  <TableHead>วันที่สิ้นสุด</TableHead>
                  <TableHead>จำนวนวัน</TableHead>
                  <TableHead>เหตุผล</TableHead>
                  <TableHead>สถานะ</TableHead>
                  {(userRole === 'admin' || userRole === 'manager') && <TableHead className="text-right">จัดการ</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    {userRole !== 'worker' && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.user?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.user?.position}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{getLeaveTypeLabel(request.leave_type)}</TableCell>
                    <TableCell>{new Date(request.start_date).toLocaleDateString("th-TH")}</TableCell>
                    <TableCell>{new Date(request.end_date).toLocaleDateString("th-TH")}</TableCell>
                    <TableCell className="font-medium">{request.days_count} วัน</TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <TableCell className="text-right">
                        {request.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id, 'approved')}
                              className="gap-1"
                            >
                              <CheckCircle size={14} />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApprove(request.id, 'rejected')}
                              className="gap-1"
                            >
                              <XCircle size={14} />
                              ปฏิเสธ
                            </Button>
                          </div>
                        )}
                        {request.status !== 'pending' && request.approver && (
                          <p className="text-xs text-muted-foreground">
                            โดย {request.approver.full_name}
                          </p>
                        )}
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

export default LeaveManagement;