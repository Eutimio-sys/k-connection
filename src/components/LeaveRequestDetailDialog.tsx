import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";

interface LeaveRequestDetailDialogProps {
  request: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  showApprovalButtons?: boolean;
}

const LeaveRequestDetailDialog = ({
  request,
  open,
  onOpenChange,
  onSuccess,
  showApprovalButtons = false,
}: LeaveRequestDetailDialogProps) => {
  const [processing, setProcessing] = useState(false);

  const getLeaveTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      sick: "ลาป่วย",
      personal: "ลากิจ",
      vacation: "ลาพักร้อน",
      maternity: "ลาคลอด",
      unpaid: "ลาไม่รับค่าจ้าง",
    };
    return types[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "รอดำเนินการ",
      approved: "อนุมัติแล้ว",
      rejected: "ปฏิเสธ",
    };
    return <Badge variant={variants[status]}>{labels[status] || status}</Badge>;
  };

  const handleApproval = async (status: "approved" | "rejected") => {
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success(status === "approved" ? "อนุมัติสำเร็จ" : "ปฏิเสธสำเร็จ");
      onSuccess();
      onOpenChange(false);
    }
    setProcessing(false);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">รายละเอียดคำขอลา</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">สถานะ</p>
              {getStatusBadge(request.status)}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">จำนวนวัน</p>
              <p className="text-3xl font-bold text-primary">{request.days_count} วัน</p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">พนักงาน</p>
              <p className="font-medium">{request.user?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ตำแหน่ง</p>
              <p className="font-medium">{request.user?.position || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">แผนก</p>
              <p className="font-medium">{request.user?.department || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ประเภทการลา</p>
              <p className="font-medium">
                <Badge variant="outline">{getLeaveTypeLabel(request.leave_type)}</Badge>
              </p>
            </div>
          </div>

          {/* Leave Period */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">วันที่เริ่มต้น</p>
              <p className="font-medium">
                {format(new Date(request.start_date), "dd/MM/yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">วันที่สิ้นสุด</p>
              <p className="font-medium">
                {format(new Date(request.end_date), "dd/MM/yyyy")}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">เหตุผล</p>
            <p className="text-sm">{request.reason}</p>
          </div>

          {/* Notes */}
          {request.notes && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">หมายเหตุ</p>
              <p className="text-sm">{request.notes}</p>
            </div>
          )}

          {/* Approval Info */}
          {request.approved_by && request.approver && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">ผู้อนุมัติ</p>
              <p className="font-medium">{request.approver.full_name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(request.approved_at), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
          )}

          {/* Action History */}
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {request.user && (
                <div>
                  <span className="font-medium">ขอลาโดย:</span>{" "}
                  {request.user.full_name}
                  {request.created_at && (
                    <span className="ml-1">
                      ({format(new Date(request.created_at), "dd/MM/yyyy HH:mm")})
                    </span>
                  )}
                </div>
              )}
              {request.updated_by_profile && request.updated_at && (
                <div>
                  <span className="font-medium">อัพเดทโดย:</span>{" "}
                  {request.updated_by_profile.full_name}
                  <span className="ml-1">
                    ({format(new Date(request.updated_at), "dd/MM/yyyy HH:mm")})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          {showApprovalButtons && request.status === "pending" ? (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
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
  );
};

export default LeaveRequestDetailDialog;
