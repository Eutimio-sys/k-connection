import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ExternalLink, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import LaborExpenseDialog from "./LaborExpenseDialog";

interface LaborExpenseDetailDialogProps {
  expense: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  showApprovalButtons?: boolean;
}

const LaborExpenseDetailDialog = ({ 
  expense, 
  open, 
  onOpenChange, 
  onSuccess,
  showApprovalButtons = false
}: LaborExpenseDetailDialogProps) => {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      paid: "default",
      rejected: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "รอดำเนินการ",
      approved: "อนุมัติแล้ว",
      paid: "จ่ายแล้ว",
      rejected: "ปฏิเสธ",
    };
    return <Badge variant={variants[status]}>{labels[status] || status}</Badge>;
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Delete labor expense items first
    const { error: itemsError } = await supabase
      .from("labor_expense_items")
      .delete()
      .eq("labor_expense_id", expense.id);

    if (itemsError) {
      toast.error("เกิดข้อผิดพลาด: " + itemsError.message);
      setDeleting(false);
      return;
    }

    // Delete deductions
    const { error: deductionsError } = await supabase
      .from("labor_expense_deductions")
      .delete()
      .eq("labor_expense_id", expense.id);

    if (deductionsError) {
      toast.error("เกิดข้อผิดพลาด: " + deductionsError.message);
      setDeleting(false);
      return;
    }

    // Then delete the expense with audit info
    const { error } = await supabase
      .from("labor_expenses")
      .delete()
      .eq("id", expense.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success(`ลบบิลสำเร็จ (โดย ${user?.email})`);
      onSuccess();
      onOpenChange(false);
    }
    
    setDeleting(false);
    setShowDeleteAlert(false);
  };

  const handleApproval = async (status: "approved" | "rejected") => {
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("labor_expenses")
      .update({ 
        status,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", expense.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success(status === "approved" ? "อนุมัติสำเร็จ" : "ปฏิเสธสำเร็จ");
      onSuccess();
      onOpenChange(false);
    }
    setProcessing(false);
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    onSuccess();
  };

  if (!expense) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl mb-2">
                  เลขที่: {expense.invoice_number}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  บิลค่าแรง
                </p>
              </div>
              <div className="flex gap-2">
                {!showApprovalButtons && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditDialog(true)}
                      className="gap-1"
                    >
                      <Edit className="h-4 w-4" />
                      แก้ไข
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteAlert(true)}
                      className="gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      ลบ
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">สถานะ</p>
                {getStatusBadge(expense.status)}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">ยอดสุทธิ</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(expense.net_amount || expense.total_amount)}
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">ช่าง</p>
                <p className="font-medium">{expense.worker?.full_name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">โครงการ</p>
                <p className="font-medium">{expense.project?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">บริษัท</p>
                <p className="font-medium">{expense.company?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">วันที่</p>
                <p className="font-medium">
                  {format(new Date(expense.invoice_date), "dd/MM/yyyy")}
                </p>
              </div>
              {expense.receipt_image_url && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">รูปบิล</p>
                  <a
                    href={expense.receipt_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    ดูรูปบิล <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Items Table */}
            {expense.labor_expense_items && expense.labor_expense_items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">รายการค่าแรง</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead>รายละเอียด</TableHead>
                      <TableHead className="text-right">จำนวนเงิน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expense.labor_expense_items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline">{item.category?.name}</Badge>
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Deductions Table */}
            {expense.labor_expense_deductions && expense.labor_expense_deductions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">รายการหัก</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รายการ</TableHead>
                      <TableHead className="text-right">จำนวนเงิน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expense.labor_expense_deductions.map((deduction: any) => (
                      <TableRow key={deduction.id}>
                        <TableCell>{deduction.description}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          -{formatCurrency(deduction.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Summary */}
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ยอดรวม</span>
                <span className="font-medium">{formatCurrency(expense.subtotal)}</span>
              </div>
              {expense.withholding_tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">หัก ณ ที่จ่าย {expense.withholding_tax_rate}%</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(expense.withholding_tax_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>ยอดสุทธิ</span>
                <span className="text-primary">
                  {formatCurrency(expense.net_amount || expense.total_amount)}
                </span>
              </div>
            </div>

            {/* Notes */}
            {expense.notes && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">หมายเหตุ</p>
                <p className="text-sm">{expense.notes}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {showApprovalButtons && expense.status === 'pending' ? (
              <div className="flex gap-2 w-full justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  ปิด
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproval("rejected")}
                  disabled={processing}
                  className="gap-1"
                >
                  <XCircle className="h-4 w-4" />
                  ปฏิเสธ
                </Button>
                <Button
                  onClick={() => handleApproval("approved")}
                  disabled={processing}
                  className="gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  อนุมัติ
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ปิด
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบบิลนี้จะไม่สามารถกู้คืนได้ ข้อมูลทั้งหมดรวมถึงรายการค่าแรงจะถูกลบอย่างถาวร
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "กำลังลบ..." : "ลบบิล"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {showEditDialog && (
        <LaborExpenseDialog
          expense={expense}
          onSuccess={handleEditSuccess}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </>
  );
};

export default LaborExpenseDetailDialog;
