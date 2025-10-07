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
import { CreditCard, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const PaymentAccountsSettings = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) toast.error("เกิดข้อผิดพลาด");
    else setAccounts(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.bank_name || !formData.account_number || !formData.account_name) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น");
      return;
    }

    if (editingAccount) {
      const { error } = await supabase
        .from("payment_accounts")
        .update(formData)
        .eq("id", editingAccount.id);

      if (error) toast.error("เกิดข้อผิดพลาด: " + error.message);
      else {
        toast.success("แก้ไขบัญชีจ่ายเงินสำเร็จ");
        setDialogOpen(false);
        resetForm();
        fetchAccounts();
      }
    } else {
      const { error } = await supabase
        .from("payment_accounts")
        .insert(formData);

      if (error) toast.error("เกิดข้อผิดพลาด: " + error.message);
      else {
        toast.success("เพิ่มบัญชีจ่ายเงินสำเร็จ");
        setDialogOpen(false);
        resetForm();
        fetchAccounts();
      }
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_name: account.account_name,
      notes: account.notes || "",
      is_active: account.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      bank_name: "",
      account_number: "",
      account_name: "",
      notes: "",
      is_active: true,
    });
    setEditingAccount(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard size={20} />
          บัญชีจ่ายเงิน
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={16} className="mr-2" />
              เพิ่มบัญชี
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? "แก้ไข" : "เพิ่ม"}บัญชีจ่ายเงิน</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ชื่อบัญชี *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น บัญชีหลัก, บัญชีโครงการ A"
                />
              </div>
              <div>
                <Label>ธนาคาร *</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="เช่น ธนาคารกสิกรไทย"
                />
              </div>
              <div>
                <Label>เลขที่บัญชี *</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="XXX-X-XXXXX-X"
                />
              </div>
              <div>
                <Label>ชื่อบัญชี *</Label>
                <Input
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="ชื่อบัญชีบริษัท"
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
              <Button onClick={handleSubmit} className="w-full">
                {editingAccount ? "บันทึกการแก้ไข" : "เพิ่มบัญชี"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">ยังไม่มีบัญชีจ่ายเงิน</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อบัญชี</TableHead>
                <TableHead>ธนาคาร</TableHead>
                <TableHead>เลขที่บัญชี</TableHead>
                <TableHead>ชื่อบัญชี</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.bank_name}</TableCell>
                  <TableCell>{account.account_number}</TableCell>
                  <TableCell>{account.account_name}</TableCell>
                  <TableCell>
                    <Badge variant={account.is_active ? "default" : "secondary"}>
                      {account.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(account)}
                    >
                      <Pencil size={14} className="mr-1" />
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

export default PaymentAccountsSettings;
