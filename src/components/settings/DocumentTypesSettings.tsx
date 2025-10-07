import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FileText, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const DocumentTypesSettings = () => {
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  const fetchDocumentTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_types")
      .select("*")
      .order("name");

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      setDocumentTypes(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("กรุณากรอกชื่อเอกสาร");
      return;
    }

    if (editingType) {
      const { error } = await supabase
        .from("document_types")
        .update(formData)
        .eq("id", editingType.id);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("แก้ไขประเภทเอกสารสำเร็จ");
        setDialogOpen(false);
        resetForm();
        fetchDocumentTypes();
      }
    } else {
      const { error } = await supabase
        .from("document_types")
        .insert(formData);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("เพิ่มประเภทเอกสารสำเร็จ");
        setDialogOpen(false);
        resetForm();
        fetchDocumentTypes();
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
        <CardTitle className="flex items-center gap-2">
          <FileText size={20} />
          ประเภทเอกสาร
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              เพิ่มประเภทเอกสาร
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingType ? "แก้ไขประเภทเอกสาร" : "เพิ่มประเภทเอกสารใหม่"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ชื่อเอกสาร *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ใบรับรองเงินเดือน"
                />
              </div>

              <div>
                <Label>รายละเอียด</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="รายละเอียดของเอกสาร"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>ใช้งาน</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingType ? "บันทึกการแก้ไข" : "เพิ่มประเภทเอกสาร"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">กำลังโหลด...</p>
        ) : documentTypes.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">ยังไม่มีประเภทเอกสาร</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อเอกสาร</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{type.description || "-"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${type.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {type.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(type)}
                      className="gap-1"
                    >
                      <Pencil size={14} />
                      แก้ไข
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

export default DocumentTypesSettings;
