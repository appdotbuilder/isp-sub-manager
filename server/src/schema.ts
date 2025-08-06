
import { z } from 'zod';

// User and Authentication schemas
export const userRoleSchema = z.enum(['manager', 'collector', 'support_technician', 'custom']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  permissions: z.array(z.string()).nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema,
  permissions: z.array(z.string()).optional(),
  is_active: z.boolean().default(true)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Package schemas
export const billingCycleSchema = z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']);
export type BillingCycle = z.infer<typeof billingCycleSchema>;

export const packageSchema = z.object({
  id: z.number(),
  name: z.string(),
  speed: z.string(),
  monthly_price: z.number(),
  billing_cycle: billingCycleSchema,
  status: z.enum(['active', 'inactive']),
  days_allowed: z.number().int(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Package = z.infer<typeof packageSchema>;

export const createPackageInputSchema = z.object({
  name: z.string().min(1),
  speed: z.string(),
  monthly_price: z.number().positive(),
  billing_cycle: billingCycleSchema,
  days_allowed: z.number().int().nonnegative(),
  description: z.string().nullable().optional()
});

export type CreatePackageInput = z.infer<typeof createPackageInputSchema>;

// Client schemas
export const clientStatusSchema = z.enum(['active', 'inactive']);
export const paymentStatusSchema = z.enum(['paid', 'debted']);

export const clientSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string(),
  address: z.string().nullable(),
  package_id: z.number(),
  start_date: z.coerce.date(),
  subscription_end_date: z.coerce.date(),
  service_status: clientStatusSchema,
  payment_status: paymentStatusSchema,
  indebtedness_prefix: z.string().nullable(),
  balance_creditor: z.number(),
  notes: z.string().nullable(),
  last_push_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Client = z.infer<typeof clientSchema>;

export const createClientInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().nullable().optional(),
  package_id: z.number(),
  start_date: z.coerce.date().optional(),
  service_status: clientStatusSchema.default('active'),
  payment_status: paymentStatusSchema.default('paid'),
  indebtedness_prefix: z.string().nullable().optional(),
  balance_creditor: z.number().default(0),
  notes: z.string().nullable().optional()
});

export type CreateClientInput = z.infer<typeof createClientInputSchema>;

// Invoice schemas
export const invoiceStatusSchema = z.enum(['pending', 'paid', 'overdue', 'cancelled']);

export const invoiceSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  amount: z.number(),
  details: z.string().nullable(),
  due_date: z.coerce.date(),
  status: invoiceStatusSchema,
  is_manual: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const createInvoiceInputSchema = z.object({
  client_id: z.number(),
  amount: z.number().positive(),
  details: z.string().nullable().optional(),
  due_date: z.coerce.date(),
  is_manual: z.boolean().default(false)
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

// Payment schemas
export const paymentMethodSchema = z.enum(['cash', 'bank_transfer', 'credit_card', 'other']);

export const paymentSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  invoice_id: z.number().nullable(),
  amount: z.number(),
  method: paymentMethodSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentInputSchema = z.object({
  client_id: z.number(),
  invoice_id: z.number().nullable().optional(),
  amount: z.number().positive(),
  method: paymentMethodSchema,
  notes: z.string().nullable().optional()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Expense schemas
export const expenseTypeSchema = z.enum(['lines', 'electricity', 'maintenance', 'equipment', 'other']);

export const expenseSchema = z.object({
  id: z.number(),
  type: expenseTypeSchema,
  amount: z.number(),
  date: z.coerce.date(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Expense = z.infer<typeof expenseSchema>;

export const createExpenseInputSchema = z.object({
  type: expenseTypeSchema,
  amount: z.number().positive(),
  date: z.coerce.date(),
  description: z.string().nullable().optional()
});

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

// Other Income schemas
export const incomeTypeSchema = z.enum(['connecting_service', 'sale_equipment', 'other']);

export const incomeSchema = z.object({
  id: z.number(),
  type: incomeTypeSchema,
  amount: z.number(),
  date: z.coerce.date(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Income = z.infer<typeof incomeSchema>;

export const createIncomeInputSchema = z.object({
  type: incomeTypeSchema,
  amount: z.number().positive(),
  date: z.coerce.date(),
  description: z.string().nullable().optional()
});

export type CreateIncomeInput = z.infer<typeof createIncomeInputSchema>;

// Settings schemas
export const companySettingsSchema = z.object({
  id: z.number(),
  company_name: z.string(),
  logo_url: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  default_language: z.string(),
  phone_country_code: z.string(),
  currency_symbol: z.string(),
  tax_rate: z.number(),
  updated_at: z.coerce.date()
});

export type CompanySettings = z.infer<typeof companySettingsSchema>;

// Dashboard statistics schema
export const dashboardStatsSchema = z.object({
  total_clients: z.number(),
  current_month_revenues: z.number(),
  number_of_debtors: z.number(),
  total_debts: z.number(),
  total_active_clients: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Report schemas
export const financialReportSchema = z.object({
  subscription_revenues: z.number(),
  other_income: z.number(),
  total_revenues: z.number(),
  total_expenses: z.number(),
  net_profit: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type FinancialReport = z.infer<typeof financialReportSchema>;

export const debtorReportItemSchema = z.object({
  client_id: z.number(),
  client_name: z.string(),
  phone: z.string(),
  due_amount: z.number(),
  days_delay: z.number(),
  last_payment_date: z.coerce.date().nullable()
});

export type DebtorReportItem = z.infer<typeof debtorReportItemSchema>;

// Filter and search schemas
export const clientFilterSchema = z.object({
  search: z.string().optional(),
  status: clientStatusSchema.optional(),
  payment_status: paymentStatusSchema.optional(),
  package_id: z.number().optional()
});

export type ClientFilter = z.infer<typeof clientFilterSchema>;

export const invoiceFilterSchema = z.object({
  client_id: z.number().optional(),
  status: invoiceStatusSchema.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional()
});

export type InvoiceFilter = z.infer<typeof invoiceFilterSchema>;

export const reportFilterSchema = z.object({
  date_from: z.coerce.date(),
  date_to: z.coerce.date()
});

export type ReportFilter = z.infer<typeof reportFilterSchema>;
