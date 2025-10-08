import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MonthlyData {
  month: number;
  income: number;
  incomeVat: number;
  incomeWithholding: number;
  expenseVat: number;
  laborCost: number;
  laborWithholding: number;
  salary: number;
  socialSecurity: number;
  employeeWithholding: number;
  vatToPay: number;
}

const TaxPlanning = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [additionalWithholdingNeeded, setAdditionalWithholdingNeeded] = useState(0);
  const { toast } = useToast();

  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  useEffect(() => {
    fetchTaxData();
  }, [selectedYear]);

  const fetchTaxData = async () => {
    try {
      setLoading(true);

      // Fetch project income
      const { data: incomeData } = await supabase
        .from("project_income")
        .select("*")
        .gte("income_date", `${selectedYear}-01-01`)
        .lte("income_date", `${selectedYear}-12-31`);

      // Fetch expenses
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .gte("invoice_date", `${selectedYear}-01-01`)
        .lte("invoice_date", `${selectedYear}-12-31`);

      // Fetch labor expenses
      const { data: laborData } = await supabase
        .from("labor_expenses")
        .select("*")
        .gte("invoice_date", `${selectedYear}-01-01`)
        .lte("invoice_date", `${selectedYear}-12-31`);

      // Fetch employee tax and social security
      const { data: taxSocialData } = await supabase
        .from("employee_tax_social_security")
        .select("*")
        .eq("year", selectedYear);

      // Initialize monthly data
      const data: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        income: 0,
        incomeVat: 0,
        incomeWithholding: 0,
        expenseVat: 0,
        laborCost: 0,
        laborWithholding: 0,
        salary: 0,
        socialSecurity: 0,
        employeeWithholding: 0,
        vatToPay: 0,
      }));

      // Process income data
      incomeData?.forEach((income) => {
        const month = new Date(income.income_date).getMonth();
        const amount = Number(income.amount) || 0;
        const incomeVat = Number(income.vat_amount) || 0;
        const incomeWithholding = Number(income.withholding_tax_amount) || 0;
        
        data[month].income += amount;
        data[month].incomeVat += incomeVat;
        data[month].incomeWithholding += incomeWithholding;
      });

      // Process expenses data
      expensesData?.forEach((expense) => {
        const month = new Date(expense.invoice_date).getMonth();
        data[month].expenseVat += Number(expense.vat_amount) || 0;
      });

      // Process labor expenses data
      laborData?.forEach((labor) => {
        const month = new Date(labor.invoice_date).getMonth();
        data[month].laborCost += Number(labor.total_amount) || 0;
        data[month].laborWithholding += Number(labor.withholding_tax_amount) || 0;
      });

      // Process tax and social security data
      taxSocialData?.forEach((record) => {
        const month = record.month - 1;
        if (month >= 0 && month < 12) {
          data[month].socialSecurity += Number(record.social_security_amount) || 0;
          data[month].employeeWithholding += Number(record.tax_amount) || 0;
        }
      });

      // Calculate VAT to pay (previous month's expense VAT - previous month's income VAT)
      for (let i = 0; i < 12; i++) {
        if (i === 0) {
          // First month - no previous month
          data[i].vatToPay = 0;
        } else {
          data[i].vatToPay = data[i - 1].expenseVat - data[i - 1].incomeVat;
        }
      }

      setMonthlyData(data);
    } catch (error) {
      console.error("Error fetching tax data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลภาษีได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateYearlyTotals = () => {
    return monthlyData.reduce(
      (acc, month) => ({
        income: acc.income + month.income,
        incomeVat: acc.incomeVat + month.incomeVat,
        incomeWithholding: acc.incomeWithholding + month.incomeWithholding,
        expenseVat: acc.expenseVat + month.expenseVat,
        laborCost: acc.laborCost + month.laborCost,
        laborWithholding: acc.laborWithholding + month.laborWithholding,
        salary: acc.salary + month.salary,
        socialSecurity: acc.socialSecurity + month.socialSecurity,
        employeeWithholding: acc.employeeWithholding + month.employeeWithholding,
        vatToPay: acc.vatToPay + month.vatToPay,
      }),
      {
        income: 0,
        incomeVat: 0,
        incomeWithholding: 0,
        expenseVat: 0,
        laborCost: 0,
        laborWithholding: 0,
        salary: 0,
        socialSecurity: 0,
        employeeWithholding: 0,
        vatToPay: 0,
      }
    );
  };

  const yearlyTotals = calculateYearlyTotals();

  // Calculate total expenses (from expenses table, without VAT)
  const totalExpensesWithoutVat = yearlyTotals.expenseVat / 0.07; // Reverse calculate from VAT

  // Calculate labor cost without withholding
  const laborCostWithoutWithholding = yearlyTotals.laborCost - yearlyTotals.laborWithholding;

  // Calculate accumulated withholding tax (sum of income withholding from all months)
  const accumulatedWithholding = yearlyTotals.incomeWithholding;

  // Calculate net profit (รายได้ - ยอดบิลไม่รวมVAT - ค่าแรงไม่หักภาษี - เงินเดือน - ประกันสังคม - ภงด.1)
  const netProfit = yearlyTotals.income - totalExpensesWithoutVat - laborCostWithoutWithholding - yearlyTotals.salary - yearlyTotals.socialSecurity - yearlyTotals.employeeWithholding;

  // Corporate income tax (20% on net profit)
  const corporateIncomeTax = netProfit > 0 ? netProfit * 0.20 : 0;

  // Annual tax payable (20% corporate tax - income withholding)
  const annualTaxPayable = Math.max(0, corporateIncomeTax - accumulatedWithholding);

  // Adjusted calculations with planning
  const adjustedWithholding = accumulatedWithholding + additionalWithholdingNeeded;
  const adjustedAnnualTax = Math.max(0, corporateIncomeTax - adjustedWithholding);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">วางแผนภาษี</h1>
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year + 543}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>รายละเอียดรายเดือน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">เดือน</TableHead>
                      <TableHead className="text-right">รายได้</TableHead>
                      <TableHead className="text-right">VAT รายได้</TableHead>
                      <TableHead className="text-right">หักณที่จ่าย รายได้</TableHead>
                      <TableHead className="text-right">VAT ค่าใช้จ่าย</TableHead>
                      <TableHead className="text-right">VAT ที่ต้องจ่าย</TableHead>
                      <TableHead className="text-right">ค่าแรง</TableHead>
                      <TableHead className="text-right">หักณที่จ่าย ค่าแรง</TableHead>
                      <TableHead className="text-right">เงินเดือน</TableHead>
                      <TableHead className="text-right">ประกันสังคม</TableHead>
                      <TableHead className="text-right">ภงด.1</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((data, index) => (
                      <TableRow key={data.month}>
                        <TableCell className="font-medium">{months[index]}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.income)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.incomeVat)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.incomeWithholding)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.expenseVat)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.vatToPay)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.laborCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.laborWithholding)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.salary)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.socialSecurity)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.employeeWithholding)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>รวมทั้งปี</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.income)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.incomeVat)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.incomeWithholding)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.expenseVat)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.vatToPay)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.laborCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.laborWithholding)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.socialSecurity)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.employeeWithholding)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>สรุปภาษีประจำปี</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span>รายได้รวม</span>
                  <span className="font-semibold">{formatCurrency(yearlyTotals.income)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>ค่าใช้จ่ายรวม (ไม่รวม VAT)</span>
                  <span className="font-semibold">{formatCurrency(totalExpensesWithoutVat)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>หักณที่จ่ายสะสม (รายได้)</span>
                  <span className="font-semibold">{formatCurrency(accumulatedWithholding)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>กำไรสุทธิ</span>
                  <span className="font-semibold">{formatCurrency(netProfit)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>ภาษีเงินได้นิติบุคคล (20%)</span>
                  <span className="font-semibold text-destructive">{formatCurrency(corporateIncomeTax)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>ภาษีที่ต้องนำส่งประจำปี</span>
                  <span className="font-semibold text-destructive">{formatCurrency(annualTaxPayable)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>วางแผนลดภาษี</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="additionalWithholding">จำนวนที่ต้องหาเพิ่ม หักณที่จ่าย</Label>
                  <Input
                    id="additionalWithholding"
                    type="number"
                    value={additionalWithholdingNeeded}
                    onChange={(e) => setAdditionalWithholdingNeeded(Number(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                  <p className="text-sm text-muted-foreground">
                    หักณที่จ่ายรวม: {formatCurrency(adjustedWithholding)}
                  </p>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">ภาษีนิติบุคคลที่ต้องจ่ายหลังวางแผน</span>
                    <span className="font-bold text-lg text-destructive">
                      {formatCurrency(adjustedAnnualTax)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ประหยัด: {formatCurrency(annualTaxPayable - adjustedAnnualTax)}
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-semibold">คำแนะนำ:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>เพิ่มค่าใช้จ่ายที่มี VAT เพื่อลดยอด VAT ต้องจ่าย</li>
                    <li>เพิ่มหักณที่จ่ายเพื่อนำไปหักภาษีนิติบุคคล</li>
                    <li>วางแผนค่าใช้จ่ายให้เหมาะสมเพื่อลดภาระภาษี</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default TaxPlanning;
