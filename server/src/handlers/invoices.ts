
import { db } from '../db';
import { invoicesTable, clientsTable, packagesTable, paymentsTable } from '../db/schema';
import { type CreateInvoiceInput, type Invoice, type InvoiceFilter } from '../schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  try {
    // Verify client exists
    const client = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.id, input.client_id))
      .execute();
    
    if (client.length === 0) {
      throw new Error('Client not found');
    }

    // Convert Date to string format for database insertion
    const dueDateString = input.due_date.toISOString().split('T')[0];

    // Insert invoice
    const result = await db.insert(invoicesTable)
      .values({
        client_id: input.client_id,
        amount: input.amount.toString(),
        details: input.details || null,
        due_date: dueDateString,
        is_manual: input.is_manual,
        status: 'pending'
      })
      .returning()
      .execute();

    const invoice = result[0];

    // Update client payment status to 'debted' since new invoice is pending
    await db.update(clientsTable)
      .set({ 
        payment_status: 'debted',
        updated_at: new Date()
      })
      .where(eq(clientsTable.id, input.client_id))
      .execute();

    return {
      ...invoice,
      amount: parseFloat(invoice.amount),
      due_date: new Date(invoice.due_date)
    };
  } catch (error) {
    console.error('Invoice creation failed:', error);
    throw error;
  }
}

export async function getInvoices(filter?: InvoiceFilter): Promise<Invoice[]> {
  try {
    // Start with base query - no conditional assignment
    const baseQuery = db.select({
      id: invoicesTable.id,
      client_id: invoicesTable.client_id,
      amount: invoicesTable.amount,
      details: invoicesTable.details,
      due_date: invoicesTable.due_date,
      status: invoicesTable.status,
      is_manual: invoicesTable.is_manual,
      created_at: invoicesTable.created_at,
      updated_at: invoicesTable.updated_at
    }).from(invoicesTable);

    const conditions: SQL<unknown>[] = [];

    if (filter?.client_id !== undefined) {
      conditions.push(eq(invoicesTable.client_id, filter.client_id));
    }

    if (filter?.status) {
      conditions.push(eq(invoicesTable.status, filter.status));
    }

    if (filter?.date_from) {
      const dateFromString = filter.date_from.toISOString().split('T')[0];
      conditions.push(gte(invoicesTable.due_date, dateFromString));
    }

    if (filter?.date_to) {
      const dateToString = filter.date_to.toISOString().split('T')[0];
      conditions.push(lte(invoicesTable.due_date, dateToString));
    }

    // Build final query
    const finalQuery = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await finalQuery
      .orderBy(desc(invoicesTable.created_at))
      .execute();

    return results.map(invoice => ({
      ...invoice,
      amount: parseFloat(invoice.amount),
      due_date: new Date(invoice.due_date)
    }));
  } catch (error) {
    console.error('Invoice retrieval failed:', error);
    throw error;
  }
}

export async function getInvoiceById(id: number): Promise<Invoice | null> {
  try {
    const result = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const invoice = result[0];
    return {
      ...invoice,
      amount: parseFloat(invoice.amount),
      due_date: new Date(invoice.due_date)
    };
  } catch (error) {
    console.error('Invoice retrieval failed:', error);
    throw error;
  }
}

export async function updateInvoiceStatus(id: number, status: 'pending' | 'paid' | 'overdue' | 'cancelled'): Promise<Invoice | null> {
  try {
    // Get invoice to verify it exists and get client_id
    const existingInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .execute();

    if (existingInvoice.length === 0) {
      return null;
    }

    // Update invoice status
    const result = await db.update(invoicesTable)
      .set({
        status: status,
        updated_at: new Date()
      })
      .where(eq(invoicesTable.id, id))
      .returning()
      .execute();

    const updatedInvoice = result[0];
    const client_id = existingInvoice[0].client_id;

    // If invoice is marked as paid, check if client has any other pending invoices
    if (status === 'paid') {
      const pendingInvoices = await db.select()
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.client_id, client_id),
          eq(invoicesTable.status, 'pending')
        ))
        .execute();

      // If no pending invoices, update client payment status to 'paid'
      if (pendingInvoices.length === 0) {
        await db.update(clientsTable)
          .set({
            payment_status: 'paid',
            updated_at: new Date()
          })
          .where(eq(clientsTable.id, client_id))
          .execute();
      }
    }

    return {
      ...updatedInvoice,
      amount: parseFloat(updatedInvoice.amount),
      due_date: new Date(updatedInvoice.due_date)
    };
  } catch (error) {
    console.error('Invoice status update failed:', error);
    throw error;
  }
}

