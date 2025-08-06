
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable, clientsTable, packagesTable, paymentsTable } from '../db/schema';
import { type CreateInvoiceInput, type InvoiceFilter } from '../schema';
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById, 
  updateInvoiceStatus, 
  deleteInvoice,
  generateMonthlyInvoices,
  getOverdueInvoices
} from '../handlers/invoices';
import { eq } from 'drizzle-orm';

// Test data
const testPackage = {
  name: 'Basic Package',
  speed: '50 Mbps',
  monthly_price: '99.99',
  billing_cycle: 'monthly' as const,
  days_allowed: 5,
  description: 'Basic internet package'
};

const testClient = {
  name: 'Test Client',
  phone: '+966501234567',
  address: '123 Test Street',
  start_date: '2024-01-01',
  subscription_end_date: '2024-12-31',
  service_status: 'active' as const,
  payment_status: 'paid' as const,
  balance_creditor: '0'
};

const testInvoiceInput: CreateInvoiceInput = {
  client_id: 1,
  amount: 99.99,
  details: 'Monthly subscription',
  due_date: new Date('2024-02-01'),
  is_manual: false
};

describe('Invoice Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createInvoice', () => {
    it('should create an invoice and update client payment status', async () => {
      // Create prerequisite data
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      const invoiceInput = {
        ...testInvoiceInput,
        client_id: clientResult[0].id
      };

      const result = await createInvoice(invoiceInput);

      // Verify invoice creation
      expect(result.client_id).toEqual(clientResult[0].id);
      expect(result.amount).toEqual(99.99);
      expect(typeof result.amount).toBe('number');
      expect(result.details).toEqual('Monthly subscription');
      expect(result.due_date).toEqual(new Date('2024-02-01'));
      expect(result.status).toEqual('pending');
      expect(result.is_manual).toEqual(false);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);

      // Verify client payment status was updated to 'debted'
      const updatedClient = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, clientResult[0].id))
        .execute();

      expect(updatedClient[0].payment_status).toEqual('debted');
    });

    it('should throw error for non-existent client', async () => {
      const invalidInput = {
        ...testInvoiceInput,
        client_id: 999
      };

      await expect(createInvoice(invalidInput)).rejects.toThrow(/client not found/i);
    });
  });

  describe('getInvoices', () => {
    it('should retrieve all invoices without filter', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      await createInvoice({
        ...testInvoiceInput,
        client_id: clientResult[0].id
      });

      const result = await getInvoices();

      expect(result).toHaveLength(1);
      expect(result[0].amount).toEqual(99.99);
      expect(typeof result[0].amount).toBe('number');
      expect(result[0].status).toEqual('pending');
    });

    it('should filter invoices by client_id', async () => {
      // Create test data with two clients
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      const client1Result = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id,
          name: 'Client 1'
        })
        .returning()
        .execute();

      const client2Result = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id,
          name: 'Client 2'
        })
        .returning()
        .execute();

      await createInvoice({
        ...testInvoiceInput,
        client_id: client1Result[0].id
      });

      await createInvoice({
        ...testInvoiceInput,
        client_id: client2Result[0].id
      });

      const filter: InvoiceFilter = { client_id: client1Result[0].id };
      const result = await getInvoices(filter);

      expect(result).toHaveLength(1);
      expect(result[0].client_id).toEqual(client1Result[0].id);
    });

    it('should filter invoices by status', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      const invoice = await createInvoice({
        ...testInvoiceInput,
        client_id: clientResult[0].id
      });

      await updateInvoiceStatus(invoice.id, 'paid');

      const filter: InvoiceFilter = { status: 'paid' };
      const result = await getInvoices(filter);

      expect(result).toHaveLength(1);
      expect(result[0].status).toEqual('paid');
    });

    it('should filter invoices by date range', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      await createInvoice({
        ...testInvoiceInput,
        client_id: clientResult[0].id,
        due_date: new Date('2024-02-15')
      });

      const filter: InvoiceFilter = {
        date_from: new Date('2024-02-01'),
        date_to: new Date('2024-02-28')
      };
      const result = await getInvoices(filter);

      expect(result).toHaveLength(1);
      expect(result[0].due_date).toEqual(new Date('2024-02-15'));
    });
  });

  describe('getInvoiceById', () => {
    it('should retrieve invoice by id', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      const invoice = await createInvoice({
        ...testInvoiceInput,
        client_id: clientResult[0].id
      });

      const result = await getInvoiceById(invoice.id);

      expect(result).toBeDefined();
      expect(result?.id).toEqual(invoice.id);
      expect(result?.amount).toEqual(99.99);
      expect(typeof result?.amount).toBe('number');
    });

    it('should return null for non-existent invoice', async () => {
      const result = await getInvoiceById(999);
      expect(result).toBeNull();
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should update invoice status and client payment status when paid', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      const invoice = await createInvoice({
        ...testInvoiceInput,
        client_id: clientResult[0].id
      });

      const result = await updateInvoiceStatus(invoice.id, 'paid');

      expect(result).toBeDefined();
      expect(result?.status).toEqual('paid');

      // Verify client payment status was updated to 'paid'
      const updatedClient = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, clientResult[0].id))
        .execute();

      expect(updatedClient[0].payment_status).toEqual('paid');
    });

    it('should return null for non-existent invoice', async () => {
      const result = await updateInvoiceStatus(999, 'paid');
      expect(result).toBeNull();
    });
  });

  describe('deleteInvoice', () => {
    it('should delete invoice successfully', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      const invoice = await createInvoice({
        ...testInvoiceInput,
        client_id: clientResult[0].id
      });

      const result = await deleteInvoice(invoice.id);
      expect(result).toBe(true);

      // Verify invoice was deleted
      const deletedInvoice = await getInvoiceById(invoice.id);
      expect(deletedInvoice).toBeNull();
    });

    it('should throw error when trying to delete invoice with payments', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      const invoice = await createInvoice({
        ...testInvoiceInput,
        client_id: clientResult[0].id
      });

      // Create a payment for this invoice
      await db.insert(paymentsTable)
        .values({
          client_id: clientResult[0].id,
          invoice_id: invoice.id,
          amount: '50.00',
          method: 'cash'
        })
        .execute();

      await expect(deleteInvoice(invoice.id)).rejects.toThrow(/cannot delete invoice with associated payments/i);
    });
  });

  describe('generateMonthlyInvoices', () => {
    it('should generate invoices for active clients', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .execute();

      const result = await generateMonthlyInvoices();

      expect(result).toHaveLength(1);
      expect(result[0].amount).toEqual(99.99);
      expect(typeof result[0].amount).toBe('number');
      expect(result[0].is_manual).toBe(false);
      expect(result[0].details).toContain('Monthly subscription fee');
    });

    it('should handle balance creditor deduction', async () => {
      // Create test data with balance creditor
      const packageResult = await db.insert(packagesTable)
        .values(testPackage)
        .returning()
        .execute();

      await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id,
          balance_creditor: '50.00' // Client has 50 credit
        })
        .execute();

      const result = await generateMonthlyInvoices();

      expect(result).toHaveLength(1);
      expect(result[0].amount).toEqual(49.99); // 99.99 - 50.00
      expect(typeof result[0].amount).toBe('number');
    });
  });

  describe('getOverdueInvoices', () => {
    it('should identify overdue invoices based on due date and grace period', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values({
          ...testPackage,
          days_allowed: 5 // 5 days grace period
        })
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      // Create overdue invoice (due date + grace period is in the past)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      await createInvoice({
        ...testInvoiceInput,
        client_id: clientResult[0].id,
        due_date: pastDate
      });

      const result = await getOverdueInvoices();

      expect(result).toHaveLength(1);
      expect(result[0].status).toEqual('pending');
      expect(result[0].amount).toEqual(99.99);
      expect(typeof result[0].amount).toBe('number');
    });

    it('should not return invoices within grace period', async () => {
      // Create test data
      const packageResult = await db.insert(packagesTable)
        .values({
          ...testPackage,
          days_allowed: 10 // 10 days grace period
        })
        .returning()
        .execute();

      const clientResult = await db.insert(clientsTable)
        .values({
          ...testClient,
          package_id: packageResult[0].id
        })
        .returning()
        .execute();

      // Create invoice due 5 days ago (still within 10 day grace period)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);

      await createInvoice({
        ...testInvoiceInput,
        client_id: clientResult[0].id,
        due_date: recentDate
      });

      const result = await getOverdueInvoices();

      expect(result).toHaveLength(0);
    });
  });
});
