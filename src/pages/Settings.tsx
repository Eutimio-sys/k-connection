import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CompaniesSettings from "@/components/settings/CompaniesSettings";
import CategoriesSettings from "@/components/settings/CategoriesSettings";
import VendorsSettings from "@/components/settings/VendorsSettings";
import WorkersSettings from "@/components/settings/WorkersSettings";
import PaymentAccountsSettings from "@/components/settings/PaymentAccountsSettings";

const Settings = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          ตั้งค่าระบบ
        </h1>
        <p className="text-muted-foreground text-lg">จัดการข้อมูลพื้นฐานและการตั้งค่าต่างๆ</p>
      </div>

      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="companies">บริษัท</TabsTrigger>
          <TabsTrigger value="categories">หมวดหมู่</TabsTrigger>
          <TabsTrigger value="vendors">ร้านค้า</TabsTrigger>
          <TabsTrigger value="workers">ช่าง</TabsTrigger>
          <TabsTrigger value="payments">บัญชีจ่ายเงิน</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <CompaniesSettings />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesSettings />
        </TabsContent>

        <TabsContent value="vendors">
          <VendorsSettings />
        </TabsContent>

        <TabsContent value="workers">
          <WorkersSettings />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentAccountsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
