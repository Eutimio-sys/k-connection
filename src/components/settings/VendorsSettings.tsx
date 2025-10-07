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

const VendorsSettings = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    bank_name: "",
    bank_account: "",
    notes: "",
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    const { data } = await supabase.from("vendors").select("*").order("name");
    setVendors(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let error;
    if (editingVendor) {
      const result = await supabase.from("vendors").update(formData).eq("id", editingVendor.id);
      error = result.error;
    } else {
      const result = await supabase.from("vendors").insert(formData);
      error = result.error;
    }
    
    if (error) toast.error("เกิดข้อผิดพลาด");
    else {
      toast.success(editingVendor ? "แก้ไขร้านค้าสำเร็จ" : "เพิ่มร้านค้าสำเร็จ");
      setDialogOpen(false);
      setEditingVendor(null);
      setFormData({ name: "", contact_person: "", phone: "", email: "", address: "", bank_name: "", bank_account: "", notes: "" });
      fetchVendors();
    }
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contact_person: vendor.contact_person || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      bank_name: vendor.bank_name || "",
      bank_account: vendor.bank_account || "",
      notes: vendor.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingVendor(null);
      setFormData({ name: "", contact_person: "", phone: "", email: "", address: "", bank_name: "", bank_account: "", notes: "" });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("vendors").update({ is_active: !currentStatus }).eq("id", id);
    if (error) toast.error("เกิดข้อผิดพลาด");
    else { toast.success("อัพเดทสำเร็จ"); fetchVendors(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>จัดการร้านค้า</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus size={16} />
              เพิ่มร้านค้า
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "แก้ไขร้านค้า" : "เพิ่มร้านค้าใหม่"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>ชื่อร้านค้า *</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <Label>ผู้ติดต่อ</Label>
                  <Input value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
                </div>
                <div>
                  <Label>เบอร์โทร</Label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <Label>อีเมล</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <Label>ที่อยู่</Label>
                  <Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} />
                </div>
                <div>
                  <Label>ธนาคาร</Label>
                  <Input value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} placeholder="เช่น ธนาคารกสิกรไทย" />
                </div>
                <div>
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
        {vendors.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">ยังไม่มีข้อมูลร้านค้า</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อร้านค้า</TableHead>
                <TableHead>ผู้ติดต่อ</TableHead>
                <TableHead>เบอร์โทร</TableHead>
                <TableHead>ธนาคาร</TableHead>
                <TableHead>เลขบัญชี</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map(vendor => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.contact_person || "-"}</TableCell>
                  <TableCell>{vendor.phone || "-"}</TableCell>
                  <TableCell>{vendor.bank_name || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{vendor.bank_account || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={vendor.is_active ? "default" : "secondary"}>
                      {vendor.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(vendor)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(vendor.id, vendor.is_active)}>
                    {vendor.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
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

export default VendorsSettings;
