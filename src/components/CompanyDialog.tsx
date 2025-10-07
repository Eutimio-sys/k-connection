import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

interface CompanyDialogProps {
  onSuccess?: () => void;
}

const CompanyDialog = ({ onSuccess }: CompanyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tax_id: "",
    address: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("companies").insert(formData);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("เพิ่มบริษัทสำเร็จ");
      setOpen(false);
      setFormData({ name: "", tax_id: "", address: "", phone: "" });
      onSuccess?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 size={16} />
          เพิ่มบริษัท
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มบริษัทใหม่</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>ชื่อบริษัท *</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div>
            <Label>เลขประจำตัวผู้เสียภาษี</Label>
            <Input value={formData.tax_id} onChange={e => setFormData({...formData, tax_id: e.target.value})} />
          </div>
          <div>
            <Label>เบอร์โทร</Label>
            <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <Label>ที่อยู่</Label>
            <Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={3} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={loading}>{loading ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyDialog;
