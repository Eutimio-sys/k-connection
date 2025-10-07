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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, XCircle } from "lucide-react";
import DailyPaymentDialog from "./DailyPaymentDialog";

interface DailyPaymentDetailDialogProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  canManage: boolean;
}

const DailyPaymentDetailDialog = ({ 
  payment, 
  open, 
  onOpenChange, 
  onSuccess,
  canManage
}: DailyPaymentDetailDialogProps) => {
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      pending: { label: "รอจ่าย", variant: "secondary" },
      paid: { label: "จ่ายแล้ว", variant: "default" },
      cancelled: { label: "ยกเลิก", variant: "destructive" },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const handleCancel = async () => {
    setCancelling(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("daily_payments")
      .update({ 
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success(`ยกเลิกรายการสำเร็จ`);
      onSuccess();
      onOpenChange(false);
    }
    
    setCancelling(false);
    setShowCancelAlert(false);
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    onSuccess();
  };

  if (!payment) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl mb-2">
                  รายละเอียดการโอนเงิน
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  รายการโอนประจำวัน
                </p>
              </div>
              <div className="flex gap-2">
                {canManage && payment.status === "pending" && (
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
                      onClick={() => setShowCancelAlert(true)}
                      className="gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      ยกเลิก
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status and Amount */}
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">สถานะ</p>
                {getStatusBadge(payment.status)}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">จำนวนเงิน</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">ช่าง/ผู้รับเงิน</p>
                <p className="font-medium">{payment.worker?.full_name || "ไม่ระบุ"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">โครงการ</p>
                <p className="font-medium">{payment.project?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">หมวดหมู่</p>
                <p className="font-medium">{payment.category?.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">วันที่จ่าย</p>
                <p className="font-medium">
                  {new Date(payment.payment_date).toLocaleDateString("th-TH")}
                </p>
              </div>
            </div>

            {/* Payment Account Info */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold">ข้อมูลการโอน</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">บัญชีที่ใช้โอน</p>
                  <p className="font-medium">
                    {payment.payment_account ? 
                      `${payment.payment_account.name} - ${payment.payment_account.bank_name}` : 
                      "-"
                    }
                  </p>
                  {payment.payment_account?.account_number && (
                    <p className="text-sm text-muted-foreground font-mono">
                      {payment.payment_account.account_number}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ประเภทการโอน</p>
                  <p className="font-medium">{payment.payment_type?.name || "-"}</p>
                </div>
              </div>
            </div>

            {/* Recipient Bank Info */}
            {payment.worker && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold">ข้อมูลบัญชีผู้รับ</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ธนาคาร</p>
                    <p className="font-medium">{payment.worker.bank_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">เลขบัญชี</p>
                    <p className="font-medium font-mono">{payment.worker.bank_account || "-"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {payment.description && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">รายละเอียด</p>
                <p className="text-sm">{payment.description}</p>
              </div>
            )}

            {/* Notes */}
            {payment.notes && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">หมายเหตุ</p>
                <p className="text-sm">{payment.notes}</p>
              </div>
            )}

            {/* Created By */}
            {payment.creator && (
              <div className="text-xs text-muted-foreground">
                สร้างโดย: {payment.creator.full_name}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยกเลิกรายการนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              รายการนี้จะถูกทำเครื่องหมายว่ายกเลิก และจะไม่นำไปคำนวณในรายงาน แต่ข้อมูลจะยังคงแสดงอยู่ในระบบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ปิด</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "กำลังยกเลิก..." : "ยกเลิกรายการ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {showEditDialog && (
        <DailyPaymentDialog
          payment={payment}
          onSuccess={handleEditSuccess}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </>
  );
};

export default DailyPaymentDetailDialog;