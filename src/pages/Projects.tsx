import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Projects = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">โครงการ</h1>
            <p className="text-muted-foreground mt-2">
              จัดการโครงการก่อสร้างทั้งหมด
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            สร้างโครงการใหม่
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการโครงการ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              ยังไม่มีโครงการในระบบ กดปุ่ม "สร้างโครงการใหม่" เพื่อเริ่มต้น
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Projects;
