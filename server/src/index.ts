
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginInputSchema, 
  createUserInputSchema,
  createClientInputSchema,
  clientFilterSchema,
  createPackageInputSchema,
  createInvoiceInputSchema,
  invoiceFilterSchema,
  createPaymentInputSchema,
  createExpenseInputSchema,
  createIncomeInputSchema,
  reportFilterSchema
} from './schema';

// Import handlers
import { loginUser, createUser, getCurrentUser } from './handlers/auth';
import { getDashboardStats } from './handlers/dashboard';
import { 
  createClient, 
  getClients, 
  getClientById, 
  updateClient, 
  deleteClient,
  getClientDueAmount 
} from './handlers/clients';
import { 
  createPackage, 
  getPackages, 
  getPackageById, 
  updatePackage, 
  deletePackage,
  getActivePackages 
} from './handlers/packages';
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById, 
  updateInvoiceStatus, 
  deleteInvoice,
  generateMonthlyInvoices,
  getOverdueInvoices 
} from './handlers/invoices';
import { 
  createPayment, 
  getPayments, 
  getPaymentById, 
  createBatchPayment 
} from './handlers/payments';
import { 
  createExpense, 
  getExpenses, 
  getExpenseById, 
  updateExpense, 
  deleteExpense,
  getTotalExpenses 
} from './handlers/expenses';
import { 
  createIncome, 
  getIncomes, 
  getIncomeById, 
  updateIncome, 
  deleteIncome,
  getTotalOtherIncome 
} from './handlers/incomes';
import { 
  generateFinancialReport, 
  generateDebtorReport,
  getMonthlyRevenues,
  getRevenueByPackage 
} from './handlers/reports';
import { 
  getCompanySettings, 
  updateCompanySettings, 
  createBackup, 
  restoreFromBackup 
} from './handlers/settings';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),
  
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getCurrentUser: publicProcedure
    .input(z.number())
    .query(({ input }) => getCurrentUser(input)),

  // Dashboard routes
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  // Client management routes
  createClient: publicProcedure
    .input(createClientInputSchema)
    .mutation(({ input }) => createClient(input)),
  
  getClients: publicProcedure
    .input(clientFilterSchema.optional())
    .query(({ input }) => getClients(input)),
  
  getClientById: publicProcedure
    .input(z.number())
    .query(({ input }) => getClientById(input)),
  
  updateClient: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      updates: createClientInputSchema.partial() 
    }))
    .mutation(({ input }) => updateClient(input.id, input.updates)),
  
  deleteClient: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteClient(input)),
  
  getClientDueAmount: publicProcedure
    .input(z.number())
    .query(({ input }) => getClientDueAmount(input)),

  // Package management routes
  createPackage: publicProcedure
    .input(createPackageInputSchema)
    .mutation(({ input }) => createPackage(input)),
  
  getPackages: publicProcedure
    .query(() => getPackages()),
  
  getActivePackages: publicProcedure
    .query(() => getActivePackages()),
  
  getPackageById: publicProcedure
    .input(z.number())
    .query(({ input }) => getPackageById(input)),
  
  updatePackage: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      updates: createPackageInputSchema.partial() 
    }))
    .mutation(({ input }) => updatePackage(input.id, input.updates)),
  
  deletePackage: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deletePackage(input)),

  // Invoice management routes
  createInvoice: publicProcedure
    .input(createInvoiceInputSchema)
    .mutation(({ input }) => createInvoice(input)),
  
  getInvoices: publicProcedure
    .input(invoiceFilterSchema.optional())
    .query(({ input }) => getInvoices(input)),
  
  getInvoiceById: publicProcedure
    .input(z.number())
    .query(({ input }) => getInvoiceById(input)),
  
  updateInvoiceStatus: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      status: z.enum(['pending', 'paid', 'overdue', 'cancelled']) 
    }))
    .mutation(({ input }) => updateInvoiceStatus(input.id, input.status)),
  
  deleteInvoice: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteInvoice(input)),
  
  generateMonthlyInvoices: publicProcedure
    .mutation(() => generateMonthlyInvoices()),
  
  getOverdueInvoices: publicProcedure
    .query(() => getOverdueInvoices()),

  // Payment management routes
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),
  
  createBatchPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createBatchPayment(input)),
  
  getPayments: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getPayments(input)),
  
  getPaymentById: publicProcedure
    .input(z.number())
    .query(({ input }) => getPaymentById(input)),

  // Expense management routes
  createExpense: publicProcedure
    .input(createExpenseInputSchema)
    .mutation(({ input }) => createExpense(input)),
  
  getExpenses: publicProcedure
    .input(z.object({
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional()
    }).optional())
    .query(({ input }) => getExpenses(input?.dateFrom, input?.dateTo)),
  
  getExpenseById: publicProcedure
    .input(z.number())
    .query(({ input }) => getExpenseById(input)),
  
  updateExpense: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      updates: createExpenseInputSchema.partial() 
    }))
    .mutation(({ input }) => updateExpense(input.id, input.updates)),
  
  deleteExpense: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteExpense(input)),
  
  getTotalExpenses: publicProcedure
    .input(z.object({
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional()
    }).optional())
    .query(({ input }) => getTotalExpenses(input?.dateFrom, input?.dateTo)),

  // Income management routes
  createIncome: publicProcedure
    .input(createIncomeInputSchema)
    .mutation(({ input }) => createIncome(input)),
  
  getIncomes: publicProcedure
    .input(z.object({
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional()
    }).optional())
    .query(({ input }) => getIncomes(input?.dateFrom, input?.dateTo)),
  
  getIncomeById: publicProcedure
    .input(z.number())
    .query(({ input }) => getIncomeById(input)),
  
  updateIncome: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      updates: createIncomeInputSchema.partial() 
    }))
    .mutation(({ input }) => updateIncome(input.id, input.updates)),
  
  deleteIncome: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteIncome(input)),
  
  getTotalOtherIncome: publicProcedure
    .input(z.object({
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional()
    }).optional())
    .query(({ input }) => getTotalOtherIncome(input?.dateFrom, input?.dateTo)),

  // Reports routes
  generateFinancialReport: publicProcedure
    .input(reportFilterSchema)
    .query(({ input }) => generateFinancialReport(input)),
  
  generateDebtorReport: publicProcedure
    .query(() => generateDebtorReport()),
  
  getMonthlyRevenues: publicProcedure
    .input(z.number())
    .query(({ input }) => getMonthlyRevenues(input)),
  
  getRevenueByPackage: publicProcedure
    .input(z.object({
      dateFrom: z.coerce.date(),
      dateTo: z.coerce.date()
    }))
    .query(({ input }) => getRevenueByPackage(input.dateFrom, input.dateTo)),

  // Settings routes
  getCompanySettings: publicProcedure
    .query(() => getCompanySettings()),
  
  updateCompanySettings: publicProcedure
    .input(z.object({
      company_name: z.string().optional(),
      logo_url: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      default_language: z.string().optional(),
      phone_country_code: z.string().optional(),
      currency_symbol: z.string().optional(),
      tax_rate: z.number().optional()
    }))
    .mutation(({ input }) => updateCompanySettings(input)),
  
  createBackup: publicProcedure
    .mutation(() => createBackup()),
  
  restoreFromBackup: publicProcedure
    .input(z.string())
    .mutation(({ input }) => restoreFromBackup(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
