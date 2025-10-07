import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const Employees = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          จัดการพนักงาน
        </h1>
        <p className="text-muted-foreground text-lg">
          บริหารข้อมูลพนักงานและเงินเดือน
        </p>
      </div>

      <Card className="p-12 text-center">
        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <CardTitle className="mb-2">ฟีเจอร์กำลังพัฒนา</CardTitle>
        <p className="text-muted-foreground">
          ระบบจัดการพนักงานกำลังอยู่ในขั้นตอนการพัฒนา
        </p>
      </Card>
    </div>
  );
};

export default Employees;
