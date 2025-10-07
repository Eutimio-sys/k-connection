import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const WorkersSettings = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    id_card: "",
    daily_rate: "",
    specialty: "",
    bank_name: "",
    bank_account: "",
    notes: "",
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    const { data } = await supabase.from("workers").select("*").order("full_name");
    setWorkers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
    };
    
    let error;
    if (editingWorker) {
      const result = await supabase.from("workers").update(dataToSubmit).eq("id", editingWorker.id);
      error = result.error;
    } else {
      const result = await supabase.from("workers").insert(dataToSubmit);
      error = result.error;
    }
    
    if (error) toast.error("เกิดข้อผิดพลาด");
    else {
      toast.success(editingWorker ? "แก้ไขช่างสำเร็จ" : "เพิ่มช่างสำเร็จ");
      setDialogOpen(false);
      setEditingWorker(null);
      setFormData({ full_name: "", phone: "", id_card: "", daily_rate: "", specialty: "", bank_name: "", bank_account: "", notes: "" });
      fetchWorkers();
    }
  };

  const handleEdit = (worker: any) => {
    setEditingWorker(worker);
    setFormData({
      full_name: worker.full_name,
      phone: worker.phone || "",
      id_card: worker.id_card || "",
      daily_rate: worker.daily_rate ? worker.daily_rate.toString() : "",
      specialty: worker.specialty || "",
      bank_name: worker.bank_name || "",
      bank_account: worker.bank_account || "",
      notes: worker.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingWorker(null);
      setFormData({ full_name: "", phone: "", id_card: "", daily_rate: "", specialty: "", bank_name: "", bank_account: "", notes: "" });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("workers").update({ is_active: !currentStatus }).eq("id", id);
    if (error) toast.error("เกิดข้อผิดพลาด");
    else { toast.success("อัพเดทสำเร็จ"); fetchWorkers(); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("th-TH").format(amount);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>จัดการช่าง</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus size={16} />
              เพิ่มช่าง
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingWorker ? "แก้ไขช่าง" : "เพิ่มช่างใหม่"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>ชื่อ-นามสกุล *</Label>
                  <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required />
                </div>
                <div>
                  <Label>เบอร์โทร</Label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <Label>เลขบัตรประชาชน</Label>
                  <Input value={formData.id_card} onChange={e => setFormData({...formData, id_card: e.target.value})} />
                </div>
                <div>
                  <Label>ค่าแรงรายวัน (บาท)</Label>
                  <Input type="number" step="0.01" value={formData.daily_rate} onChange={e => setFormData({...formData, daily_rate: e.target.value})} />
                </div>
                <div>
                  <Label>ความเชี่ยวชาญ</Label>
                  <Input value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} placeholder="เช่น ช่างไม้, ช่างปูน" />
                </div>
                <div>
                  <Label>ธนาคาร</Label>
                  <Input value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} placeholder="เช่น ธนาคารกสิกรไทย" />
                </div>
                <div className="col-span-2">
                  <Label>เลขบัญชี</Label>
                  <Input value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} placeholder="xxx-x-xxxxx-x" />
                </div>
                <div className="col-span-2">
                  <Label>หมายเหตุ</Label>
                  <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
                <Button type="submit">บันทึก</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {workers.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">ยังไม่มีข้อมูลช่าง</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>เบอร์โทร</TableHead>
                <TableHead>ค่าแรง/วัน</TableHead>
                <TableHead>ความเชี่ยวชาญ</TableHead>
                <TableHead>ธนาคาร</TableHead>
                <TableHead>เลขบัญชี</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map(worker => (
                <TableRow key={worker.id}>
                  <TableCell className="font-medium">{worker.full_name}</TableCell>
                  <TableCell>{worker.phone || "-"}</TableCell>
                  <TableCell>{worker.daily_rate ? `฿${formatCurrency(worker.daily_rate)}` : "-"}</TableCell>
                  <TableCell>{worker.specialty || "-"}</TableCell>
                  <TableCell>{worker.bank_name || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{worker.bank_account || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={worker.is_active ? "default" : "secondary"}>
                      {worker.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(worker)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(worker.id, worker.is_active)}>
                      {worker.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkersSettings;
