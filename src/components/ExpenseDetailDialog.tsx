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
import { ExternalLink, Edit, Trash2 } from "lucide-react";
import ExpenseDialog from "./ExpenseDialog";

interface ExpenseDetailDialogProps {
  expense: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ExpenseDetailDialog = ({ expense, open, onOpenChange, onSuccess }: ExpenseDetailDialogProps) => {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      paid: "default",
      rejected: "destructive",
      cancelled: "outline",
    };
    const labels: Record<string, string> = {
      pending: "รอดำเนินการ",
      approved: "อนุมัติแล้ว",
      paid: "จ่ายแล้ว",
      rejected: "ปฏิเสธ",
      cancelled: "ยกเลิก",
    };
    return <Badge variant={variants[status]}>{labels[status] || status}</Badge>;
  };

  const handleCancel = async () => {
    setDeleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("expenses")
      .update({ 
        status: "cancelled",
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", expense.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("ยกเลิกบิลสำเร็จ");
      onSuccess();
      onOpenChange(false);
    }
    
    setDeleting(false);
    setShowDeleteAlert(false);
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
                  เลขที่บิล: {expense.invoice_number}
                </DialogTitle>
                {expense.tax_invoice_number && (
                  <p className="text-sm text-muted-foreground">
                    เลขที่ใบกำกับภาษี: {expense.tax_invoice_number}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                  className="gap-1"
                >
                  <Edit className="h-4 w-4" />
                  แก้ไข
                </Button>
                {expense.status === "pending" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteAlert(true)}
                    className="gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    ยกเลิก
                  </Button>
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
                <p className="text-sm text-muted-foreground mb-1">ยอดรวมทั้งหมด</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(expense.total_amount)}
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">ร้านค้า</p>
                <p className="font-medium">{expense.vendor?.name || "-"}</p>
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
              {expense.status === 'approved' && expense.updated_by_profile && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">ผู้อนุมัติ</p>
                  <p className="font-medium">{expense.updated_by_profile.full_name}</p>
                  {expense.approved_at && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(expense.approved_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  )}
                </div>
              )}
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
            <div className="space-y-2">
              <h4 className="font-semibold">รายการค่าใช้จ่าย</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead className="text-right">ราคา/หน่วย</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expense.expense_items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{item.category?.name}</Badge>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ยอดรวม</span>
                <span className="font-medium">{formatCurrency(expense.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT {expense.vat_rate}%</span>
                <span className="font-medium">{formatCurrency(expense.vat_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>ยอดรวมทั้งหมด</span>
                <span className="text-primary">{formatCurrency(expense.total_amount)}</span>
              </div>
            </div>

            {/* Notes */}
            {expense.notes && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">หมายเหตุ</p>
                <p className="text-sm">{expense.notes}</p>
              </div>
            )}

            {/* Action History */}
            <div className="pt-4 border-t">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                {expense.created_by_profile && (
                  <div>
                    <span className="font-medium">สร้างโดย:</span>{" "}
                    {expense.created_by_profile.full_name}
                    {expense.created_at && (
                      <span className="ml-1">
                        ({format(new Date(expense.created_at), "dd/MM/yyyy HH:mm")})
                      </span>
                    )}
                  </div>
                )}
                {expense.updated_by_profile && expense.updated_at && expense.updated_by !== expense.created_by && (
                  <div>
                    <span className="font-medium">แก้ไขโดย:</span>{" "}
                    {expense.updated_by_profile.full_name}
                    <span className="ml-1">
                      ({format(new Date(expense.updated_at), "dd/MM/yyyy HH:mm")})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยกเลิกบิลนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              รายการนี้จะถูกทำเครื่องหมายว่ายกเลิก และจะไม่นำไปคำนวณในรายงาน แต่ข้อมูลจะยังคงแสดงอยู่ในระบบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ปิด</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "กำลังยกเลิก..." : "ยกเลิกบิล"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {showEditDialog && (
        <ExpenseDialog
          expense={expense}
          onSuccess={handleEditSuccess}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </>
  );
};

export default ExpenseDetailDialog;
