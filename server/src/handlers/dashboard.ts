
import { db } from '../db';
import { clientsTable, paymentsTable, incomesTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, and, gte, lt, sum, count, sql } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get current month date range
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get total clients count
    const totalClientsResult = await db.select({ count: count() })
      .from(clientsTable)
      .execute();
    const total_clients = totalClientsResult[0]?.count || 0;

    // Get total active clients count
    const activeClientsResult = await db.select({ count: count() })
      .from(clientsTable)
      .where(eq(clientsTable.service_status, 'active'))
      .execute();
    const total_active_clients = activeClientsResult[0]?.count || 0;

    // Get number of debtors
    const debtorsResult = await db.select({ count: count() })
      .from(clientsTable)
      .where(eq(clientsTable.payment_status, 'debted'))
      .execute();
    const number_of_debtors = debtorsResult[0]?.count || 0;

    // Get total debts amount (balance_creditor for debted clients)
    const totalDebtsResult = await db.select({ total: sum(clientsTable.balance_creditor) })
      .from(clientsTable)
      .where(eq(clientsTable.payment_status, 'debted'))
      .execute();
    const total_debts = parseFloat(totalDebtsResult[0]?.total || '0');

    // Get current month revenues from payments
    const paymentsRevenueResult = await db.select({ total: sum(paymentsTable.amount) })
      .from(paymentsTable)
      .where(
        and(
          gte(paymentsTable.created_at, currentMonthStart),
          lt(paymentsTable.created_at, nextMonthStart)
        )
      )
      .execute();
    const paymentsRevenue = parseFloat(paymentsRevenueResult[0]?.total || '0');

    // Get current month revenues from other income
    // Convert dates to string format for date column comparison
    const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];
    const nextMonthStartStr = nextMonthStart.toISOString().split('T')[0];
    
    const incomesRevenueResult = await db.select({ total: sum(incomesTable.amount) })
      .from(incomesTable)
      .where(
        and(
          gte(incomesTable.date, currentMonthStartStr),
          lt(incomesTable.date, nextMonthStartStr)
        )
      )
      .execute();
    const incomesRevenue = parseFloat(incomesRevenueResult[0]?.total || '0');

    const current_month_revenues = paymentsRevenue + incomesRevenue;

    return {
      total_clients,
      current_month_revenues,
      number_of_debtors,
      total_debts,
      total_active_clients
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
}
