import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const PurchaseRequests = () => {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-4xl font-bold">ใบขอซื้อ</h1><Button><Plus size={20} />สร้างใบขอซื้อ</Button></div>
      <Card className="p-12 text-center"><p>ยังไม่มีใบขอซื้อ</p></Card>
    </div>
  );
};

export default PurchaseRequests;