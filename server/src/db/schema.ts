
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  date
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['manager', 'collector', 'support_technician', 'custom']);
export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'quarterly', 'semi_annual', 'annual']);
export const clientStatusEnum = pgEnum('client_status', ['active', 'inactive']);
export const paymentStatusEnum = pgEnum('payment_status', ['paid', 'debted']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['pending', 'paid', 'overdue', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'bank_transfer', 'credit_card', 'other']);
export const expenseTypeEnum = pgEnum('expense_type', ['lines', 'electricity', 'maintenance', 'equipment', 'other']);
export const incomeTypeEnum = pgEnum('income_type', ['connecting_service', 'sale_equipment', 'other']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  permissions: text('permissions'), // JSON array as text
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Packages table
export const packagesTable = pgTable('packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  speed: text('speed').notNull(),
  monthly_price: numeric('monthly_price', { precision: 10, scale: 2 }).notNull(),
  billing_cycle: billingCycleEnum('billing_cycle').notNull(),
  status: text('status').notNull().default('active'), // active/inactive
  days_allowed: integer('days_allowed').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Clients table
export const clientsTable = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  package_id: integer('package_id').notNull().references(() => packagesTable.id),
  start_date: date('start_date').notNull(),
  subscription_end_date: date('subscription_end_date').notNull(),
  service_status: clientStatusEnum('service_status').notNull(),
  payment_status: paymentStatusEnum('payment_status').notNull(),
  indebtedness_prefix: text('indebtedness_prefix'),
  balance_creditor: numeric('balance_creditor', { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  last_push_date: timestamp('last_push_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Invoices table
export const invoicesTable = pgTable('invoices', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').notNull().references(() => clientsTable.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  details: text('details'),
  due_date: date('due_date').notNull(),
  status: invoiceStatusEnum('status').notNull().default('pending'),
  is_manual: boolean('is_manual').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').notNull().references(() => clientsTable.id),
  invoice_id: integer('invoice_id').references(() => invoicesTable.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Expenses table
export const expensesTable = pgTable('expenses', {
  id: serial('id').primaryKey(),
  type: expenseTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  date: date('date').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Other income table
export const incomesTable = pgTable('incomes', {
  id: serial('id').primaryKey(),
  type: incomeTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  date: date('date').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Company settings table
export const companySettingsTable = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  company_name: text('company_name').notNull(),
  logo_url: text('logo_url'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  default_language: text('default_language').notNull().default('ar'),
  phone_country_code: text('phone_country_code').notNull().default('+966'),
  currency_symbol: text('currency_symbol').notNull().default('SAR'),
  tax_rate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const clientsRelations = relations(clientsTable, ({ one, many }) => ({
  package: one(packagesTable, {
    fields: [clientsTable.package_id],
    references: [packagesTable.id]
  }),
  invoices: many(invoicesTable),
  payments: many(paymentsTable)
}));

export const packagesRelations = relations(packagesTable, ({ many }) => ({
  clients: many(clientsTable)
}));

export const invoicesRelations = relations(invoicesTable, ({ one, many }) => ({
  client: one(clientsTable, {
    fields: [invoicesTable.client_id],
    references: [clientsTable.id]
  }),
  payments: many(paymentsTable)
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [paymentsTable.client_id],
    references: [clientsTable.id]
  }),
  invoice: one(invoicesTable, {
    fields: [paymentsTable.invoice_id],
    references: [invoicesTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  packages: packagesTable,
  clients: clientsTable,
  invoices: invoicesTable,
  payments: paymentsTable,
  expenses: expensesTable,
  incomes: incomesTable,
  companySettings: companySettingsTable
};

// Type exports
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Package = typeof packagesTable.$inferSelect;
export type NewPackage = typeof packagesTable.$inferInsert;
export type Client = typeof clientsTable.$inferSelect;
export type NewClient = typeof clientsTable.$inferInsert;
export type Invoice = typeof invoicesTable.$inferSelect;
export type NewInvoice = typeof invoicesTable.$inferInsert;
export type Payment = typeof paymentsTable.$inferSelect;
export type NewPayment = typeof paymentsTable.$inferInsert;
export type Expense = typeof expensesTable.$inferSelect;
export type NewExpense = typeof expensesTable.$inferInsert;
export type Income = typeof incomesTable.$inferSelect;
export type NewIncome = typeof incomesTable.$inferInsert;
export type CompanySettings = typeof companySettingsTable.$inferSelect;
export type NewCompanySettings = typeof companySettingsTable.$inferInsert;
