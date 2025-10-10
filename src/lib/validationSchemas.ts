import { z } from "zod";

// Common validation rules
const positiveNumber = z.number().positive("จำนวนต้องมากกว่า 0");
const nonNegativeNumber = z.number().min(0, "จำนวนต้องไม่ติดลบ");
const shortText = z.string().trim().max(100, "ข้อความต้องไม่เกิน 100 ตัวอักษร");
const mediumText = z.string().trim().max(500, "ข้อความต้องไม่เกิน 500 ตัวอักษร");
const longText = z.string().trim().max(1000, "ข้อความต้องไม่เกิน 1000 ตัวอักษร");

// Expense validation schema
export const expenseSchema = z.object({
  invoiceNumber: shortText.min(1, "กรุณากรอกเลขที่บิล"),
  taxInvoiceNumber: shortText.optional(),
  projectId: z.string().uuid("กรุณาเลือกโครงการ"),
  companyId: z.string().uuid("กรุณาเลือกบริษัท"),
  vendorId: z.string().uuid().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  vatRate: z.number().min(0).max(100, "อัตรา VAT ต้องอยู่ระหว่าง 0-100"),
  creditDays: z.number().min(0).max(365, "จำนวนวันเครดิตต้องอยู่ระหว่าง 0-365").optional(),
  notes: longText.optional(),
});

export const expenseItemSchema = z.object({
  category_id: z.string().uuid("กรุณาเลือกหมวดหมู่"),
  description: mediumText.min(1, "กรุณากรอกรายละเอียด"),
  unit_price: positiveNumber,
  quantity: positiveNumber,
  amount: nonNegativeNumber,
  notes: mediumText.optional(),
});

// Daily payment validation schema
export const dailyPaymentSchema = z.object({
  project_id: z.string().uuid("กรุณาเลือกโครงการ"),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  amount: positiveNumber.max(100000000, "จำนวนเงินต้องไม่เกิน 100,000,000"),
  worker_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  payment_account_id: z.string().uuid().optional(),
  payment_type_id: z.string().uuid().optional(),
  description: mediumText.optional(),
  notes: longText.optional(),
});

// Labor expense validation schema
export const laborExpenseSchema = z.object({
  invoiceNumber: shortText.min(1, "กรุณากรอกเลขที่บิล"),
  projectId: z.string().uuid("กรุณาเลือกโครงการ"),
  companyId: z.string().uuid("กรุณาเลือกบริษัท"),
  workerId: z.string().uuid().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  withholdingTaxRate: z.number().min(0).max(100, "อัตราภาษี ณ ที่จ่ายต้องอยู่ระหว่าง 0-100"),
  notes: longText.optional(),
});

export const laborExpenseItemSchema = z.object({
  category_id: z.string().uuid("กรุณาเลือกหมวดหมู่"),
  description: mediumText.min(1, "กรุณากรอกรายละเอียด"),
  amount: positiveNumber.max(100000000, "จำนวนเงินต้องไม่เกิน 100,000,000"),
  notes: mediumText.optional(),
});

export const laborExpenseDeductionSchema = z.object({
  description: mediumText.min(1, "กรุณากรอกรายละเอียด"),
  amount: positiveNumber.max(100000000, "จำนวนเงินต้องไม่เกิน 100,000,000"),
});

// Company/Vendor validation schema
export const companySchema = z.object({
  code: shortText.optional(),
  name: shortText.min(1, "กรุณากรอกชื่อ"),
  taxId: z.string().trim().max(20, "เลขประจำตัวผู้เสียภาษีต้องไม่เกิน 20 ตัวอักษร").optional(),
  phone: z.string().trim().max(20, "เบอร์โทรต้องไม่เกิน 20 ตัวอักษร").optional(),
  address: longText.optional(),
});

// Worker validation schema
export const workerSchema = z.object({
  full_name: shortText.min(1, "กรุณากรอกชื่อ-นามสกุล"),
  phone: z.string().trim().max(20, "เบอร์โทรต้องไม่เกิน 20 ตัวอักษร").optional(),
  id_card: z.string().trim().max(20, "เลขบัตรประชาชนต้องไม่เกิน 20 ตัวอักษร").optional(),
  bank_name: shortText.optional(),
  bank_account_number: z.string().trim().max(30, "เลขบัญชีต้องไม่เกิน 30 ตัวอักษร").optional(),
  daily_rate: nonNegativeNumber.max(100000, "ค่าแรงต้องไม่เกิน 100,000").optional(),
  notes: longText.optional(),
});

// Payment account validation schema
export const paymentAccountSchema = z.object({
  name: shortText.min(1, "กรุณากรอกชื่อบัญชี"),
  bank_name: shortText.min(1, "กรุณากรอกชื่อธนาคาร"),
  account_number: z.string().trim().min(1, "กรุณากรอกเลขบัญชี").max(30, "เลขบัญชีต้องไม่เกิน 30 ตัวอักษร"),
  account_name: shortText.min(1, "กรุณากรอกชื่อบัญชี"),
  notes: longText.optional(),
});

// Category validation schema
export const categorySchema = z.object({
  code: shortText.optional(),
  name: shortText.min(1, "กรุณากรอกชื่อหมวดหมู่"),
  description: mediumText.optional(),
});

// Helper function to safely parse and validate
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => err.message);
      return { success: false, errors };
    }
    return { success: false, errors: ["เกิดข้อผิดพลาดในการตรวจสอบข้อมูล"] };
  }
}
