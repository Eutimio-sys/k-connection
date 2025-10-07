import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, DollarSign, Check, X } from "lucide-react";
import { toast } from "sonner";
import PurchaseRequestDialog from "@/components/PurchaseRequestDialog";

const PurchaseRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile) setUserRole(profile.role);
    }

    const { data, error } = await supabase
      .from("purchase_requests")
      .select(`*, project:projects(name), category:expense_categories(name), requester:profiles!requested_by(full_name)`)
      .order("created_at", { ascending: false });

    if (error) toast.error("เกิดข้อผิดพลาด");
    else setRequests(data || []);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("purchase_requests").update({
      status: "approved",
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) toast.error("เกิดข้อผิดพลาด");
    else { toast.success("อนุมัติสำเร็จ"); fetchData(); }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from("purchase_requests").update({ status: "rejected" }).eq("id", id);
    if (error) toast.error("เกิดข้อผิดพลาด");
    else { toast.success("ปฏิเสธสำเร็จ"); fetchData(); }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "รออนุมัติ", variant: "secondary" },
      approved: { label: "อนุมัติแล้ว", variant: "default" },
      rejected: { label: "ไม่อนุมัติ", variant: "destructive" },
      completed: { label: "เสร็จสิ้น", variant: "outline" },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  const canApprove = userRole === "admin" || userRole === "manager";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">ใบขอซื้อ</h1>
          <p className="text-muted-foreground text-lg">จัดการและติดตามใบขอซื้อวัสดุและอุปกรณ์</p>
        </div>
        <PurchaseRequestDialog onSuccess={fetchData} />
      </div>

      {loading ? (
        <div className="text-center py-12"><p className="text-muted-foreground">กำลังโหลด...</p></div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">ยังไม่มีใบขอซื้อในระบบ</p>
          <PurchaseRequestDialog onSuccess={fetchData} />
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-elegant transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{request.item_name}</CardTitle>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{request.description || "ไม่มีคำอธิบาย"}</p>
                  </div>
                  {canApprove && request.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" onClick={() => handleApprove(request.id)} className="gap-1">
                        <Check size={16} />อนุมัติ
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(request.id)} className="gap-1">
                        <X size={16} />ปฏิเสธ
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Package size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">จำนวน</p>
                      <p className="font-medium">{request.quantity} {request.unit}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={16} className="text-accent" />
                    <div>
                      <p className="text-muted-foreground text-xs">ราคาประมาณ</p>
                      <p className="font-semibold text-accent">{formatCurrency(request.estimated_price)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">วันที่สร้าง</p>
                      <p className="font-medium">{new Date(request.created_at).toLocaleDateString("th-TH")}</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs mb-1">รายละเอียด</p>
                    <p><span className="text-muted-foreground">โครงการ:</span> {request.project?.name}</p>
                    <p><span className="text-muted-foreground">หมวดหมู่:</span> {request.category?.name}</p>
                    <p><span className="text-muted-foreground">ผู้ขอ:</span> {request.requester?.full_name}</p>
                  </div>
                </div>

                {request.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground"><span className="font-medium">หมายเหตุ:</span> {request.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseRequests;
