import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CompanyDialog from "@/components/CompanyDialog";
import { Pencil } from "lucide-react";

const CompaniesSettings = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").order("name");
    setCompanies(data || []);
    setLoading(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("companies").update({ is_active: !currentStatus }).eq("id", id);
    if (error) toast.error("เกิดข้อผิดพลาด");
    else { toast.success("อัพเดทสำเร็จ"); fetchCompanies(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>จัดการบริษัท</CardTitle>
        <CompanyDialog onSuccess={fetchCompanies} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">กำลังโหลด...</p>
        ) : companies.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">ยังไม่มีข้อมูลบริษัท</p>
        ) : (
          <Table>
            <TableHeader>
          <TableRow>
            <TableHead>รหัส</TableHead>
            <TableHead>ชื่อบริษัท</TableHead>
            <TableHead>เลขประจำตัวผู้เสียภาษี</TableHead>
            <TableHead>เบอร์โทร</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(company => (
                <TableRow key={company.id}>
              <TableCell className="font-medium">{company.code || "-"}</TableCell>
              <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.tax_id || "-"}</TableCell>
                  <TableCell>{company.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={company.is_active ? "default" : "secondary"}>
                      {company.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <CompanyDialog 
                      editData={company} 
                      onSuccess={fetchCompanies}
                      trigger={
                        <Button size="sm" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button size="sm" variant="outline" onClick={() => toggleActive(company.id, company.is_active)}>
                      {company.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CompaniesSettings;
