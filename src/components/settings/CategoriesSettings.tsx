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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const CategoriesSettings = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    description: string;
    category_type: "material" | "labor" | "labor_contractor" | "other";
  }>({ code: "", name: "", description: "", category_type: "material" });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("expense_categories").select("*").order("name");
    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let error;
    if (editingCategory) {
      const result = await supabase.from("expense_categories").update(formData).eq("id", editingCategory.id);
      error = result.error;
    } else {
      const result = await supabase.from("expense_categories").insert(formData);
      error = result.error;
    }
    
    if (error) toast.error("เกิดข้อผิดพลาด");
    else {
      toast.success(editingCategory ? "แก้ไขหมวดหมู่สำเร็จ" : "เพิ่มหมวดหมู่สำเร็จ");
      setDialogOpen(false);
      setEditingCategory(null);
      setFormData({ code: "", name: "", description: "", category_type: "material" });
      fetchCategories();
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({ code: category.code || "", name: category.name, description: category.description || "", category_type: category.category_type || "material" });
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCategory(null);
      setFormData({ code: "", name: "", description: "", category_type: "material" });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("expense_categories").update({ is_active: !currentStatus }).eq("id", id);
    if (error) toast.error("เกิดข้อผิดพลาด");
    else { toast.success("อัพเดทสำเร็จ"); fetchCategories(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>จัดการหมวดหมู่ค่าใช้จ่าย</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus size={16} />
              เพิ่มหมวดหมู่
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>รหัสหมวดหมู่ *</Label>
                <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="เช่น CAT01" required />
              </div>
              <div>
                <Label>ชื่อหมวดหมู่ *</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div>
                <Label>ประเภทหมวดหมู่ *</Label>
                <Select value={formData.category_type} onValueChange={(value) => setFormData({...formData, category_type: value as "material" | "labor" | "labor_contractor" | "other"})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">หมวดหมู่วัสดุ</SelectItem>
                    <SelectItem value="labor">หมวดหมู่ค่าแรง</SelectItem>
                    <SelectItem value="labor_contractor">หมวดหมู่ค่าแรงเหมา</SelectItem>
                    <SelectItem value="other">หมวดหมู่อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>คำอธิบาย</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} />
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อหมวดหมู่</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>คำอธิบาย</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(cat => (
              <TableRow key={cat.id}>
                <TableCell>{cat.code || "-"}</TableCell>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {cat.category_type === "material" ? "วัสดุ" : 
                     cat.category_type === "labor" ? "ค่าแรง" :
                     cat.category_type === "labor_contractor" ? "ค่าแรงเหมา" :
                     "อื่นๆ"}
                  </Badge>
                </TableCell>
                <TableCell>{cat.description || "-"}</TableCell>
                <TableCell>
                  <Badge variant={cat.is_active ? "default" : "secondary"}>
                    {cat.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(cat.id, cat.is_active)}>
                    {cat.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CategoriesSettings;
