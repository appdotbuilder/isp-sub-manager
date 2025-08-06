
import { db } from '../db';
import { paymentsTable, invoicesTable, clientsTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq, and, asc, desc } from 'drizzle-orm';

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  try {
    // Verify client exists
    const clientExists = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.id, input.client_id))
      .execute();

    if (clientExists.length === 0) {
      throw new Error('Client not found');
    }

    // If invoice_id is provided, verify it exists and belongs to the client
    if (input.invoice_id) {
      const invoiceExists = await db.select()
        .from(invoicesTable)
        .where(
          and(
            eq(invoicesTable.id, input.invoice_id),
            eq(invoicesTable.client_id, input.client_id)
          )
        )
        .execute();

      if (invoiceExists.length === 0) {
        throw new Error('Invoice not found or does not belong to the client');
      }
    }

    // Create payment
    const result = await db.insert(paymentsTable)
      .values({
        client_id: input.client_id,
        invoice_id: input.invoice_id || null,
        amount: input.amount.toString(),
        method: input.method,
        notes: input.notes || null
      })
      .returning()
      .execute();

    const payment = result[0];

    // If payment is linked to a specific invoice, update invoice status if fully paid
    if (input.invoice_id) {
      const invoice = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, input.invoice_id))
        .execute();

      if (invoice.length > 0) {
        const invoiceAmount = parseFloat(invoice[0].amount);
        const paymentAmount = parseFloat(payment.amount);

        // Check if invoice is fully paid
        if (paymentAmount >= invoiceAmount) {
          await db.update(invoicesTable)
            .set({ status: 'paid' })
            .where(eq(invoicesTable.id, input.invoice_id))
            .execute();
        }
      }
    }

    // Check if client has any pending invoices to update payment status
    const pendingInvoices = await db.select()
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.client_id, input.client_id),
          eq(invoicesTable.status, 'pending')
        )
      )
      .execute();

    // Update client payment status based on pending invoices
    const newPaymentStatus = pendingInvoices.length > 0 ? 'debted' : 'paid';
    await db.update(clientsTable)
      .set({ payment_status: newPaymentStatus })
      .where(eq(clientsTable.id, input.client_id))
      .execute();

    return {
      ...payment,
      amount: parseFloat(payment.amount)
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
}

export async function getPayments(clientId?: number): Promise<Payment[]> {
  try {
    // Build query with proper type inference
    const baseQuery = db.select()
      .from(paymentsTable);

    // Apply conditional filtering and ordering
    const results = clientId !== undefined
      ? await baseQuery
          .where(eq(paymentsTable.client_id, clientId))
          .orderBy(desc(paymentsTable.created_at))
          .execute()
      : await baseQuery
          .orderBy(desc(paymentsTable.created_at))
          .execute();

    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    throw error;
  }
}

export async function getPaymentById(id: number): Promise<Payment | null> {
  try {
    const results = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const payment = results[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount)
    };
  } catch (error) {
    console.error('Failed to fetch payment by ID:', error);
    throw error;
  }
}

export async function createBatchPayment(input: CreatePaymentInput): Promise<Payment> {
  try {
    // Verify client exists
    const clientExists = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.id, input.client_id))
      .execute();

    if (clientExists.length === 0) {
      throw new Error('Client not found');
    }

    // Get all unpaid invoices for the client, ordered by due date (oldest first)
    const unpaidInvoices = await db.select()
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.client_id, input.client_id),
          eq(invoicesTable.status, 'pending')
        )
      )
      .orderBy(asc(invoicesTable.due_date))
      .execute();

    if (unpaidInvoices.length === 0) {
      throw new Error('No unpaid invoices found for this client');
    }

    // Create the batch payment record
    const result = await db.insert(paymentsTable)
      .values({
        client_id: input.client_id,
        invoice_id: null, // Batch payment not linked to specific invoice
        amount: input.amount.toString(),
        method: input.method,
        notes: input.notes || 'Batch payment - distributed across multiple invoices'
      })
      .returning()
      .execute();

    const payment = result[0];
    let remainingAmount = parseFloat(payment.amount);

    // Distribute payment across unpaid invoices
    for (const invoice of unpaidInvoices) {
      if (remainingAmount <= 0) break;

      const invoiceAmount = parseFloat(invoice.amount);
      
      if (remainingAmount >= invoiceAmount) {
        // Fully pay this invoice
        await db.update(invoicesTable)
          .set({ status: 'paid' })
          .where(eq(invoicesTable.id, invoice.id))
          .execute();
        
        remainingAmount -= invoiceAmount;
      } else {
        // Partial payment - invoice remains pending
        break;
      }
    }

    // Update client payment status
    const stillPendingInvoices = await db.select()
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.client_id, input.client_id),
          eq(invoicesTable.status, 'pending')
        )
      )
      .execute();

    const newPaymentStatus = stillPendingInvoices.length > 0 ? 'debted' : 'paid';
    await db.update(clientsTable)
      .set({ payment_status: newPaymentStatus })
      .where(eq(clientsTable.id, input.client_id))
      .execute();

    return {
      ...payment,
      amount: parseFloat(payment.amount)
    };
  } catch (error) {
    console.error('Batch payment creation failed:', error);
    throw error;
  }
}
