import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

export const AccessDenied = () => {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>ไม่มีสิทธิ์เข้าถึง</AlertTitle>
          <AlertDescription>
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้ โปรดติดต่อผู้ดูแลระบบ
          </AlertDescription>
        </Alert>
      </div>
    </main>
  );
};
