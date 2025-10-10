import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface SalaryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  year: number;
}

interface SalaryRecord {
  id: string;
  salary_amount: number;
  effective_date: string;
  created_at: string;
  created_by: string;
  notes?: string;
}

const SalaryHistoryDialog = ({ open, onOpenChange, userId, year }: SalaryHistoryDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [taxRecords, setTaxRecords] = useState<any[]>([]);

  useEffect(() => {
    if (open && userId) {
      fetchHistory();
    }
  }, [open, userId, year]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Fetch salary records for the year
      const { data: salaryData } = await supabase
        .from("salary_records")
        .select("*")
        .eq("user_id", userId)
        .gte("effective_date", `${year}-01-01`)
        .lte("effective_date", `${year}-12-31`)
        .order("effective_date", { ascending: false });

      // Fetch tax and social security records
      const { data: taxData } = await supabase
        .from("employee_tax_social_security")
        .select("*")
        .eq("user_id", userId)
        .eq("year", year)
        .order("month");

      setSalaryRecords(salaryData || []);
      setTaxRecords(taxData || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  };

  const getMonthName = (month: number) => {
    const months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return months[month - 1];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ประวัติการรับเงิน ปี {year + 543}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Salary Records Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">ประวัติเงินเดือน</h3>
              {salaryRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่มีผล</TableHead>
                      <TableHead className="text-right">จำนวนเงิน</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {new Date(record.effective_date).toLocaleDateString("th-TH")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(record.salary_amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  ไม่มีข้อมูลเงินเดือนในปีนี้
                </p>
              )}
            </div>

            {/* Tax & Social Security Records Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">ประวัติภาษีและประกันสังคม</h3>
              {taxRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เดือน</TableHead>
                      <TableHead className="text-right">ภาษี</TableHead>
                      <TableHead className="text-right">ประกันสังคม</TableHead>
                      <TableHead className="text-right">รวม</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{getMonthName(record.month)}</TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatCurrency(record.tax_amount)}
                        </TableCell>
                        <TableCell className="text-right text-accent">
                          {formatCurrency(record.social_security_amount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(record.tax_amount + record.social_security_amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  ไม่มีข้อมูลภาษีและประกันสังคมในปีนี้
                </p>
              )}
            </div>

            {/* Summary Section */}
            {(salaryRecords.length > 0 || taxRecords.length > 0) && (
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">รายได้ทั้งหมด</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(
                        salaryRecords.length > 0 
                          ? salaryRecords[0].salary_amount * 12 
                          : 0
                      )}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                    <p className="text-sm text-muted-foreground mb-1">ภาษีทั้งหมด</p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatCurrency(
                        taxRecords.reduce((sum, r) => sum + Number(r.tax_amount), 0)
                      )}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                    <p className="text-sm text-muted-foreground mb-1">ประกันสังคมทั้งหมด</p>
                    <p className="text-2xl font-bold text-accent">
                      {formatCurrency(
                        taxRecords.reduce((sum, r) => sum + Number(r.social_security_amount), 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SalaryHistoryDialog;
