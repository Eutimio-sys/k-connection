import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          ตั้งค่าระบบ
        </h1>
        <p className="text-muted-foreground text-lg">
          จัดการการตั้งค่าและข้อมูลพื้นฐานของระบบ
        </p>
      </div>

      <Card className="p-12 text-center">
        <SettingsIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <CardTitle className="mb-2">ฟีเจอร์กำลังพัฒนา</CardTitle>
        <p className="text-muted-foreground">
          หน้าตั้งค่ากำลังอยู่ในขั้นตอนการพัฒนา
        </p>
      </Card>
    </div>
  );
};

export default Settings;
