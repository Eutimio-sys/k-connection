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
import { Users, ArrowLeft, Plus, Calendar, FileText, DollarSign, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
}

const ForeignWorkers = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<ForeignWorker[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<ForeignWorker | null>(null);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const workerData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      job_type: formData.job_type || null,
      daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
      team_name: formData.team_name || null,
      work_permit_issue_date: formData.work_permit_issue_date || null,
      work_permit_expiry_date: formData.work_permit_expiry_date || null,
      total_debt: formData.total_debt ? parseFloat(formData.total_debt) : 0,
      remaining_debt: formData.total_debt ? parseFloat(formData.total_debt) : 0,
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

  const handleDebtPayment = async () => {
    if (!selectedWorker) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const paymentAmount = parseFloat(debtFormData.amount);
    const newRemainingDebt = selectedWorker.remaining_debt - paymentAmount;

    // Insert payment record
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

    // Update worker's remaining debt
    const { error: updateError } = await supabase
      .from("foreign_workers")
      .update({ remaining_debt: newRemainingDebt })
      .eq("id", selectedWorker.id);

    if (updateError) {
      toast.error("เกิดข้อผิดพลาด: " + updateError.message);
    } else {
      toast.success("บันทึกการชำระเงินสำเร็จ");
      setDebtDialogOpen(false);
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
    if (daysRemaining < 0) return <Badge variant="destructive">หมดอายุแล้ว</Badge>;
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                รายชื่อคนงานต่างด้าว ({workers.filter(w => w.is_active).length})
              </CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); }}>
                    <Plus size={16} className="mr-2" />
                    เพิ่มคนงาน
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{selectedWorker ? "แก้ไขข้อมูลคนงาน" : "เพิ่มคนงานใหม่"}</DialogTitle>
                    <DialogDescription>กรอกข้อมูลคนงานต่างด้าว</DialogDescription>
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
                          placeholder="เช่น ช่างก่อสร้าง"
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
                        <Label>วันหมดอายุบัตร</Label>
                        <Input
                          type="date"
                          value={formData.work_permit_expiry_date}
                          onChange={(e) => setFormData({ ...formData, work_permit_expiry_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>ยอดหนี้ค่าทำบัตร (บาท)</Label>
                      <Input
                        type="number"
                        value={formData.total_debt}
                        onChange={(e) => setFormData({ ...formData, total_debt: e.target.value })}
                        placeholder="จำนวนเงินที่จ่ายให้ล่วงหน้า"
                      />
                    </div>
                    <div>
                      <Label>หมายเหตุ</Label>
                      <Input
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleSubmit} className="w-full">
                      {selectedWorker ? "บันทึกการแก้ไข" : "เพิ่มคนงาน"}
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
                    <TableHead>ทีม</TableHead>
                    <TableHead>ประเภทงาน</TableHead>
                    <TableHead className="text-right">ค่าแรง/วัน</TableHead>
                    <TableHead>สถานะบัตรทำงาน</TableHead>
                    <TableHead className="text-right">ยอดหนี้คงเหลือ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.filter(w => w.is_active).map((worker) => {
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
                        <TableCell className="text-right font-medium">
                          {worker.remaining_debt > 0 ? (
                            <span className="text-destructive">{formatCurrency(worker.remaining_debt)}</span>
                          ) : (
                            <span className="text-green-600">ชำระครบแล้ว</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedWorker(worker);
                                setFormData({
                                  first_name: worker.first_name,
                                  last_name: worker.last_name,
                                  job_type: worker.job_type || "",
                                  daily_rate: worker.daily_rate?.toString() || "",
                                  team_name: worker.team_name || "",
                                  work_permit_issue_date: worker.work_permit_issue_date || "",
                                  work_permit_expiry_date: worker.work_permit_expiry_date || "",
                                  total_debt: worker.total_debt?.toString() || "",
                                  notes: worker.notes || "",
                                });
                                setDialogOpen(true);
                              }}
                            >
                              แก้ไข
                            </Button>
                            {worker.remaining_debt > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedWorker(worker);
                                  setDebtDialogOpen(true);
                                }}
                              >
                                บันทึกชำระเงิน
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expiring Soon Alert */}
          {workers.some(w => {
            const days = getDaysRemaining(w.work_permit_expiry_date);
            return days !== null && days >= 0 && days <= 30;
          }) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                มีบัตรทำงานที่กำลังจะหมดอายุภายใน 30 วัน กรุณาดำเนินการต่ออายุ
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="debt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign size={20} />
                ติดตามยอดหนี้คนงาน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {workers.filter(w => w.total_debt > 0).map((worker) => {
                const payments = getWorkerPaymentHistory(worker.id);
                return (
                  <Card key={worker.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {worker.first_name} {worker.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{worker.team_name || "ไม่ระบุทีม"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">ยอดหนี้ทั้งหมด</p>
                        <p className="text-xl font-bold">{formatCurrency(worker.total_debt)}</p>
                        <p className="text-sm font-medium text-destructive">
                          คงเหลือ: {formatCurrency(worker.remaining_debt)}
                        </p>
                      </div>
                    </div>

                    {payments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">ประวัติการชำระเงิน</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>วันที่</TableHead>
                              <TableHead className="text-right">จำนวนเงิน</TableHead>
                              <TableHead>หมายเหตุ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {new Date(payment.payment_date).toLocaleDateString("th-TH")}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {payment.notes || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                );
              })}

              {workers.filter(w => w.total_debt > 0).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  ไม่มีคนงานที่มียอดหนี้
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Debt Payment Dialog */}
      <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการชำระเงิน</DialogTitle>
            <DialogDescription>
              {selectedWorker && `${selectedWorker.first_name} ${selectedWorker.last_name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">ยอดหนี้คงเหลือ</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(selectedWorker.remaining_debt)}
                </p>
              </div>
              <div>
                <Label>วันที่ชำระ *</Label>
                <Input
                  type="date"
                  value={debtFormData.payment_date}
                  onChange={(e) => setDebtFormData({ ...debtFormData, payment_date: e.target.value })}
                />
              </div>
              <div>
                <Label>จำนวนเงิน (บาท) *</Label>
                <Input
                  type="number"
                  value={debtFormData.amount}
                  onChange={(e) => setDebtFormData({ ...debtFormData, amount: e.target.value })}
                  max={selectedWorker.remaining_debt}
                />
              </div>
              <div>
                <Label>หมายเหตุ</Label>
                <Input
                  value={debtFormData.notes}
                  onChange={(e) => setDebtFormData({ ...debtFormData, notes: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleDebtPayment} 
                className="w-full"
                disabled={!debtFormData.amount || parseFloat(debtFormData.amount) <= 0}
              >
                บันทึกการชำระเงิน
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ForeignWorkers;
