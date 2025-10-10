import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Receipt, CheckCircle2, Filter } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function TaxDocuments() {
  const [vatDocuments, setVatDocuments] = useState<any[]>([]);
  const [withholdingDocuments, setWithholdingDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    document.title = "ติดตามเอกสารภาษี | ระบบบริหารงาน";
    fetchCurrentUser();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchDocuments();
    }
  }, [currentUserId, selectedCompany, startDate, endDate]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setCompanies(data || []);
  };

  const fetchDocuments = async () => {
    setLoading(true);

    // Build base queries with filters
    let expensesQuery = supabase
      .from("expenses")
      .select(`
        *,
        vendor:vendors(name),
        project:projects(name, company_id),
        company:companies(name),
        receiver:profiles!tax_invoice_received_by(full_name)
      `)
      .gt("vat_amount", 0);

    let laborQuery = supabase
      .from("labor_expenses")
      .select(`
        *,
        worker:workers(full_name),
        project:projects(name, company_id),
        company:companies(name),
        receiver:profiles!withholding_tax_receipt_received_by(full_name)
      `)
      .gt("withholding_tax_amount", 0);

    let incomeQuery = supabase
      .from("project_income")
      .select(`
        *,
        project:projects(name, company_id),
        payment_account:payment_accounts(name)
      `)
      .or("vat_amount.gt.0,withholding_tax_amount.gt.0");

    // Apply company filter
    if (selectedCompany !== "all") {
      expensesQuery = expensesQuery.eq("company_id", selectedCompany);
      laborQuery = laborQuery.eq("project.company_id", selectedCompany);
      incomeQuery = incomeQuery.eq("project.company_id", selectedCompany);
    }

    // Apply date range filter
    if (startDate) {
      expensesQuery = expensesQuery.gte("invoice_date", startDate);
      laborQuery = laborQuery.gte("invoice_date", startDate);
      incomeQuery = incomeQuery.gte("income_date", startDate);
    }
    if (endDate) {
      expensesQuery = expensesQuery.lte("invoice_date", endDate);
      laborQuery = laborQuery.lte("invoice_date", endDate);
      incomeQuery = incomeQuery.lte("income_date", endDate);
    }

    const [expensesData, laborData, incomeData] = await Promise.all([
      expensesQuery.order("invoice_date", { ascending: false }),
      laborQuery.order("invoice_date", { ascending: false }),
      incomeQuery.order("income_date", { ascending: false })
    ]);

    // Combine VAT documents from expenses and project income
    const vatDocs = [
      ...(expensesData.data || []).map(doc => ({
        ...doc,
        source: 'expense',
        date: doc.invoice_date
      })),
      ...(incomeData.data || []).filter(doc => doc.vat_amount > 0).map(doc => ({
        ...doc,
        source: 'income',
        date: doc.income_date,
        invoice_number: doc.description || `INCOME-${doc.id.substring(0, 8)}`,
        subtotal: doc.amount,
        total_amount: doc.amount + (doc.vat_amount || 0)
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setVatDocuments(vatDocs);

    // Combine withholding documents from labor and project income
    const withholdingDocs = [
      ...(laborData.data || []).map(doc => ({
        ...doc,
        source: 'labor',
        date: doc.invoice_date
      })),
      ...(incomeData.data || []).filter(doc => doc.withholding_tax_amount > 0).map(doc => ({
        ...doc,
        source: 'income',
        date: doc.income_date,
        invoice_number: doc.description || `INCOME-${doc.id.substring(0, 8)}`,
        total_amount: doc.amount,
        net_amount: doc.amount - (doc.withholding_tax_amount || 0)
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setWithholdingDocuments(withholdingDocs);
    setLoading(false);
  };

  const markVatReceived = async (expenseId: string) => {
    const { error } = await supabase
      .from("expenses")
      .update({
        tax_invoice_received: true,
        tax_invoice_received_at: new Date().toISOString(),
        tax_invoice_received_by: currentUserId,
      })
      .eq("id", expenseId);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("บันทึกการรับใบกำกับภาษีแล้ว");
      fetchDocuments();
    }
  };

  const markWithholdingReceived = async (laborExpenseId: string) => {
    const { error } = await supabase
      .from("labor_expenses")
      .update({
        withholding_tax_receipt_received: true,
        withholding_tax_receipt_received_at: new Date().toISOString(),
        withholding_tax_receipt_received_by: currentUserId,
      })
      .eq("id", laborExpenseId);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      toast.success("บันทึกการรับใบหักณที่จ่ายแล้ว");
      fetchDocuments();
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  // Calculate VAT totals
  const vatTotals = vatDocuments.reduce(
    (acc, doc) => ({
      subtotal: acc.subtotal + Number(doc.subtotal || 0),
      vat: acc.vat + Number(doc.vat_amount || 0),
      total: acc.total + Number(doc.total_amount || 0),
    }),
    { subtotal: 0, vat: 0, total: 0 }
  );

  const vatReceivedTotals = vatDocuments
    .filter(doc => doc.tax_invoice_received)
    .reduce(
      (acc, doc) => ({
        subtotal: acc.subtotal + Number(doc.subtotal || 0),
        vat: acc.vat + Number(doc.vat_amount || 0),
        total: acc.total + Number(doc.total_amount || 0),
      }),
      { subtotal: 0, vat: 0, total: 0 }
    );

  // Calculate withholding tax totals
  const withholdingTotals = withholdingDocuments.reduce(
    (acc, doc) => ({
      total: acc.total + Number(doc.total_amount || 0),
      withholding: acc.withholding + Number(doc.withholding_tax_amount || 0),
      net: acc.net + Number(doc.net_amount || 0),
    }),
    { total: 0, withholding: 0, net: 0 }
  );

  const withholdingReceivedTotals = withholdingDocuments
    .filter(doc => doc.withholding_tax_receipt_received)
    .reduce(
      (acc, doc) => ({
        total: acc.total + Number(doc.total_amount || 0),
        withholding: acc.withholding + Number(doc.withholding_tax_amount || 0),
        net: acc.net + Number(doc.net_amount || 0),
      }),
      { total: 0, withholding: 0, net: 0 }
    );

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-center">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">ติดตามเอกสารภาษี</h1>
          <p className="text-muted-foreground">จัดการใบกำกับภาษีและใบหักณที่จ่าย</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter size={16} />
          {showFilters ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>บริษัท</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบริษัท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ตั้งแต่วันที่</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>ถึงวันที่</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="vat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vat" className="gap-2">
            <FileText size={16} />
            ใบกำกับภาษี ({vatDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="withholding" className="gap-2">
            <Receipt size={16} />
            ใบหักณที่จ่าย ({withholdingDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vat" className="space-y-4">
          {/* VAT Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  รวมทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ยอดบิล:</span>
                    <span className="font-semibold">{formatCurrency(vatTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT 7%:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(vatTotals.vat)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>รวม:</span>
                    <span className="text-primary">{formatCurrency(vatTotals.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  รับเอกสารแล้ว
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ยอดบิล:</span>
                    <span className="font-semibold">{formatCurrency(vatReceivedTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT 7%:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(vatReceivedTotals.vat)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>รวม:</span>
                    <span className="text-green-600">{formatCurrency(vatReceivedTotals.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ยังไม่ได้รับ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ยอดบิล:</span>
                    <span className="font-semibold">
                      {formatCurrency(vatTotals.subtotal - vatReceivedTotals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT 7%:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(vatTotals.vat - vatReceivedTotals.vat)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>รวม:</span>
                    <span className="text-orange-600">
                      {formatCurrency(vatTotals.total - vatReceivedTotals.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VAT Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle>รายการใบกำกับภาษี</CardTitle>
            </CardHeader>
            <CardContent>
              {vatDocuments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ไม่พบรายการ</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>เลขที่</TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead>บริษัท</TableHead>
                      <TableHead>โครงการ</TableHead>
                      <TableHead>ผู้ขาย/ผู้จ่าย</TableHead>
                      <TableHead className="text-right">ยอดบิล</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">รวม</TableHead>
                      <TableHead className="text-center">สถานะ</TableHead>
                      <TableHead className="text-center">การกระทำ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vatDocuments.map((doc) => (
                      <TableRow key={`${doc.source}-${doc.id}`}>
                        <TableCell>
                          <Badge variant={doc.source === 'expense' ? 'default' : 'secondary'}>
                            {doc.source === 'expense' ? 'ค่าวัสดุ' : 'เบิกเงิน'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{doc.invoice_number}</TableCell>
                        <TableCell>
                          {format(new Date(doc.date), "dd/MM/yyyy", { locale: th })}
                        </TableCell>
                        <TableCell>{doc.company?.name || "-"}</TableCell>
                        <TableCell>{doc.project?.name || "-"}</TableCell>
                        <TableCell>
                          {doc.source === 'expense' 
                            ? (doc.vendor?.name || "-")
                            : (doc.payment_account?.name || "-")
                          }
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(doc.subtotal || 0)}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(doc.vat_amount || 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(doc.total_amount || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          {doc.source === 'expense' ? (
                            doc.tax_invoice_received ? (
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle2 size={14} className="mr-1" />
                                  รับแล้ว
                                </Badge>
                                {doc.tax_invoice_received_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(doc.tax_invoice_received_at), "dd/MM/yyyy HH:mm", { locale: th })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge variant="secondary">รอรับ</Badge>
                            )
                          ) : (
                            <Badge variant="outline">N/A</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {doc.source === 'expense' ? (
                            doc.tax_invoice_received ? (
                              <Button variant="ghost" size="sm" disabled className="gap-1">
                                <CheckCircle2 size={16} />
                                รับแล้ว
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markVatReceived(doc.id)}
                                className="gap-1"
                              >
                                <CheckCircle2 size={16} />
                                รับเอกสาร
                              </Button>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withholding" className="space-y-4">
          {/* Withholding Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  รวมทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ยอดรวม:</span>
                    <span className="font-semibold">{formatCurrency(withholdingTotals.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">หัก ณ ที่จ่าย:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(withholdingTotals.withholding)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>สุทธิ:</span>
                    <span className="text-primary">{formatCurrency(withholdingTotals.net)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  รับเอกสารแล้ว
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ยอดรวม:</span>
                    <span className="font-semibold">{formatCurrency(withholdingReceivedTotals.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">หัก ณ ที่จ่าย:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(withholdingReceivedTotals.withholding)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>สุทธิ:</span>
                    <span className="text-green-600">{formatCurrency(withholdingReceivedTotals.net)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ยังไม่ได้รับ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ยอดรวม:</span>
                    <span className="font-semibold">
                      {formatCurrency(withholdingTotals.total - withholdingReceivedTotals.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">หัก ณ ที่จ่าย:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(withholdingTotals.withholding - withholdingReceivedTotals.withholding)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>สุทธิ:</span>
                    <span className="text-orange-600">
                      {formatCurrency(withholdingTotals.net - withholdingReceivedTotals.net)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Withholding Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle>รายการใบหักณที่จ่าย</CardTitle>
            </CardHeader>
            <CardContent>
              {withholdingDocuments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ไม่พบรายการ</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>เลขที่</TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead>บริษัท</TableHead>
                      <TableHead>โครงการ</TableHead>
                      <TableHead>ช่าง/ผู้รับ</TableHead>
                      <TableHead className="text-right">ยอดรวม</TableHead>
                      <TableHead className="text-right">หัก ณ ที่จ่าย</TableHead>
                      <TableHead className="text-right">สุทธิ</TableHead>
                      <TableHead className="text-center">สถานะ</TableHead>
                      <TableHead className="text-center">การกระทำ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withholdingDocuments.map((doc) => (
                      <TableRow key={`${doc.source}-${doc.id}`}>
                        <TableCell>
                          <Badge variant={doc.source === 'labor' ? 'default' : 'secondary'}>
                            {doc.source === 'labor' ? 'ค่าแรง' : 'เบิกเงิน'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{doc.invoice_number}</TableCell>
                        <TableCell>
                          {format(new Date(doc.date), "dd/MM/yyyy", { locale: th })}
                        </TableCell>
                        <TableCell>{doc.company?.name || "-"}</TableCell>
                        <TableCell>{doc.project?.name || "-"}</TableCell>
                        <TableCell>
                          {doc.source === 'labor' 
                            ? (doc.worker?.full_name || "-")
                            : (doc.payment_account?.name || "-")
                          }
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(doc.total_amount || 0)}</TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">
                          {formatCurrency(doc.withholding_tax_amount || 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(doc.net_amount || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          {doc.source === 'labor' ? (
                            doc.withholding_tax_receipt_received ? (
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle2 size={14} className="mr-1" />
                                  รับแล้ว
                                </Badge>
                                {doc.withholding_tax_receipt_received_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(doc.withholding_tax_receipt_received_at), "dd/MM/yyyy HH:mm", { locale: th })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge variant="secondary">รอรับ</Badge>
                            )
                          ) : (
                            <Badge variant="outline">N/A</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {doc.source === 'labor' ? (
                            doc.withholding_tax_receipt_received ? (
                              <Button variant="ghost" size="sm" disabled className="gap-1">
                                <CheckCircle2 size={16} />
                                รับแล้ว
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markWithholdingReceived(doc.id)}
                                className="gap-1"
                              >
                                <CheckCircle2 size={16} />
                                รับเอกสาร
                              </Button>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
