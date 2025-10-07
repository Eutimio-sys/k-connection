import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const PurchaseRequests = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ใบขอซื้อ</h1>
            <p className="text-muted-foreground mt-2">
              จัดการใบขอซื้อวัสดุและอุปกรณ์
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            สร้างใบขอซื้อ
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการใบขอซื้อ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              ยังไม่มีใบขอซื้อในระบบ กดปุ่ม "สร้างใบขอซื้อ" เพื่อเริ่มต้น
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PurchaseRequests;
