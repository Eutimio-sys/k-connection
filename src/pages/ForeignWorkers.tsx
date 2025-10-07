import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, ArrowLeft, Plus, DollarSign, Upload, Pencil, Trash2, Eye, FileText, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ForeignWorker {
  id: string;
  first_name: string;
  last_name: string;
  job_type: string | null;
  daily_rate: number | null;
  team_name: string | null;
  work_permit_issue_date: string | null;
  work_permit_expiry_date: string | null;
  work_document_url: string | null;
  passport_url: string | null;
  work_permit_url: string | null;
  driver_license_url: string | null;
  total_debt: number;
  remaining_debt: number;
  is_active: boolean;
  notes: string | null;
}

interface DebtPayment {
  id: string;
  worker_id: string;
  payment_date: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

const ForeignWorkers = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<ForeignWorker[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<ForeignWorker | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<ForeignWorker | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    job_type: "",
    daily_rate: "",
    team_name: "",
    work_permit_issue_date: "",
    work_permit_expiry_date: "",
    total_debt: "",
    notes: "",
  });
  const [debtFormData, setDebtFormData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  useEffect(() => {
    fetchWorkers();
    fetchDebtPayments();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("foreign_workers")
      .select("*")
      .order("first_name");

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      setWorkers(data || []);
    }
    setLoading(false);
  };

  const fetchDebtPayments = async () => {
    const { data, error } = await supabase
      .from("foreign_worker_debt_payments")
      .select("*")
      .order("payment_date", { ascending: false });

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      setDebtPayments(data || []);
    }
  };

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name) {
      toast.error("กรุณากรอกชื่อและนามสกุล");
      return;
    }

    const workerData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      job_type: formData.job_type || null,
      daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
      team_name: formData.team_name || null,
      work_permit_issue_date: formData.work_permit_issue_date || null,
      work_permit_expiry_date: formData.work_permit_expiry_date || null,
      total_debt: formData.total_debt ? parseFloat(formData.total_debt) : 0,
      remaining_debt: selectedWorker ? selectedWorker.remaining_debt : (formData.total_debt ? parseFloat(formData.total_debt) : 0),
      notes: formData.notes || null,
    };

    if (selectedWorker) {
      const { error } = await supabase
        .from("foreign_workers")
        .update(workerData)
        .eq("id", selectedWorker.id);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("อัพเดทข้อมูลสำเร็จ");
        setDialogOpen(false);
        resetForm();
        fetchWorkers();
      }
    } else {
      const { error } = await supabase
        .from("foreign_workers")
        .insert([workerData]);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("เพิ่มคนงานสำเร็จ");
        setDialogOpen(false);
        resetForm();
        fetchWorkers();
      }
    }
  };

  const handleEdit = (worker: ForeignWorker) => {
    setSelectedWorker(worker);
    setFormData({
      first_name: worker.first_name,
      last_name: worker.last_name,
      job_type: worker.job_type || "",
      daily_rate: worker.daily_rate?.toString() || "",
      team_name: worker.team_name || "",
      work_permit_issue_date: worker.work_permit_issue_date || "",
      work_permit_expiry_date: worker.work_permit_expiry_date || "",
      total_debt: worker.total_debt.toString(),
      notes: worker.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!workerToDelete) return;

    const { error } = await supabase
      .from("foreign_workers")
      .update({ is_active: false })
      .eq("id", workerToDelete.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("ลบคนงานสำเร็จ");
      setDeleteDialogOpen(false);
      setWorkerToDelete(null);
      fetchWorkers();
    }
  };

  const handleDebtPayment = async () => {
    if (!selectedWorker) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const paymentAmount = parseFloat(debtFormData.amount);
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    const newRemainingDebt = Math.max(0, selectedWorker.remaining_debt - paymentAmount);

    const { error: paymentError } = await supabase
      .from("foreign_worker_debt_payments")
      .insert([{
        worker_id: selectedWorker.id,
        payment_date: debtFormData.payment_date,
        amount: paymentAmount,
        notes: debtFormData.notes || null,
        created_by: user.id,
      }]);

    if (paymentError) {
      toast.error("เกิดข้อผิดพลาด: " + paymentError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("foreign_workers")
      .update({ remaining_debt: newRemainingDebt })
      .eq("id", selectedWorker.id);

    if (updateError) {
      toast.error("เกิดข้อผิดพลาด: " + updateError.message);
    } else {
      toast.success("บันทึกการชำระเงินสำเร็จ");
      setDebtDialogOpen(false);
      setSelectedWorker({ ...selectedWorker, remaining_debt: newRemainingDebt });
      setDebtFormData({
        amount: "",
        payment_date: new Date().toISOString().split('T')[0],
        notes: "",
      });
      fetchWorkers();
      fetchDebtPayments();
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      job_type: "",
      daily_rate: "",
      team_name: "",
      work_permit_issue_date: "",
      work_permit_expiry_date: "",
      total_debt: "",
      notes: "",
    });
    setSelectedWorker(null);
  };

  const getDaysRemaining = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryBadge = (daysRemaining: number | null) => {
    if (daysRemaining === null) return <Badge variant="outline">ไม่ระบุ</Badge>;
    if (daysRemaining < 0) return <Badge variant="destructive">หมดอายุแล้ว ({Math.abs(daysRemaining)} วัน)</Badge>;
    if (daysRemaining <= 30) return <Badge variant="destructive">เหลือ {daysRemaining} วัน</Badge>;
    if (daysRemaining <= 90) return <Badge className="bg-yellow-500">เหลือ {daysRemaining} วัน</Badge>;
    return <Badge variant="default">เหลือ {daysRemaining} วัน</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const getWorkerPaymentHistory = (workerId: string) => {
    return debtPayments.filter(p => p.worker_id === workerId);
  };

  const handleFileUpload = async (workerId: string, docType: 'work_permit' | 'passport' | 'work_document' | 'driver_license', file: File) => {
    setUploadingDoc(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${workerId}/${docType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('worker_docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('worker_docs')
        .getPublicUrl(filePath);

      const columnName = `${docType}_url`;
      const { error: updateError } = await supabase
        .from('foreign_workers')
        .update({ [columnName]: urlData.publicUrl })
        .eq('id', workerId);

      if (updateError) throw updateError;

      toast.success('อัปโหลดเอกสารสำเร็จ');
      fetchWorkers();
    } catch (error: any) {
      toast.error('เกิดข้อผิดพลาด: ' + error.message);
    }
    setUploadingDoc(false);
  };

  const uniqueTeams = Array.from(new Set(workers.map(w => w.team_name).filter(Boolean))) as string[];
  const filteredWorkers = teamFilter === "all" 
    ? workers.filter(w => w.is_active)
    : workers.filter(w => w.is_active && w.team_name === teamFilter);

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
              จัดการคนงานต่างด้าว
            </h1>
          </div>
          <p className="text-muted-foreground text-lg ml-14">จัดการข้อมูลคนงาน บัตรทำงาน และยอดหนี้</p>
        </div>
      </div>

      <Tabs defaultValue="workers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-xl">
          <TabsTrigger value="workers">คนงานต่างด้าว</TabsTrigger>
          <TabsTrigger value="debt">ติดตามยอดหนี้</TabsTrigger>
        </TabsList>

        <TabsContent value="workers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} />
                  รายชื่อคนงานต่างด้าว ({filteredWorkers.length})
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>กรองตามทีม:</Label>
                    <select
                      className="border rounded-md p-2"
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                    >
                      <option value="all">ทั้งหมด</option>
                      {uniqueTeams.map((team) => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus size={16} className="mr-2" />
                        เพิ่มคนงาน
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{selectedWorker ? "แก้ไขข้อมูลคนงาน" : "เพิ่มคนงานใหม่"}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>ชื่อ *</Label>
                            <Input 
                              value={formData.first_name} 
                              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} 
                            />
                          </div>
                          <div>
                            <Label>นามสกุล *</Label>
                            <Input 
                              value={formData.last_name} 
                              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>ประเภทงาน</Label>
                            <Input 
                              value={formData.job_type} 
                              onChange={(e) => setFormData({ ...formData, job_type: e.target.value })} 
                              placeholder="เช่น ช่างก่อสร้าง, ช่างไฟฟ้า"
                            />
                          </div>
                          <div>
                            <Label>ค่าแรงรายวัน (บาท)</Label>
                            <Input 
                              type="number" 
                              value={formData.daily_rate} 
                              onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })} 
                            />
                          </div>
                        </div>

                        <div>
                          <Label>ทีม</Label>
                          <Input 
                            value={formData.team_name} 
                            onChange={(e) => setFormData({ ...formData, team_name: e.target.value })} 
                            placeholder="เช่น ทีมช่างยา, ทีมช่างเจี๊ยบ"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>วันที่ทำบัตร</Label>
                            <Input 
                              type="date" 
                              value={formData.work_permit_issue_date} 
                              onChange={(e) => setFormData({ ...formData, work_permit_issue_date: e.target.value })} 
                            />
                          </div>
                          <div>
                            <Label>วันที่บัตรหมดอายุ</Label>
                            <Input 
                              type="date" 
                              value={formData.work_permit_expiry_date} 
                              onChange={(e) => setFormData({ ...formData, work_permit_expiry_date: e.target.value })} 
                            />
                          </div>
                        </div>

                        <div>
                          <Label>ยอดหนี้ทั้งหมด (บาท)</Label>
                          <Input 
                            type="number" 
                            value={formData.total_debt} 
                            onChange={(e) => setFormData({ ...formData, total_debt: e.target.value })} 
                          />
                        </div>

                        <div>
                          <Label>หมายเหตุ</Label>
                          <Textarea 
                            value={formData.notes} 
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                            ยกเลิก
                          </Button>
                          <Button onClick={handleSubmit}>
                            {selectedWorker ? "บันทึกการแก้ไข" : "เพิ่มคนงาน"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredWorkers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  ยังไม่มีคนงานในระบบ
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ-นามสกุล</TableHead>
                      <TableHead>ทีม</TableHead>
                      <TableHead>ประเภทงาน</TableHead>
                      <TableHead className="text-right">ค่าแรง/วัน</TableHead>
                      <TableHead>สถานะบัตรทำงาน</TableHead>
                      <TableHead className="text-right">ยอดหนี้คงเหลือ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.map((worker) => {
                      const daysRemaining = getDaysRemaining(worker.work_permit_expiry_date);
                      return (
                        <TableRow key={worker.id}>
                          <TableCell className="font-medium">
                            {worker.first_name} {worker.last_name}
                          </TableCell>
                          <TableCell>{worker.team_name || "-"}</TableCell>
                          <TableCell>{worker.job_type || "-"}</TableCell>
                          <TableCell className="text-right">
                            {worker.daily_rate ? formatCurrency(worker.daily_rate) : "-"}
                          </TableCell>
                          <TableCell>{getExpiryBadge(daysRemaining)}</TableCell>
                          <TableCell className="text-right">
                            <span className={worker.remaining_debt > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                              {formatCurrency(worker.remaining_debt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedWorker(worker);
                                  setDetailDialogOpen(true);
                                }}
                              >
                                <Eye size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(worker)}
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => {
                                  setWorkerToDelete(worker);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
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

        <TabsContent value="debt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign size={20} />
                ติดตามยอดหนี้คนงาน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredWorkers.filter(w => w.total_debt > 0).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    ไม่มีคนงานที่มียอดหนี้
                  </div>
                ) : (
                  filteredWorkers.filter(w => w.total_debt > 0).map((worker) => {
                    const paymentHistory = getWorkerPaymentHistory(worker.id);
                    const paidAmount = worker.total_debt - worker.remaining_debt;
                    const paymentPercentage = (paidAmount / worker.total_debt) * 100;

                    return (
                      <Card key={worker.id} className="border-l-4 border-l-primary">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {worker.first_name} {worker.last_name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {worker.team_name || "ไม่ระบุทีม"} • {worker.job_type || "ไม่ระบุประเภทงาน"}
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                setSelectedWorker(worker);
                                setDebtDialogOpen(true);
                              }}
                              size="sm"
                            >
                              <Plus size={14} className="mr-2" />
                              บันทึกการชำระ
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">ยอดหนี้ทั้งหมด</p>
                              <p className="text-2xl font-bold">{formatCurrency(worker.total_debt)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">ชำระแล้ว</p>
                              <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">คงเหลือ</p>
                              <p className="text-2xl font-bold text-destructive">{formatCurrency(worker.remaining_debt)}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>ความคืบหน้า</span>
                              <span>{paymentPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2 transition-all"
                                style={{ width: `${paymentPercentage}%` }}
                              />
                            </div>
                          </div>

                          {paymentHistory.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">ประวัติการชำระ</h4>
                              <div className="space-y-2">
                                {paymentHistory.slice(0, 3).map((payment) => (
                                  <div key={payment.id} className="flex justify-between text-sm py-2 border-b">
                                    <div>
                                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(payment.payment_date).toLocaleDateString('th-TH')}
                                      </p>
                                      {payment.notes && (
                                        <p className="text-xs text-muted-foreground">{payment.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {paymentHistory.length > 3 && (
                                  <p className="text-xs text-muted-foreground text-center">
                                    และอีก {paymentHistory.length - 3} รายการ
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Worker Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              รายละเอียดคนงาน: {selectedWorker?.first_name} {selectedWorker?.last_name}
            </DialogTitle>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ชื่อ-นามสกุล</Label>
                  <p className="font-medium">{selectedWorker.first_name} {selectedWorker.last_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">ทีม</Label>
                  <p className="font-medium">{selectedWorker.team_name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">ประเภทงาน</Label>
                  <p className="font-medium">{selectedWorker.job_type || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">ค่าแรงรายวัน</Label>
                  <p className="font-medium">{selectedWorker.daily_rate ? formatCurrency(selectedWorker.daily_rate) : "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">วันที่ทำบัตร</Label>
                  <p className="font-medium">
                    {selectedWorker.work_permit_issue_date 
                      ? new Date(selectedWorker.work_permit_issue_date).toLocaleDateString('th-TH')
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">วันที่บัตรหมดอายุ</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {selectedWorker.work_permit_expiry_date 
                        ? new Date(selectedWorker.work_permit_expiry_date).toLocaleDateString('th-TH')
                        : "-"}
                    </p>
                    {getExpiryBadge(getDaysRemaining(selectedWorker.work_permit_expiry_date))}
                  </div>
                </div>
              </div>

              {selectedWorker.notes && (
                <div>
                  <Label className="text-muted-foreground">หมายเหตุ</Label>
                  <p className="text-sm mt-1">{selectedWorker.notes}</p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold">เอกสารและรูปภาพ</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Work Document */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText size={16} />
                        เอกสารการทำงาน
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedWorker.work_document_url ? (
                        <div className="space-y-2">
                          <img 
                            src={selectedWorker.work_document_url} 
                            alt="เอกสารการทำงาน" 
                            className="w-full h-40 object-cover rounded"
                          />
                          <a 
                            href={selectedWorker.work_document_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Eye size={14} />
                            ดูเอกสาร
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">ยังไม่มีเอกสาร</p>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(selectedWorker.id, 'work_document', file);
                        }}
                        className="mt-2"
                        disabled={uploadingDoc}
                      />
                    </CardContent>
                  </Card>

                  {/* Passport */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText size={16} />
                        พาสปอร์ต
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedWorker.passport_url ? (
                        <div className="space-y-2">
                          <img 
                            src={selectedWorker.passport_url} 
                            alt="พาสปอร์ต" 
                            className="w-full h-40 object-cover rounded"
                          />
                          <a 
                            href={selectedWorker.passport_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Eye size={14} />
                            ดูเอกสาร
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">ยังไม่มีเอกสาร</p>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(selectedWorker.id, 'passport', file);
                        }}
                        className="mt-2"
                        disabled={uploadingDoc}
                      />
                    </CardContent>
                  </Card>

                  {/* Work Permit */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText size={16} />
                        ใบอนุญาติทำงาน
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedWorker.work_permit_url ? (
                        <div className="space-y-2">
                          <img 
                            src={selectedWorker.work_permit_url} 
                            alt="ใบอนุญาติทำงาน" 
                            className="w-full h-40 object-cover rounded"
                          />
                          <a 
                            href={selectedWorker.work_permit_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Eye size={14} />
                            ดูเอกสาร
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">ยังไม่มีเอกสาร</p>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(selectedWorker.id, 'work_permit', file);
                        }}
                        className="mt-2"
                        disabled={uploadingDoc}
                      />
                    </CardContent>
                  </Card>

                  {/* Driver License */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText size={16} />
                        ใบขับขี่
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedWorker.driver_license_url ? (
                        <div className="space-y-2">
                          <img 
                            src={selectedWorker.driver_license_url} 
                            alt="ใบขับขี่" 
                            className="w-full h-40 object-cover rounded"
                          />
                          <a 
                            href={selectedWorker.driver_license_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Eye size={14} />
                            ดูเอกสาร
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">ยังไม่มีเอกสาร</p>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(selectedWorker.id, 'driver_license', file);
                        }}
                        className="mt-2"
                        disabled={uploadingDoc}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Debt Payment Dialog */}
      <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการชำระหนี้</DialogTitle>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">{selectedWorker.first_name} {selectedWorker.last_name}</p>
                  <p className="text-sm">ยอดหนี้คงเหลือ: {formatCurrency(selectedWorker.remaining_debt)}</p>
                </AlertDescription>
              </Alert>

              <div>
                <Label>วันที่ชำระ</Label>
                <Input
                  type="date"
                  value={debtFormData.payment_date}
                  onChange={(e) => setDebtFormData({ ...debtFormData, payment_date: e.target.value })}
                />
              </div>

              <div>
                <Label>จำนวนเงิน (บาท)</Label>
                <Input
                  type="number"
                  value={debtFormData.amount}
                  onChange={(e) => setDebtFormData({ ...debtFormData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>หมายเหตุ</Label>
                <Textarea
                  value={debtFormData.notes}
                  onChange={(e) => setDebtFormData({ ...debtFormData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDebtDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleDebtPayment}>
                  บันทึกการชำระ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบคนงาน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ {workerToDelete?.first_name} {workerToDelete?.last_name} ออกจากระบบใช่หรือไม่?
              ข้อมูลจะถูกซ่อนและสามารถกู้คืนได้ในภายหลัง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ForeignWorkers;
