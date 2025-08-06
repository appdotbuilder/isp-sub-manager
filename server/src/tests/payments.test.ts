
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, clientsTable, packagesTable, invoicesTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment, getPayments, getPaymentById, createBatchPayment } from '../handlers/payments';
import { eq } from 'drizzle-orm';

describe('Payment Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test data
  const createTestData = async () => {
    // Create package
    const packageResult = await db.insert(packagesTable)
      .values({
        name: 'Basic Plan',
        speed: '50Mbps',
        monthly_price: '100.00',
        billing_cycle: 'monthly',
        days_allowed: 30
      })
      .returning()
      .execute();

    // Create client
    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        phone: '+1234567890',
        package_id: packageResult[0].id,
        start_date: '2024-01-01',
        subscription_end_date: '2024-12-31',
        service_status: 'active',
        payment_status: 'debted'
      })
      .returning()
      .execute();

    // Create invoices
    const invoice1Result = await db.insert(invoicesTable)
      .values({
        client_id: clientResult[0].id,
        amount: '100.00',
        due_date: '2024-01-15',
        status: 'pending'
      })
      .returning()
      .execute();

    const invoice2Result = await db.insert(invoicesTable)
      .values({
        client_id: clientResult[0].id,
        amount: '150.00',
        due_date: '2024-02-15',
        status: 'pending'
      })
      .returning()
      .execute();

    return {
      package: packageResult[0],
      client: clientResult[0],
      invoice1: invoice1Result[0],
      invoice2: invoice2Result[0]
    };
  };

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const { client, invoice1 } = await createTestData();

      const input: CreatePaymentInput = {
        client_id: client.id,
        invoice_id: invoice1.id,
        amount: 100.00,
        method: 'cash',
        notes: 'Test payment'
      };

      const result = await createPayment(input);

      expect(result.id).toBeDefined();
      expect(result.client_id).toEqual(client.id);
      expect(result.invoice_id).toEqual(invoice1.id);
      expect(result.amount).toEqual(100.00);
      expect(result.method).toEqual('cash');
      expect(result.notes).toEqual('Test payment');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should update invoice status to paid when fully paid', async () => {
      const { client, invoice1 } = await createTestData();

      const input: CreatePaymentInput = {
        client_id: client.id,
        invoice_id: invoice1.id,
        amount: 100.00,
        method: 'cash'
      };

      await createPayment(input);

      // Check invoice status
      const updatedInvoice = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, invoice1.id))
        .execute();

      expect(updatedInvoice[0].status).toEqual('paid');
    });

    it('should update client payment status when all invoices are paid', async () => {
      const { client, invoice1, invoice2 } = await createTestData();

      // Pay the first invoice
      const input1: CreatePaymentInput = {
        client_id: client.id,
        invoice_id: invoice1.id,
        amount: 100.00,
        method: 'cash'
      };

      await createPayment(input1);

      // Check client still has debted status (second invoice unpaid)
      let updatedClient = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, client.id))
        .execute();

      expect(updatedClient[0].payment_status).toEqual('debted');

      // Pay the second invoice
      const input2: CreatePaymentInput = {
        client_id: client.id,
        invoice_id: invoice2.id,
        amount: 150.00,
        method: 'cash'
      };

      await createPayment(input2);

      // Now client should be paid
      updatedClient = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, client.id))
        .execute();

      expect(updatedClient[0].payment_status).toEqual('paid');
    });

    it('should throw error for non-existent client', async () => {
      const input: CreatePaymentInput = {
        client_id: 99999,
        amount: 100.00,
        method: 'cash'
      };

      expect(createPayment(input)).rejects.toThrow(/client not found/i);
    });

    it('should throw error for invalid invoice', async () => {
      const { client } = await createTestData();

      const input: CreatePaymentInput = {
        client_id: client.id,
        invoice_id: 99999,
        amount: 100.00,
        method: 'cash'
      };

      expect(createPayment(input)).rejects.toThrow(/invoice not found/i);
    });

    it('should create payment without invoice_id', async () => {
      const { client } = await createTestData();

      const input: CreatePaymentInput = {
        client_id: client.id,
        amount: 50.00,
        method: 'bank_transfer',
        notes: 'General payment'
      };

      const result = await createPayment(input);

      expect(result.client_id).toEqual(client.id);
      expect(result.invoice_id).toBeNull();
      expect(result.amount).toEqual(50.00);
      expect(result.method).toEqual('bank_transfer');
    });
  });

  describe('getPayments', () => {
    it('should return all payments when no client filter', async () => {
      const { client } = await createTestData();

      // Create a couple of payments
      await createPayment({
        client_id: client.id,
        amount: 100.00,
        method: 'cash'
      });

      await createPayment({
        client_id: client.id,
        amount: 50.00,
        method: 'bank_transfer'
      });

      const payments = await getPayments();

      expect(payments).toHaveLength(2);
      expect(typeof payments[0].amount).toBe('number');
      expect(typeof payments[1].amount).toBe('number');
    });

    it('should filter payments by client_id', async () => {
      const testData1 = await createTestData();
      
      // Create second client
      const client2Result = await db.insert(clientsTable)
        .values({
          name: 'Second Client',
          phone: '+1234567891',
          package_id: testData1.package.id,
          start_date: '2024-01-01',
          subscription_end_date: '2024-12-31',
          service_status: 'active',
          payment_status: 'paid'
        })
        .returning()
        .execute();

      // Create payments for both clients
      await createPayment({
        client_id: testData1.client.id,
        amount: 100.00,
        method: 'cash'
      });

      await createPayment({
        client_id: client2Result[0].id,
        amount: 200.00,
        method: 'bank_transfer'
      });

      // Filter by first client
      const client1Payments = await getPayments(testData1.client.id);
      expect(client1Payments).toHaveLength(1);
      expect(client1Payments[0].client_id).toEqual(testData1.client.id);
      expect(client1Payments[0].amount).toEqual(100.00);

      // Filter by second client
      const client2Payments = await getPayments(client2Result[0].id);
      expect(client2Payments).toHaveLength(1);
      expect(client2Payments[0].client_id).toEqual(client2Result[0].id);
      expect(client2Payments[0].amount).toEqual(200.00);
    });

    it('should return empty array when no payments found', async () => {
      const payments = await getPayments();
      expect(payments).toHaveLength(0);
    });
  });

  describe('getPaymentById', () => {
    it('should return payment by ID', async () => {
      const { client } = await createTestData();

      const createdPayment = await createPayment({
        client_id: client.id,
        amount: 75.00,
        method: 'credit_card',
        notes: 'Card payment'
      });

      const foundPayment = await getPaymentById(createdPayment.id);

      expect(foundPayment).not.toBeNull();
      expect(foundPayment!.id).toEqual(createdPayment.id);
      expect(foundPayment!.amount).toEqual(75.00);
      expect(foundPayment!.method).toEqual('credit_card');
      expect(foundPayment!.notes).toEqual('Card payment');
    });

    it('should return null for non-existent payment', async () => {
      const result = await getPaymentById(99999);
      expect(result).toBeNull();
    });
  });

  describe('createBatchPayment', () => {
    it('should create batch payment and pay multiple invoices', async () => {
      const { client, invoice1, invoice2 } = await createTestData();

      // Batch payment that covers both invoices
      const input: CreatePaymentInput = {
        client_id: client.id,
        amount: 250.00,
        method: 'bank_transfer',
        notes: 'Batch payment for multiple invoices'
      };

      const result = await createBatchPayment(input);

      expect(result.client_id).toEqual(client.id);
      expect(result.invoice_id).toBeNull();
      expect(result.amount).toEqual(250.00);
      expect(result.notes).toMatch(/batch payment/i);

      // Both invoices should be paid
      const updatedInvoice1 = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, invoice1.id))
        .execute();

      const updatedInvoice2 = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, invoice2.id))
        .execute();

      expect(updatedInvoice1[0].status).toEqual('paid');
      expect(updatedInvoice2[0].status).toEqual('paid');

      // Client payment status should be updated
      const updatedClient = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, client.id))
        .execute();

      expect(updatedClient[0].payment_status).toEqual('paid');
    });

    it('should partially pay invoices when amount is insufficient', async () => {
      const { client, invoice1, invoice2 } = await createTestData();

      // Batch payment that only covers first invoice
      const input: CreatePaymentInput = {
        client_id: client.id,
        amount: 100.00,
        method: 'cash'
      };

      const result = await createBatchPayment(input);

      expect(result.amount).toEqual(100.00);

      // First invoice should be paid
      const updatedInvoice1 = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, invoice1.id))
        .execute();

      expect(updatedInvoice1[0].status).toEqual('paid');

      // Second invoice should remain pending
      const updatedInvoice2 = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, invoice2.id))
        .execute();

      expect(updatedInvoice2[0].status).toEqual('pending');

      // Client should still be debted
      const updatedClient = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, client.id))
        .execute();

      expect(updatedClient[0].payment_status).toEqual('debted');
    });

    it('should throw error when no unpaid invoices exist', async () => {
      const { client } = await createTestData();

      // Pay all invoices first
      await db.update(invoicesTable)
        .set({ status: 'paid' })
        .where(eq(invoicesTable.client_id, client.id))
        .execute();

      const input: CreatePaymentInput = {
        client_id: client.id,
        amount: 100.00,
        method: 'cash'
      };

      expect(createBatchPayment(input)).rejects.toThrow(/no unpaid invoices/i);
    });

    it('should throw error for non-existent client', async () => {
      const input: CreatePaymentInput = {
        client_id: 99999,
        amount: 100.00,
        method: 'cash'
      };

      expect(createBatchPayment(input)).rejects.toThrow(/client not found/i);
    });
  });
});
