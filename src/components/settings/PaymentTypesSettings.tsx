import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const PaymentTypesSettings = () => {
  const [types, setTypes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    const { data, error } = await supabase
      .from("payment_types")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } else {
      setTypes(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingType) {
      const { error } = await supabase
        .from("payment_types")
        .update(formData)
        .eq("id", editingType.id);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("แก้ไขประเภทการโอนสำเร็จ");
        setDialogOpen(false);
        resetForm();
        fetchTypes();
      }
    } else {
      const { error } = await supabase
        .from("payment_types")
        .insert([formData]);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("เพิ่มประเภทการโอนสำเร็จ");
        setDialogOpen(false);
        resetForm();
        fetchTypes();
      }
    }
  };

  const handleEdit = (type: any) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      is_active: type.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
    setEditingType(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>ประเภทการโอนเงิน</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              เพิ่มประเภทการโอน
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? "แก้ไขประเภทการโอน" : "เพิ่มประเภทการโอนใหม่"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>ชื่อประเภท *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น โอนเงิน, เงินสด"
                  required
                />
              </div>
              <div>
                <Label>คำอธิบาย</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active" className="cursor-pointer">ใช้งาน</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">
                  {editingType ? "บันทึกการแก้ไข" : "เพิ่มประเภท"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อประเภท</TableHead>
              <TableHead>คำอธิบาย</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  ยังไม่มีข้อมูลประเภทการโอน
                </TableCell>
              </TableRow>
            ) : (
              types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {type.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={type.is_active ? "default" : "secondary"}>
                      {type.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(type)}
                      className="gap-1"
                    >
                      <Pencil size={14} />
                      แก้ไข
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PaymentTypesSettings;
