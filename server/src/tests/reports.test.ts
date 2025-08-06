
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  packagesTable, 
  clientsTable, 
  invoicesTable, 
  incomesTable, 
  expensesTable, 
  paymentsTable 
} from '../db/schema';
import { type ReportFilter } from '../schema';
import { 
  generateFinancialReport, 
  generateDebtorReport, 
  getMonthlyRevenues, 
  getRevenueByPackage 
} from '../handlers/reports';

describe('Reports handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('generateFinancialReport', () => {
    it('should generate comprehensive financial report', async () => {
      // Create test package
      const packageResult = await db.insert(packagesTable)
        .values({
          name: 'Test Package',
          speed: '100Mbps',
          monthly_price: '99.99',
          billing_cycle: 'monthly',
          days_allowed: 30
        })
        .returning()
        .execute();

      // Create test client - date columns need strings
      const clientResult = await db.insert(clientsTable)
        .values({
          name: 'Test Client',
          phone: '1234567890',
          package_id: packageResult[0].id,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'paid'
        })
        .returning()
        .execute();

      // Create paid invoice (subscription revenue) - date column needs string
      await db.insert(invoicesTable)
        .values({
          client_id: clientResult[0].id,
          amount: '199.99',
          due_date: '2024-01-15',
          status: 'paid'
        })
        .execute();

      // Create other income - date column needs string
      await db.insert(incomesTable)
        .values({
          type: 'connecting_service',
          amount: '50.00',
          date: '2024-01-15'
        })
        .execute();

      // Create expense - date column needs string
      await db.insert(expensesTable)
        .values({
          type: 'electricity',
          amount: '75.50',
          date: '2024-01-15'
        })
        .execute();

      const filter: ReportFilter = {
        date_from: new Date('2024-01-01'),
        date_to: new Date('2024-01-31')
      };

      const report = await generateFinancialReport(filter);

      expect(report.subscription_revenues).toEqual(199.99);
      expect(report.other_income).toEqual(50.00);
      expect(report.total_revenues).toEqual(249.99);
      expect(report.total_expenses).toEqual(75.50);
      expect(report.net_profit).toEqual(174.49);
      expect(report.period_start).toEqual(filter.date_from);
      expect(report.period_end).toEqual(filter.date_to);
    });

    it('should return zeros for periods with no data', async () => {
      const filter: ReportFilter = {
        date_from: new Date('2024-06-01'),
        date_to: new Date('2024-06-30')
      };

      const report = await generateFinancialReport(filter);

      expect(report.subscription_revenues).toEqual(0);
      expect(report.other_income).toEqual(0);
      expect(report.total_revenues).toEqual(0);
      expect(report.total_expenses).toEqual(0);
      expect(report.net_profit).toEqual(0);
    });
  });

  describe('generateDebtorReport', () => {
    it('should generate debtor report with days delay calculation', async () => {
      // Create test package
      const packageResult = await db.insert(packagesTable)
        .values({
          name: 'Test Package',
          speed: '100Mbps',
          monthly_price: '99.99',
          billing_cycle: 'monthly',
          days_allowed: 30
        })
        .returning()
        .execute();

      // Create debtor client
      const clientResult = await db.insert(clientsTable)
        .values({
          name: 'Debtor Client',
          phone: '9876543210',
          package_id: packageResult[0].id,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'debted',
          balance_creditor: '150.00'
        })
        .returning()
        .execute();

      // Create overdue invoice (30 days ago)
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 30);
      const overdueDateStr = overdueDate.toISOString().split('T')[0];

      await db.insert(invoicesTable)
        .values({
          client_id: clientResult[0].id,
          amount: '100.00',
          due_date: overdueDateStr,
          status: 'overdue'
        })
        .execute();

      // Create last payment (20 days ago)
      const lastPaymentDate = new Date();
      lastPaymentDate.setDate(lastPaymentDate.getDate() - 20);

      await db.insert(paymentsTable)
        .values({
          client_id: clientResult[0].id,
          amount: '50.00',
          method: 'cash',
          created_at: lastPaymentDate
        })
        .execute();

      const debtorReport = await generateDebtorReport();

      expect(debtorReport).toHaveLength(1);
      expect(debtorReport[0].client_id).toEqual(clientResult[0].id);
      expect(debtorReport[0].client_name).toEqual('Debtor Client');
      expect(debtorReport[0].phone).toEqual('9876543210');
      expect(debtorReport[0].due_amount).toEqual(150.00);
      expect(debtorReport[0].days_delay).toBeGreaterThanOrEqual(29);
      expect(debtorReport[0].last_payment_date).toBeDefined();
    });

    it('should return empty array when no debtors exist', async () => {
      const debtorReport = await generateDebtorReport();
      expect(debtorReport).toEqual([]);
    });
  });

  describe('getMonthlyRevenues', () => {
    it('should return monthly revenue breakdown for given year', async () => {
      // Create test package
      const packageResult = await db.insert(packagesTable)
        .values({
          name: 'Test Package',
          speed: '100Mbps',
          monthly_price: '99.99',
          billing_cycle: 'monthly',
          days_allowed: 30
        })
        .returning()
        .execute();

      // Create test client
      const clientResult = await db.insert(clientsTable)
        .values({
          name: 'Test Client',
          phone: '1234567890',
          package_id: packageResult[0].id,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'paid'
        })
        .returning()
        .execute();

      // Create paid invoices for different months
      await db.insert(invoicesTable)
        .values([
          {
            client_id: clientResult[0].id,
            amount: '100.00',
            due_date: '2024-01-15',
            status: 'paid'
          },
          {
            client_id: clientResult[0].id,
            amount: '150.00',
            due_date: '2024-03-15',
            status: 'paid'
          }
        ])
        .execute();

      const monthlyRevenues = await getMonthlyRevenues(2024);

      expect(monthlyRevenues).toHaveLength(12);
      expect(monthlyRevenues[0]).toEqual({ month: 1, revenue: 100.00 });
      expect(monthlyRevenues[1]).toEqual({ month: 2, revenue: 0 });
      expect(monthlyRevenues[2]).toEqual({ month: 3, revenue: 150.00 });
      
      // Check that all other months have 0 revenue
      for (let i = 3; i < 12; i++) {
        expect(monthlyRevenues[i].revenue).toEqual(0);
      }
    });

    it('should return all zeros for year with no data', async () => {
      const monthlyRevenues = await getMonthlyRevenues(2025);

      expect(monthlyRevenues).toHaveLength(12);
      monthlyRevenues.forEach((month, index) => {
        expect(month.month).toEqual(index + 1);
        expect(month.revenue).toEqual(0);
      });
    });
  });

  describe('getRevenueByPackage', () => {
    it('should return revenue breakdown by package', async () => {
      // Create test packages
      const package1Result = await db.insert(packagesTable)
        .values({
          name: 'Basic Package',
          speed: '50Mbps',
          monthly_price: '49.99',
          billing_cycle: 'monthly',
          days_allowed: 30
        })
        .returning()
        .execute();

      const package2Result = await db.insert(packagesTable)
        .values({
          name: 'Premium Package',
          speed: '100Mbps',
          monthly_price: '99.99',
          billing_cycle: 'monthly',
          days_allowed: 30
        })
        .returning()
        .execute();

      // Create test clients
      const client1Result = await db.insert(clientsTable)
        .values({
          name: 'Client 1',
          phone: '1234567890',
          package_id: package1Result[0].id,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'paid'
        })
        .returning()
        .execute();

      const client2Result = await db.insert(clientsTable)
        .values({
          name: 'Client 2',
          phone: '0987654321',
          package_id: package2Result[0].id,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'paid'
        })
        .returning()
        .execute();

      // Create paid invoices for both packages
      await db.insert(invoicesTable)
        .values([
          {
            client_id: client1Result[0].id,
            amount: '199.98', // 2 payments for basic
            due_date: '2024-01-15',
            status: 'paid'
          },
          {
            client_id: client2Result[0].id,
            amount: '299.97', // 3 payments for premium
            due_date: '2024-01-15',
            status: 'paid'
          }
        ])
        .execute();

      const revenueByPackage = await getRevenueByPackage(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(revenueByPackage).toHaveLength(2);
      
      // Should be ordered by revenue descending (premium first)
      expect(revenueByPackage[0].package_name).toEqual('Premium Package');
      expect(revenueByPackage[0].revenue).toEqual(299.97);
      expect(revenueByPackage[1].package_name).toEqual('Basic Package');
      expect(revenueByPackage[1].revenue).toEqual(199.98);
    });

    it('should return empty array for period with no data', async () => {
      const revenueByPackage = await getRevenueByPackage(
        new Date('2024-06-01'),
        new Date('2024-06-30')
      );

      expect(revenueByPackage).toEqual([]);
    });
  });
});
