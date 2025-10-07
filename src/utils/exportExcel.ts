import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate file
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportLaborExpensesToExcel = (expenses: any[]) => {
  const data = expenses.map((expense) => ({
    'เลขที่ใบเสร็จ': expense.invoice_number,
    'ชื่อช่าง': expense.worker?.full_name || '-',
    'โครงการ': expense.project?.name,
    'บริษัท': expense.company?.name,
    'วันที่': new Date(expense.invoice_date).toLocaleDateString('th-TH'),
    'ยอดรวม': expense.subtotal,
    'หัก ณ ที่จ่าย (%)': expense.withholding_tax_rate,
    'จำนวนหัก ณ ที่จ่าย': expense.withholding_tax_amount,
    'ยอดสุทธิ': expense.net_amount || expense.total_amount,
    'สถานะ': expense.status === 'pending' ? 'รอดำเนินการ' : 
             expense.status === 'approved' ? 'อนุมัติแล้ว' : 
             expense.status === 'paid' ? 'จ่ายแล้ว' : 
             expense.status === 'rejected' ? 'ปฏิเสธ' : 'ยกเลิก',
    'ธนาคาร': expense.worker?.bank_name || '-',
    'เลขบัญชี': expense.worker?.bank_account || '-',
    'หมายเหตุ': expense.notes || '-',
  }));
  
  exportToExcel(data, 'รายงานบัญชีค่าแรงงาน', 'ค่าแรงงาน');
};

export const exportExpensesToExcel = (expenses: any[]) => {
  const data = expenses.map((expense) => ({
    'เลขที่บิล': expense.invoice_number,
    'เลขที่ใบกำกับภาษี': expense.tax_invoice_number || '-',
    'ร้านค้า': expense.vendor?.name || '-',
    'โครงการ': expense.project?.name,
    'บริษัท': expense.company?.name,
    'วันที่': new Date(expense.invoice_date).toLocaleDateString('th-TH'),
    'ยอดรวม': expense.subtotal,
    'VAT (%)': expense.vat_rate,
    'VAT (บาท)': expense.vat_amount,
    'ยอดสุทธิ': expense.total_amount,
    'สถานะ': expense.status === 'pending' ? 'รอดำเนินการ' : 
             expense.status === 'approved' ? 'อนุมัติแล้ว' : 
             expense.status === 'paid' ? 'จ่ายแล้ว' : 
             expense.status === 'rejected' ? 'ปฏิเสธ' : 'ยกเลิก',
    'หมายเหตุ': expense.notes || '-',
  }));
  
  exportToExcel(data, 'รายงานบัญชีวัสดุ', 'วัสดุ');
};

export const exportDailyPaymentsToExcel = (payments: any[]) => {
  const data = payments.map((payment) => ({
    'วันที่': new Date(payment.payment_date).toLocaleDateString('th-TH'),
    'ชื่อช่าง': payment.worker?.full_name || 'ไม่ระบุ',
    'โครงการ': payment.project?.name,
    'หมวดหมู่': payment.category?.name || '-',
    'จำนวนเงิน': payment.amount,
    'บัญชีที่ใช้โอน': payment.payment_account ? `${payment.payment_account.name} - ${payment.payment_account.bank_name}` : '-',
    'ประเภทการโอน': payment.payment_type?.name || '-',
    'ธนาคารผู้รับ': payment.worker?.bank_name || '-',
    'เลขบัญชีผู้รับ': payment.worker?.bank_account || '-',
    'สถานะ': payment.status === 'pending' ? 'รอจ่าย' : 
             payment.status === 'paid' ? 'จ่ายแล้ว' : 'ยกเลิก',
    'รายละเอียด': payment.description || '-',
    'หมายเหตุ': payment.notes || '-',
  }));
  
  exportToExcel(data, 'รายงานรายการโอนเงิน', 'รายการโอน');
};