export async function deleteInvoice(id: number): Promise<boolean> {
  try {
    // Check if invoice has associated payments using proper count query
    const countResult = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(paymentsTable)
      .where(eq(paymentsTable.invoice_id, id))
      .execute();
    
    const paymentCount = countResult[0].count;
    
    if (paymentCount > 0) {
      throw new Error('Cannot delete invoice with associated payments');
    }

    // Delete the invoice
    const result = await db.delete(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Invoice deletion failed:', error);
    throw error;
  }
}

export async function generateMonthlyInvoices(): Promise<Invoice[]> {
  try {
    // Get all active clients with their packages
    const activeClients = await db.select({
      id: clientsTable.id,
      name: clientsTable.name,
      package_id: clientsTable.package_id,
      balance_creditor: clientsTable.balance_creditor,
      monthly_price: packagesTable.monthly_price
    })
    .from(clientsTable)
    .innerJoin(packagesTable, eq(clientsTable.package_id, packagesTable.id))
    .where(eq(clientsTable.service_status, 'active'))
    .execute();

    const createdInvoices: Invoice[] = [];
    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    const dueDateString = dueDate.toISOString().split('T')[0];

    for (const client of activeClients) {
      const monthlyPrice = parseFloat(client.monthly_price);
      const balanceCreditor = parseFloat(client.balance_creditor);
      
      // Calculate invoice amount after deducting balance creditor
      let invoiceAmount = monthlyPrice - balanceCreditor;
      
      // Only create invoice if amount is positive
      if (invoiceAmount > 0) {
        const result = await db.insert(invoicesTable)
          .values({
            client_id: client.id,
            amount: invoiceAmount.toString(),
            details: `Monthly subscription fee for ${client.name}`,
            due_date: dueDateString,
            is_manual: false,
            status: 'pending'
          })
          .returning()
          .execute();

        const invoice = result[0];
        createdInvoices.push({
          ...invoice,
          amount: parseFloat(invoice.amount),
          due_date: new Date(invoice.due_date)
        });

        // Reset balance creditor if it was used
        if (balanceCreditor > 0) {
          const newBalance = Math.max(0, balanceCreditor - monthlyPrice);
          await db.update(clientsTable)
            .set({
              balance_creditor: newBalance.toString(),
              payment_status: 'debted',
              updated_at: new Date()
            })
            .where(eq(clientsTable.id, client.id))
            .execute();
        } else {
          // Just update payment status to debted
          await db.update(clientsTable)
            .set({
              payment_status: 'debted',
              updated_at: new Date()
            })
            .where(eq(clientsTable.id, client.id))
            .execute();
        }
      } else {
        // Full amount covered by balance creditor, just deduct from balance
        await db.update(clientsTable)
          .set({
            balance_creditor: Math.abs(invoiceAmount).toString(), // Remaining credit
            updated_at: new Date()
          })
          .where(eq(clientsTable.id, client.id))
          .execute();
      }
    }

    return createdInvoices;
  } catch (error) {
    console.error('Monthly invoice generation failed:', error);
    throw error;
  }
}

export async function getOverdueInvoices(): Promise<Invoice[]> {
  try {
    // Get overdue invoices by comparing due_date with current date
    // and considering package days_allowed for grace period
    const results = await db.select({
      id: invoicesTable.id,
      client_id: invoicesTable.client_id,
      amount: invoicesTable.amount,
      details: invoicesTable.details,
      due_date: invoicesTable.due_date,
      status: invoicesTable.status,
      is_manual: invoicesTable.is_manual,
      created_at: invoicesTable.created_at,
      updated_at: invoicesTable.updated_at,
      days_allowed: packagesTable.days_allowed
    })
    .from(invoicesTable)
    .innerJoin(clientsTable, eq(invoicesTable.client_id, clientsTable.id))
    .innerJoin(packagesTable, eq(clientsTable.package_id, packagesTable.id))
    .where(eq(invoicesTable.status, 'pending'))
    .execute();

    const today = new Date();
    const overdueInvoices: Invoice[] = [];

    for (const result of results) {
      const dueDate = new Date(result.due_date);
      const gracePeriodEnd = new Date(dueDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + result.days_allowed);

      // Invoice is overdue if current date is past due date + grace period
      if (today > gracePeriodEnd) {
        overdueInvoices.push({
          id: result.id,
          client_id: result.client_id,
          amount: parseFloat(result.amount),
          details: result.details,
          due_date: new Date(result.due_date),
          status: result.status,
          is_manual: result.is_manual,
          created_at: result.created_at,
          updated_at: result.updated_at
        });
      }
    }

    return overdueInvoices;
  } catch (error) {
    console.error('Overdue invoices retrieval failed:', error);
    throw error;
  }
}
