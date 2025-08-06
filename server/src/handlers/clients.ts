
import { db } from '../db';
import { clientsTable, packagesTable, invoicesTable, paymentsTable } from '../db/schema';
import { type CreateClientInput, type Client, type ClientFilter } from '../schema';
import { eq, and, or, ilike, sum, SQL } from 'drizzle-orm';

export async function createClient(input: CreateClientInput): Promise<Client> {
  try {
    // Verify package exists
    const packageData = await db.select()
      .from(packagesTable)
      .where(eq(packagesTable.id, input.package_id))
      .execute();

    if (packageData.length === 0) {
      throw new Error('Package not found');
    }

    const pkg = packageData[0];
    const startDate = input.start_date || new Date();
    const subscriptionEndDate = calculateSubscriptionEndDate(startDate, pkg.billing_cycle);

    // Insert client record with proper date formatting
    const result = await db.insert(clientsTable)
      .values({
        name: input.name,
        phone: input.phone,
        address: input.address || null,
        package_id: input.package_id,
        start_date: formatDateForDB(startDate),
        subscription_end_date: formatDateForDB(subscriptionEndDate),
        service_status: input.service_status,
        payment_status: input.payment_status,
        indebtedness_prefix: input.indebtedness_prefix || null,
        balance_creditor: input.balance_creditor.toString(),
        notes: input.notes || null
      })
      .returning()
      .execute();

    const client = result[0];

    // Create initial invoice if payment status is 'debted'
    if (input.payment_status === 'debted') {
      await db.insert(invoicesTable)
        .values({
          client_id: client.id,
          amount: pkg.monthly_price,
          details: `Initial invoice for ${pkg.name}`,
          due_date: formatDateForDB(subscriptionEndDate),
          status: 'pending',
          is_manual: false
        })
        .execute();
    }

    return convertClientFromDB(client);
  } catch (error) {
    console.error('Client creation failed:', error);
    throw error;
  }
}

export async function getClients(filter?: ClientFilter): Promise<Client[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (filter?.search) {
      conditions.push(
        or(
          ilike(clientsTable.name, `%${filter.search}%`),
          ilike(clientsTable.phone, `%${filter.search}%`)
        )!
      );
    }

    if (filter?.status) {
      conditions.push(eq(clientsTable.service_status, filter.status));
    }

    if (filter?.payment_status) {
      conditions.push(eq(clientsTable.payment_status, filter.payment_status));
    }

    if (filter?.package_id) {
      conditions.push(eq(clientsTable.package_id, filter.package_id));
    }

    // Build the final query based on whether we have conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(clientsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(clientsTable)
          .execute();

    return results.map(convertClientFromDB);
  } catch (error) {
    console.error('Get clients failed:', error);
    throw error;
  }
}

export async function getClientById(id: number): Promise<Client | null> {
  try {
    const results = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return convertClientFromDB(results[0]);
  } catch (error) {
    console.error('Get client by ID failed:', error);
    throw error;
  }
}

export async function updateClient(id: number, updates: Partial<CreateClientInput>): Promise<Client | null> {
  try {
    // Check if client exists
    const existingClient = await getClientById(id);
    if (!existingClient) {
      return null;
    }

    let subscriptionEndDate = existingClient.subscription_end_date;

    // If package is being changed, verify new package exists and recalculate dates
    if (updates.package_id && updates.package_id !== existingClient.package_id) {
      const packageData = await db.select()
        .from(packagesTable)
        .where(eq(packagesTable.id, updates.package_id))
        .execute();

      if (packageData.length === 0) {
        throw new Error('Package not found');
      }

      const pkg = packageData[0];
      const startDate = updates.start_date || existingClient.start_date;
      subscriptionEndDate = calculateSubscriptionEndDate(startDate, pkg.billing_cycle);
    }

    // Prepare update values
    const updateValues: any = {};
    
    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.phone !== undefined) updateValues.phone = updates.phone;
    if (updates.address !== undefined) updateValues.address = updates.address;
    if (updates.package_id !== undefined) updateValues.package_id = updates.package_id;
    if (updates.start_date !== undefined) updateValues.start_date = formatDateForDB(updates.start_date);
    if (updates.service_status !== undefined) updateValues.service_status = updates.service_status;
    if (updates.payment_status !== undefined) updateValues.payment_status = updates.payment_status;
    if (updates.indebtedness_prefix !== undefined) updateValues.indebtedness_prefix = updates.indebtedness_prefix;
    if (updates.balance_creditor !== undefined) updateValues.balance_creditor = updates.balance_creditor.toString();
    if (updates.notes !== undefined) updateValues.notes = updates.notes;

    // Always update subscription end date and updated_at
    updateValues.subscription_end_date = formatDateForDB(subscriptionEndDate);
    updateValues.updated_at = new Date();

    const result = await db.update(clientsTable)
      .set(updateValues)
      .where(eq(clientsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    return convertClientFromDB(result[0]);
  } catch (error) {
    console.error('Update client failed:', error);
    throw error;
  }
}

export async function deleteClient(id: number): Promise<boolean> {
  try {
    // Check if client has any payments
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.client_id, id))
      .execute();

    if (payments.length > 0) {
      throw new Error('Cannot delete client with existing payments');
    }

    // Delete related invoices first
    await db.delete(invoicesTable)
      .where(eq(invoicesTable.client_id, id))
      .execute();

    // Delete client
    const result = await db.delete(clientsTable)
      .where(eq(clientsTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Delete client failed:', error);
    throw error;
  }
}

export async function getClientDueAmount(clientId: number): Promise<number> {
  try {
    // Get client to check balance creditor
    const client = await getClientById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Sum unpaid invoices
    const unpaidInvoicesResult = await db.select({
      total: sum(invoicesTable.amount)
    })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.client_id, clientId),
        eq(invoicesTable.status, 'pending')
      ))
      .execute();

    const unpaidAmount = unpaidInvoicesResult[0]?.total ? parseFloat(unpaidInvoicesResult[0].total) : 0;
    const dueAmount = unpaidAmount - client.balance_creditor;

    return Math.max(0, dueAmount); // Don't return negative amounts
  } catch (error) {
    console.error('Get client due amount failed:', error);
    throw error;
  }
}

// Helper function to calculate subscription end date based on billing cycle
function calculateSubscriptionEndDate(startDate: Date, billingCycle: string): Date {
  const endDate = new Date(startDate);
  
  switch (billingCycle) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'semi_annual':
      endDate.setMonth(endDate.getMonth() + 6);
      break;
    case 'annual':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1); // Default to monthly
  }
  
  return endDate;
}

// Helper function to format Date for database (converts to YYYY-MM-DD string)
function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to convert database client record to Client type
function convertClientFromDB(dbClient: any): Client {
  return {
    ...dbClient,
    start_date: new Date(dbClient.start_date),
    subscription_end_date: new Date(dbClient.subscription_end_date),
    balance_creditor: parseFloat(dbClient.balance_creditor)
  };
}
