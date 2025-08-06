
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable, packagesTable, paymentsTable, incomesTable } from '../db/schema';
import { getDashboardStats } from '../handlers/dashboard';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const result = await getDashboardStats();

    expect(result.total_clients).toBe(0);
    expect(result.current_month_revenues).toBe(0);
    expect(result.number_of_debtors).toBe(0);
    expect(result.total_debts).toBe(0);
    expect(result.total_active_clients).toBe(0);
  });

  it('should calculate client statistics correctly', async () => {
    // Create a test package first
    const packageResult = await db.insert(packagesTable)
      .values({
        name: 'Test Package',
        speed: '100 Mbps',
        monthly_price: '50.00',
        billing_cycle: 'monthly',
        days_allowed: 30
      })
      .returning()
      .execute();
    const packageId = packageResult[0].id;

    // Create test clients
    await db.insert(clientsTable)
      .values([
        {
          name: 'Active Client 1',
          phone: '1234567890',
          package_id: packageId,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'paid',
          balance_creditor: '0.00'
        },
        {
          name: 'Active Client 2',
          phone: '1234567891',
          package_id: packageId,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'debted',
          balance_creditor: '100.50'
        },
        {
          name: 'Inactive Client',
          phone: '1234567892',
          package_id: packageId,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'inactive',
          payment_status: 'debted',
          balance_creditor: '75.25'
        }
      ])
      .execute();

    const result = await getDashboardStats();

    expect(result.total_clients).toBe(3);
    expect(result.total_active_clients).toBe(2);
    expect(result.number_of_debtors).toBe(2);
    expect(result.total_debts).toBe(175.75); // 100.50 + 75.25
  });

  it('should calculate current month revenues correctly', async () => {
    // Create a test package and client first
    const packageResult = await db.insert(packagesTable)
      .values({
        name: 'Test Package',
        speed: '100 Mbps',
        monthly_price: '50.00',
        billing_cycle: 'monthly',
        days_allowed: 30
      })
      .returning()
      .execute();
    const packageId = packageResult[0].id;

    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        phone: '1234567890',
        package_id: packageId,
        start_date: '2024-01-01',
        subscription_end_date: '2024-12-31',
        service_status: 'active',
        payment_status: 'paid',
        balance_creditor: '0.00'
      })
      .returning()
      .execute();
    const clientId = clientResult[0].id;

    // Get current month dates
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 15);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    // Create payments - current month and previous month
    await db.insert(paymentsTable)
      .values([
        {
          client_id: clientId,
          amount: '100.00',
          method: 'cash',
          created_at: currentMonthDate
        },
        {
          client_id: clientId,
          amount: '50.00',
          method: 'cash',
          created_at: lastMonthDate
        }
      ])
      .execute();

    // Create other income - current month and previous month
    // Convert dates to string format for date columns
    const currentMonthDateStr = currentMonthDate.toISOString().split('T')[0];
    const lastMonthDateStr = lastMonthDate.toISOString().split('T')[0];

    await db.insert(incomesTable)
      .values([
        {
          type: 'connecting_service',
          amount: '75.00',
          date: currentMonthDateStr
        },
        {
          type: 'sale_equipment',
          amount: '25.00',
          date: lastMonthDateStr
        }
      ])
      .execute();

    const result = await getDashboardStats();

    // Only current month revenues should be counted: 100.00 (payment) + 75.00 (income)
    expect(result.current_month_revenues).toBe(175.00);
  });

  it('should handle mixed scenarios correctly', async () => {
    // Create test package
    const packageResult = await db.insert(packagesTable)
      .values({
        name: 'Test Package',
        speed: '100 Mbps',
        monthly_price: '50.00',
        billing_cycle: 'monthly',
        days_allowed: 30
      })
      .returning()
      .execute();
    const packageId = packageResult[0].id;

    // Create mixed client statuses
    const clientResults = await db.insert(clientsTable)
      .values([
        {
          name: 'Active Paid Client',
          phone: '1111111111',
          package_id: packageId,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'paid',
          balance_creditor: '0.00'
        },
        {
          name: 'Active Debted Client',
          phone: '2222222222',
          package_id: packageId,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'debted',
          balance_creditor: '150.00'
        },
        {
          name: 'Inactive Client',
          phone: '3333333333',
          package_id: packageId,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'inactive',
          payment_status: 'paid',
          balance_creditor: '0.00'
        }
      ])
      .returning()
      .execute();

    // Add current month payment and income
    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    await db.insert(paymentsTable)
      .values({
        client_id: clientResults[0].id,
        amount: '200.00',
        method: 'cash',
        created_at: currentDate
      })
      .execute();

    await db.insert(incomesTable)
      .values({
        type: 'other',
        amount: '50.00',
        date: currentDateStr
      })
      .execute();

    const result = await getDashboardStats();

    expect(result.total_clients).toBe(3);
    expect(result.total_active_clients).toBe(2);
    expect(result.number_of_debtors).toBe(1);
    expect(result.total_debts).toBe(150.00);
    expect(result.current_month_revenues).toBe(250.00); // 200 + 50
  });
});
