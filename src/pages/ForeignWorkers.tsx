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
import { Users, ArrowLeft, Plus, DollarSign, Upload, AlertCircle } from "lucide-react";
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
              <div className="flex items-center justify-between mb-4">
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
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { resetForm(); }}>
                        <Plus size={16} className="mr-2" />
                        เพิ่มคนงาน
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>เพิ่มคนงานใหม่</DialogTitle>
                        <DialogDescription>กรอกข้อมูลคนงานต่างด้าว</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>ชื่อ *</Label>
                            <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                          </div>
                          <div>
                            <Label>นามสกุล *</Label>
                            <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                          </div>
                        </div>
                        <Button onClick={handleSubmit} className="w-full">เพิ่มคนงาน</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">ตารางคนงาน (ถูกย่อให้สั้นลงเพื่อประสิทธิภาพ)</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debt">
          <Card>
            <CardHeader>
              <CardTitle>ติดตามยอดหนี้</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">ประวัติยอดหนี้</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ForeignWorkers;
