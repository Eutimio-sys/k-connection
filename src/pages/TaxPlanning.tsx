import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface MonthlyData {
  month: number;
  income: number;
  incomeVat: number;
  incomeWithholding: number;
  expenseVat: number;
  materialCost: number;
  laborCost: number;
  laborWithholding: number;
  contractLaborCost: number;
  contractLaborWithholding: number;
  salary: number;
  socialSecurity: number;
  vatToPay: number;
}

const TaxPlanning = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [additionalWithholdingNeeded, setAdditionalWithholdingNeeded] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyPlanningInputs, setMonthlyPlanningInputs] = useState<{additionalVat: number, additionalWithholding: number}>({ additionalVat: 0, additionalWithholding: 0 });
  const [monthlyPlanningResults, setMonthlyPlanningResults] = useState<{totalVat: number, totalWithholding: number, totalSocialSecurity: number} | null>(null);
  const { toast } = useToast();

  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchTaxData();
    }
  }, [selectedYear, selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    if (data && data.length > 0) {
      setCompanies(data);
      setSelectedCompany(data[0].id);
    }
  };

  const fetchTaxData = async () => {
    try {
      setLoading(true);

      // Fetch project income (only through company)
      const { data: incomeData } = await supabase
        .from("project_income")
        .select(`
          *,
          projects!inner(company_id)
        `)
        .eq("projects.company_id", selectedCompany)
        .eq("is_outside_company", false)
        .gte("income_date", `${selectedYear}-01-01`)
        .lte("income_date", `${selectedYear}-12-31`);

      // Fetch expenses
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .eq("company_id", selectedCompany)
        .gte("invoice_date", `${selectedYear}-01-01`)
        .lte("invoice_date", `${selectedYear}-12-31`);

      // Fetch labor expenses
      const { data: laborData } = await supabase
        .from("labor_expenses")
        .select("*")
        .eq("company_id", selectedCompany)
        .gte("invoice_date", `${selectedYear}-01-01`)
        .lte("invoice_date", `${selectedYear}-12-31`);

      // Fetch employee tax and social security
      const { data: taxSocialData } = await supabase
        .from("employee_tax_social_security")
        .select("*")
        .eq("year", selectedYear);

      // Fetch expense items to categorize by type
      const { data: expenseItemsData } = await supabase
        .from("expense_items")
        .select(`
          *,
          expense_id,
          category:expense_categories(category_type)
        `);

      // Initialize monthly data
      const data: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        income: 0,
        incomeVat: 0,
        incomeWithholding: 0,
        expenseVat: 0,
        materialCost: 0,
        laborCost: 0,
        laborWithholding: 0,
        contractLaborCost: 0,
        contractLaborWithholding: 0,
        salary: 0,
        socialSecurity: 0,
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

      // Process expenses data and categorize by material vs labor
      expensesData?.forEach((expense) => {
        const month = new Date(expense.invoice_date).getMonth();
        data[month].expenseVat += Number(expense.vat_amount) || 0;
        
        // Get expense items for this expense
        const items = expenseItemsData?.filter(item => item.expense_id === expense.id) || [];
        items.forEach(item => {
          const amount = Number(item.amount) || 0;
          const categoryType = (item.category as any)?.category_type;
          
          if (categoryType === 'labor_contractor') {
            data[month].contractLaborCost += amount;
          } else if (categoryType === 'material') {
            data[month].materialCost += amount;
          }
        });
      });

      // Process labor expenses data
      laborData?.forEach((labor) => {
        const month = new Date(labor.invoice_date).getMonth();
        data[month].laborCost += Number(labor.total_amount) || 0;
        data[month].laborWithholding += Number(labor.withholding_tax_amount) || 0;
        
        // Calculate contract labor withholding (3% of contract labor cost)
        const contractLaborForMonth = data[month].contractLaborCost;
        data[month].contractLaborWithholding = contractLaborForMonth * 0.03;
      });

      // Process tax and social security data
      taxSocialData?.forEach((record) => {
        const month = record.month - 1;
        if (month >= 0 && month < 12) {
          data[month].socialSecurity += Number(record.social_security_amount) || 0;
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
        materialCost: acc.materialCost + month.materialCost,
        laborCost: acc.laborCost + month.laborCost,
        laborWithholding: acc.laborWithholding + month.laborWithholding,
        contractLaborCost: acc.contractLaborCost + month.contractLaborCost,
        contractLaborWithholding: acc.contractLaborWithholding + month.contractLaborWithholding,
        salary: acc.salary + month.salary,
        socialSecurity: acc.socialSecurity + month.socialSecurity,
        vatToPay: acc.vatToPay + month.vatToPay,
      }),
      {
        income: 0,
        incomeVat: 0,
        incomeWithholding: 0,
        expenseVat: 0,
        materialCost: 0,
        laborCost: 0,
        laborWithholding: 0,
        contractLaborCost: 0,
        contractLaborWithholding: 0,
        salary: 0,
        socialSecurity: 0,
        vatToPay: 0,
      }
    );
  };

  const yearlyTotals = calculateYearlyTotals();

  // Calculate labor cost without withholding
  const laborCostWithoutWithholding = yearlyTotals.laborCost - yearlyTotals.laborWithholding;

  // Calculate accumulated withholding tax (sum of income withholding from all months)
  const accumulatedWithholding = yearlyTotals.incomeWithholding;

  // Calculate net profit (รายได้ - ยอดวัสดุ - ค่าแรงไม่หักภาษี - ค่าแรงเหมา - เงินเดือน - ประกันสังคม)
  const netProfit = yearlyTotals.income - yearlyTotals.materialCost - laborCostWithoutWithholding - yearlyTotals.contractLaborCost - yearlyTotals.salary - yearlyTotals.socialSecurity;

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

  const handleMonthlyCalculate = () => {
    const monthData = monthlyData[selectedMonth - 1];
    
    setMonthlyPlanningResults({
      totalVat: monthData.vatToPay + monthlyPlanningInputs.additionalVat,
      totalWithholding: monthData.incomeWithholding + monthData.laborWithholding + monthData.contractLaborWithholding + monthlyPlanningInputs.additionalWithholding,
      totalSocialSecurity: monthData.socialSecurity,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">วางแผนภาษี</h1>
        <div className="flex gap-4">
          <Select
            value={selectedCompany}
            onValueChange={setSelectedCompany}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="เลือกบริษัท" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      {loading || !selectedCompany ? (
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
                      <TableHead className="text-right">ยอดวัสดุ</TableHead>
                      <TableHead className="text-right">ค่าแรง</TableHead>
                      <TableHead className="text-right">หักณที่จ่าย ค่าแรง</TableHead>
                      <TableHead className="text-right">ค่าแรงเหมา</TableHead>
                      <TableHead className="text-right">หักณที่จ่าย ค่าแรงเหมา</TableHead>
                      <TableHead className="text-right">เงินเดือน</TableHead>
                      <TableHead className="text-right">ประกันสังคม</TableHead>
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
                        <TableCell className="text-right">{formatCurrency(data.materialCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.laborCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.laborWithholding)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.contractLaborCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.contractLaborWithholding)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.salary)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.socialSecurity)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>รวมทั้งปี</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.income)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.incomeVat)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.incomeWithholding)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.expenseVat)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.vatToPay)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.materialCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.laborCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.laborWithholding)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.contractLaborCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.contractLaborWithholding)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearlyTotals.socialSecurity)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>สรุปภาษีประจำเดือน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>เลือกเดือน</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {monthlyData[selectedMonth - 1] && (
                  <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="font-semibold text-lg">{months[selectedMonth - 1]}</h3>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">หักณที่จ่าย รายได้</p>
                        <p className="font-semibold">{formatCurrency(monthlyData[selectedMonth - 1].incomeWithholding)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">หักณที่จ่าย ค่าแรง</p>
                        <p className="font-semibold">{formatCurrency(monthlyData[selectedMonth - 1].laborWithholding)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">หักณที่จ่าย ค่าแรงเหมา</p>
                        <p className="font-semibold">{formatCurrency(monthlyData[selectedMonth - 1].contractLaborWithholding)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ประกันสังคม</p>
                        <p className="font-semibold">{formatCurrency(monthlyData[selectedMonth - 1].socialSecurity)}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground">VAT ที่ต้องจ่าย</p>
                      <p className="font-semibold">{formatCurrency(monthlyData[selectedMonth - 1].vatToPay)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>VAT เพิ่มเติม</Label>
                        <Input
                          type="number"
                          value={monthlyPlanningInputs.additionalVat}
                          onChange={(e) => setMonthlyPlanningInputs({
                            ...monthlyPlanningInputs,
                            additionalVat: Number(e.target.value) || 0
                          })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>หักณที่จ่ายเพิ่มเติม</Label>
                        <Input
                          type="number"
                          value={monthlyPlanningInputs.additionalWithholding}
                          onChange={(e) => setMonthlyPlanningInputs({
                            ...monthlyPlanningInputs,
                            additionalWithholding: Number(e.target.value) || 0
                          })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <Button onClick={handleMonthlyCalculate} className="w-full">
                      คำนวณ
                    </Button>

                    {monthlyPlanningResults && (
                      <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                        <h4 className="font-semibold">ผลลัพธ์หลังวางแผน</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">VAT รวม</p>
                            <p className="font-semibold">{formatCurrency(monthlyPlanningResults.totalVat)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">หักณที่จ่ายรวม</p>
                            <p className="font-semibold">{formatCurrency(monthlyPlanningResults.totalWithholding)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">ประกันสังคม</p>
                            <p className="font-semibold">{formatCurrency(monthlyPlanningResults.totalSocialSecurity)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  <span>ค่าใช้จ่ายรวม (วัสดุ + ค่าแรงเหมา)</span>
                  <span className="font-semibold">{formatCurrency(yearlyTotals.materialCost + yearlyTotals.contractLaborCost)}</span>
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
