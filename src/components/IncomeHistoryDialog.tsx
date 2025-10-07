import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

interface IncomeHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const IncomeHistoryDialog = ({ open, onOpenChange, userId }: IncomeHistoryDialogProps) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (open) {
      fetchIncome();
    }
  }, [open, userId, startDate, endDate]);

  const fetchIncome = async () => {
    setLoading(true);

    // Fetch salary records
    const { data: salaryData, error: salaryError } = await supabase
      .from("salary_records")
      .select("*")
      .eq("user_id", userId)
      .gte("effective_date", startDate)
      .lte("effective_date", endDate)
      .order("effective_date", { ascending: false });

    if (salaryError) {
      toast.error("เกิดข้อผิดพลาด: " + salaryError.message);
    }

    // Fetch tax and social security records
    const { data: taxData, error: taxError } = await supabase
      .from("employee_tax_social_security")
      .select("*")
      .eq("user_id", userId);

    if (taxError) {
      toast.error("เกิดข้อผิดพลาด: " + taxError.message);
    }

    // Combine and organize data
    const combined = (salaryData || []).map((salary: any) => {
      const taxRecord = (taxData || []).find(
        (t: any) => t.year === new Date(salary.effective_date).getFullYear() &&
                    t.month === new Date(salary.effective_date).getMonth() + 1
      );
      return {
        date: salary.effective_date,
        salary: salary.salary_amount,
        tax: taxRecord?.tax_amount || 0,
        socialSecurity: taxRecord?.social_security_amount || 0,
        net: salary.salary_amount - (taxRecord?.tax_amount || 0) - (taxRecord?.social_security_amount || 0),
      };
    });

    setRecords(combined);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const getTotals = () => {
    return records.reduce(
      (acc, record) => ({
        salary: acc.salary + record.salary,
        tax: acc.tax + record.tax,
        socialSecurity: acc.socialSecurity + record.socialSecurity,
        net: acc.net + record.net,
      }),
      { salary: 0, tax: 0, socialSecurity: 0, net: 0 }
    );
  };

  const totals = getTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">ประวัติรายได้</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>วันที่เริ่มต้น</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label>วันที่สิ้นสุด</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-950">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">รวมเงินเดือน</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totals.salary)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">รวมภาษี</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(totals.tax)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 dark:bg-orange-950">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">รวมประกันสังคม</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(totals.socialSecurity)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">รวมสุทธิ</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totals.net)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* History Table */}
          {loading ? (
            <p className="text-center py-8">กำลังโหลด...</p>
          ) : records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">เงินเดือน</TableHead>
                  <TableHead className="text-right">ภาษี</TableHead>
                  <TableHead className="text-right">ประกันสังคม</TableHead>
                  <TableHead className="text-right">สุทธิ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {format(new Date(record.date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(record.salary)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(record.tax)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(record.socialSecurity)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(record.net)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              ไม่พบข้อมูลในช่วงเวลาที่เลือก
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomeHistoryDialog;