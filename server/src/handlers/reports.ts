
import { db } from '../db';
import { 
  invoicesTable, 
  incomesTable, 
  expensesTable, 
  clientsTable, 
  packagesTable, 
  paymentsTable 
} from '../db/schema';
import { type FinancialReport, type DebtorReportItem, type ReportFilter } from '../schema';
import { eq, gte, lte, and, sum, sql, desc, isNull, count } from 'drizzle-orm';

export async function generateFinancialReport(filter: ReportFilter): Promise<FinancialReport> {
  try {
    // Convert dates to strings for comparison with date columns
    const dateFromStr = filter.date_from.toISOString().split('T')[0];
    const dateToStr = filter.date_to.toISOString().split('T')[0];

    // Get subscription revenues from paid invoices in the date range
    const subscriptionRevenueResult = await db
      .select({
        total: sum(invoicesTable.amount)
      })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.status, 'paid'),
          gte(invoicesTable.due_date, dateFromStr),
          lte(invoicesTable.due_date, dateToStr)
        )
      )
      .execute();

    const subscriptionRevenues = subscriptionRevenueResult[0]?.total 
      ? parseFloat(subscriptionRevenueResult[0].total) 
      : 0;

    // Get other income in the date range
    const otherIncomeResult = await db
      .select({
        total: sum(incomesTable.amount)
      })
      .from(incomesTable)
      .where(
        and(
          gte(incomesTable.date, dateFromStr),
          lte(incomesTable.date, dateToStr)
        )
      )
      .execute();

    const otherIncome = otherIncomeResult[0]?.total 
      ? parseFloat(otherIncomeResult[0].total) 
      : 0;

    // Get total expenses in the date range
    const expensesResult = await db
      .select({
        total: sum(expensesTable.amount)
      })
      .from(expensesTable)
      .where(
        and(
          gte(expensesTable.date, dateFromStr),
          lte(expensesTable.date, dateToStr)
        )
      )
      .execute();

    const totalExpenses = expensesResult[0]?.total 
      ? parseFloat(expensesResult[0].total) 
      : 0;

    const totalRevenues = subscriptionRevenues + otherIncome;
    const netProfit = totalRevenues - totalExpenses;

    return {
      subscription_revenues: subscriptionRevenues,
      other_income: otherIncome,
      total_revenues: totalRevenues,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      period_start: filter.date_from,
      period_end: filter.date_to
    };
  } catch (error) {
    console.error('Financial report generation failed:', error);
    throw error;
  }
}

export async function generateDebtorReport(): Promise<DebtorReportItem[]> {
  try {
    // Get all clients with debted payment status
    const debtorResults = await db
      .select({
        client_id: clientsTable.id,
        client_name: clientsTable.name,
        phone: clientsTable.phone,
        balance_creditor: clientsTable.balance_creditor
      })
      .from(clientsTable)
      .where(eq(clientsTable.payment_status, 'debted'))
      .execute();

    // For each debtor, calculate days delay and get last payment date
    const debtorReportItems: DebtorReportItem[] = [];

    for (const debtor of debtorResults) {
      // Get the oldest unpaid invoice for this client
      const oldestInvoiceResult = await db
        .select({
          due_date: invoicesTable.due_date,
          amount: invoicesTable.amount
        })
        .from(invoicesTable)
        .where(
          and(
            eq(invoicesTable.client_id, debtor.client_id),
            eq(invoicesTable.status, 'overdue')
          )
        )
        .orderBy(invoicesTable.due_date)
        .limit(1)
        .execute();

      // Get last payment date for this client
      const lastPaymentResult = await db
        .select({
          created_at: paymentsTable.created_at
        })
        .from(paymentsTable)
        .where(eq(paymentsTable.client_id, debtor.client_id))
        .orderBy(desc(paymentsTable.created_at))
        .limit(1)
        .execute();

      // Calculate days delay from oldest overdue invoice
      let daysDelay = 0;
      const dueAmount = parseFloat(debtor.balance_creditor);

      if (oldestInvoiceResult.length > 0) {
        const dueDateStr = oldestInvoiceResult[0].due_date;
        const dueDate = new Date(dueDateStr);
        const today = new Date();
        const timeDiff = today.getTime() - dueDate.getTime();
        daysDelay = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
      }

      const lastPaymentDate = lastPaymentResult.length > 0 
        ? lastPaymentResult[0].created_at 
        : null;

      debtorReportItems.push({
        client_id: debtor.client_id,
        client_name: debtor.client_name,
        phone: debtor.phone,
        due_amount: dueAmount,
        days_delay: daysDelay,
        last_payment_date: lastPaymentDate
      });
    }

    return debtorReportItems.sort((a, b) => b.days_delay - a.days_delay);
  } catch (error) {
    console.error('Debtor report generation failed:', error);
    throw error;
  }
}

export async function getMonthlyRevenues(year: number): Promise<{ month: number; revenue: number }[]> {
  try {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Get all paid invoices for the year, then process them in JavaScript
    const invoicesResult = await db
      .select({
        due_date: invoicesTable.due_date,
        amount: invoicesTable.amount
      })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.status, 'paid'),
          gte(invoicesTable.due_date, startDate),
          lte(invoicesTable.due_date, endDate)
        )
      )
      .execute();

    // Create array for all 12 months, initialized with 0
    const monthlyRevenues: { month: number; revenue: number }[] = [];
    for (let month = 1; month <= 12; month++) {
      monthlyRevenues.push({ month, revenue: 0 });
    }

    // Process invoices and aggregate by month
    invoicesResult.forEach(invoice => {
      const invoiceDate = new Date(invoice.due_date);
      const month = invoiceDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
      const revenue = parseFloat(invoice.amount);
      
      if (month >= 1 && month <= 12) {
        monthlyRevenues[month - 1].revenue += revenue;
      }
    });

    return monthlyRevenues;
  } catch (error) {
    console.error('Monthly revenues calculation failed:', error);
    throw error;
  }
}

export async function getRevenueByPackage(dateFrom: Date, dateTo: Date): Promise<{ package_name: string; revenue: number }[]> {
  try {
    const dateFromStr = dateFrom.toISOString().split('T')[0];
    const dateToStr = dateTo.toISOString().split('T')[0];

    // Get revenue by package from paid invoices with package details
    const revenueByPackageResult = await db
      .select({
        package_name: packagesTable.name,
        revenue: sum(invoicesTable.amount)
      })
      .from(invoicesTable)
      .innerJoin(clientsTable, eq(invoicesTable.client_id, clientsTable.id))
      .innerJoin(packagesTable, eq(clientsTable.package_id, packagesTable.id))
      .where(
        and(
          eq(invoicesTable.status, 'paid'),
          gte(invoicesTable.due_date, dateFromStr),
          lte(invoicesTable.due_date, dateToStr)
        )
      )
      .groupBy(packagesTable.id, packagesTable.name)
      .orderBy(desc(sql`${sum(invoicesTable.amount)}`))
      .execute();

    return revenueByPackageResult.map(result => ({
      package_name: result.package_name,
      revenue: result.revenue ? parseFloat(result.revenue) : 0
    }));
  } catch (error) {
    console.error('Revenue by package calculation failed:', error);
    throw error;
  }
}
