
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable, packagesTable, invoicesTable, paymentsTable } from '../db/schema';
import { type CreateClientInput, type ClientFilter } from '../schema';
import { 
  createClient, 
  getClients, 
  getClientById, 
  updateClient, 
  deleteClient, 
  getClientDueAmount 
} from '../handlers/clients';
import { eq } from 'drizzle-orm';

describe('Client Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let packageId: number;

  beforeEach(async () => {
    // Create test package
    const packageResult = await db.insert(packagesTable)
      .values({
        name: 'Basic Plan',
        speed: '10 Mbps',
        monthly_price: '50.00',
        billing_cycle: 'monthly',
        status: 'active',
        days_allowed: 30,
        description: 'Basic internet package'
      })
      .returning()
      .execute();
    
    packageId = packageResult[0].id;
  });

  describe('createClient', () => {
    const testInput: CreateClientInput = {
      name: 'Ahmed Ali',
      phone: '+966501234567',
      address: '123 Main Street, Riyadh',
      package_id: 1, // Will be set dynamically
      start_date: new Date('2024-01-01'),
      service_status: 'active',
      payment_status: 'paid',
      indebtedness_prefix: null,
      balance_creditor: 0,
      notes: 'Test client'
    };

    it('should create a client with valid package', async () => {
      const input = { ...testInput, package_id: packageId };
      const result = await createClient(input);

      expect(result.name).toEqual('Ahmed Ali');
      expect(result.phone).toEqual('+966501234567');
      expect(result.address).toEqual('123 Main Street, Riyadh');
      expect(result.package_id).toEqual(packageId);
      expect(result.start_date).toEqual(new Date('2024-01-01'));
      expect(result.service_status).toEqual('active');
      expect(result.payment_status).toEqual('paid');
      expect(result.balance_creditor).toEqual(0);
      expect(typeof result.balance_creditor).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should calculate subscription end date based on billing cycle', async () => {
      const input = { ...testInput, package_id: packageId };
      const result = await createClient(input);

      const expectedEndDate = new Date('2024-02-01'); // One month from start
      expect(result.subscription_end_date).toEqual(expectedEndDate);
    });

    it('should create initial invoice when payment status is debted', async () => {
      const input = { ...testInput, package_id: packageId, payment_status: 'debted' as const };
      const result = await createClient(input);

      const invoices = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.client_id, result.id))
        .execute();

      expect(invoices).toHaveLength(1);
      expect(parseFloat(invoices[0].amount)).toEqual(50);
      expect(invoices[0].status).toEqual('pending');
    });

    it('should not create invoice when payment status is paid', async () => {
      const input = { ...testInput, package_id: packageId, payment_status: 'paid' as const };
      const result = await createClient(input);

      const invoices = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.client_id, result.id))
        .execute();

      expect(invoices).toHaveLength(0);
    });

    it('should throw error for non-existent package', async () => {
      const input = { ...testInput, package_id: 999 };
      
      await expect(createClient(input)).rejects.toThrow(/package not found/i);
    });

    it('should use current date as start date when not provided', async () => {
      const { start_date, ...inputWithoutDate } = testInput;
      const input = { ...inputWithoutDate, package_id: packageId };
      const beforeCreate = new Date();
      beforeCreate.setHours(0, 0, 0, 0); // Set to start of day for comparison
      
      const result = await createClient(input);
      
      const resultDate = new Date(result.start_date);
      resultDate.setHours(0, 0, 0, 0);
      
      expect(resultDate >= beforeCreate).toBe(true);
    });
  });

  describe('getClients', () => {
    let clientId1: number;
    let clientId2: number;

    beforeEach(async () => {
      const input1: CreateClientInput = {
        name: 'Ahmed Ali',
        phone: '+966501234567',
        address: '123 Main Street',
        package_id: packageId,
        service_status: 'active',
        payment_status: 'paid',
        balance_creditor: 0
      };

      const input2: CreateClientInput = {
        name: 'Sara Mohamed',
        phone: '+966507654321',
        address: '456 Second Street',
        package_id: packageId,
        service_status: 'inactive',
        payment_status: 'debted',
        balance_creditor: 25
      };

      const client1 = await createClient(input1);
      const client2 = await createClient(input2);
      clientId1 = client1.id;
      clientId2 = client2.id;
    });

    it('should return all clients without filter', async () => {
      const results = await getClients();

      expect(results).toHaveLength(2);
      expect(results.every(client => typeof client.balance_creditor === 'number')).toBe(true);
      expect(results.every(client => client.start_date instanceof Date)).toBe(true);
      expect(results.every(client => client.subscription_end_date instanceof Date)).toBe(true);
    });

    it('should filter clients by search term (name)', async () => {
      const filter: ClientFilter = { search: 'Ahmed' };
      const results = await getClients(filter);

      expect(results).toHaveLength(1);
      expect(results[0].name).toEqual('Ahmed Ali');
    });

    it('should filter clients by search term (phone)', async () => {
      const filter: ClientFilter = { search: '567' };
      const results = await getClients(filter);

      expect(results).toHaveLength(1);
      expect(results[0].phone).toContain('567');
    });

    it('should filter clients by service status', async () => {
      const filter: ClientFilter = { status: 'active' };
      const results = await getClients(filter);

      expect(results).toHaveLength(1);
      expect(results[0].service_status).toEqual('active');
    });

    it('should filter clients by payment status', async () => {
      const filter: ClientFilter = { payment_status: 'debted' };
      const results = await getClients(filter);

      expect(results).toHaveLength(1);
      expect(results[0].payment_status).toEqual('debted');
    });

    it('should filter clients by package ID', async () => {
      const filter: ClientFilter = { package_id: packageId };
      const results = await getClients(filter);

      expect(results).toHaveLength(2);
      expect(results.every(client => client.package_id === packageId)).toBe(true);
    });
  });

  describe('getClientById', () => {
    let clientId: number;

    beforeEach(async () => {
      const input: CreateClientInput = {
        name: 'Test Client',
        phone: '+966501234567',
        package_id: packageId,
        service_status: 'active',
        payment_status: 'paid',
        balance_creditor: 50
      };

      const client = await createClient(input);
      clientId = client.id;
    });

    it('should return client by ID', async () => {
      const result = await getClientById(clientId);

      expect(result).toBeDefined();
      expect(result!.id).toEqual(clientId);
      expect(result!.name).toEqual('Test Client');
      expect(typeof result!.balance_creditor).toBe('number');
      expect(result!.balance_creditor).toEqual(50);
      expect(result!.start_date).toBeInstanceOf(Date);
      expect(result!.subscription_end_date).toBeInstanceOf(Date);
    });

    it('should return null for non-existent client', async () => {
      const result = await getClientById(999);
      expect(result).toBeNull();
    });
  });

  describe('updateClient', () => {
    let clientId: number;

    beforeEach(async () => {
      const input: CreateClientInput = {
        name: 'Original Name',
        phone: '+966501234567',
        package_id: packageId,
        service_status: 'active',
        payment_status: 'paid',
        balance_creditor: 0
      };

      const client = await createClient(input);
      clientId = client.id;
    });

    it('should update client fields', async () => {
      const updates = {
        name: 'Updated Name',
        phone: '+966509999999',
        balance_creditor: 100
      };

      const result = await updateClient(clientId, updates);

      expect(result).toBeDefined();
      expect(result!.name).toEqual('Updated Name');
      expect(result!.phone).toEqual('+966509999999');
      expect(result!.balance_creditor).toEqual(100);
      expect(typeof result!.balance_creditor).toBe('number');
    });

    it('should recalculate subscription dates when package changes', async () => {
      // Create quarterly package
      const quarterlyPackage = await db.insert(packagesTable)
        .values({
          name: 'Quarterly Plan',
          speed: '20 Mbps',
          monthly_price: '150.00',
          billing_cycle: 'quarterly',
          status: 'active',
          days_allowed: 90
        })
        .returning()
        .execute();

      const updates = {
        package_id: quarterlyPackage[0].id,
        start_date: new Date('2024-01-01')
      };

      const result = await updateClient(clientId, updates);

      expect(result).toBeDefined();
      expect(result!.package_id).toEqual(quarterlyPackage[0].id);
      expect(result!.subscription_end_date).toEqual(new Date('2024-04-01')); // 3 months later
    });

    it('should return null for non-existent client', async () => {
      const result = await updateClient(999, { name: 'Test' });
      expect(result).toBeNull();
    });

    it('should throw error for non-existent package', async () => {
      const updates = { package_id: 999 };
      
      await expect(updateClient(clientId, updates)).rejects.toThrow(/package not found/i);
    });
  });

  describe('deleteClient', () => {
    let clientId: number;

    beforeEach(async () => {
      const input: CreateClientInput = {
        name: 'Test Client',
        phone: '+966501234567',
        package_id: packageId,
        service_status: 'active',
        payment_status: 'paid',
        balance_creditor: 0
      };

      const client = await createClient(input);
      clientId = client.id;
    });

    it('should delete client without payments', async () => {
      const result = await deleteClient(clientId);
      expect(result).toBe(true);

      const client = await getClientById(clientId);
      expect(client).toBeNull();
    });

    it('should delete related invoices', async () => {
      // Create invoice for client
      await db.insert(invoicesTable)
        .values({
          client_id: clientId,
          amount: '50.00',
          due_date: '2024-02-01',
          status: 'pending',
          is_manual: false
        })
        .execute();

      const result = await deleteClient(clientId);
      expect(result).toBe(true);

      const invoices = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.client_id, clientId))
        .execute();

      expect(invoices).toHaveLength(0);
    });

    it('should not delete client with existing payments', async () => {
      // Create payment for client
      await db.insert(paymentsTable)
        .values({
          client_id: clientId,
          amount: '50.00',
          method: 'cash'
        })
        .execute();

      await expect(deleteClient(clientId)).rejects.toThrow(/cannot delete client with existing payments/i);
    });

    it('should return false for non-existent client', async () => {
      const result = await deleteClient(999);
      expect(result).toBe(false);
    });
  });

  describe('getClientDueAmount', () => {
    let clientId: number;

    beforeEach(async () => {
      const input: CreateClientInput = {
        name: 'Test Client',
        phone: '+966501234567',
        package_id: packageId,
        service_status: 'active',
        payment_status: 'paid',
        balance_creditor: 25
      };

      const client = await createClient(input);
      clientId = client.id;
    });

    it('should calculate due amount with unpaid invoices', async () => {
      // Create unpaid invoices
      await db.insert(invoicesTable)
        .values([
          {
            client_id: clientId,
            amount: '100.00',
            due_date: '2024-02-01',
            status: 'pending',
            is_manual: false
          },
          {
            client_id: clientId,
            amount: '50.00',
            due_date: '2024-02-01',
            status: 'pending',
            is_manual: false
          }
        ])
        .execute();

      const result = await getClientDueAmount(clientId);
      
      // 100 + 50 - 25 (balance creditor) = 125
      expect(result).toEqual(125);
    });

    it('should return 0 when balance creditor exceeds unpaid amount', async () => {
      // Create small unpaid invoice
      await db.insert(invoicesTable)
        .values({
          client_id: clientId,
          amount: '10.00',
          due_date: '2024-02-01',
          status: 'pending',
          is_manual: false
        })
        .execute();

      const result = await getClientDueAmount(clientId);
      
      // 10 - 25 (balance creditor) = -15, but should return 0
      expect(result).toEqual(0);
    });

    it('should ignore paid invoices', async () => {
      await db.insert(invoicesTable)
        .values([
          {
            client_id: clientId,
            amount: '100.00',
            due_date: '2024-02-01',
            status: 'pending',
            is_manual: false
          },
          {
            client_id: clientId,
            amount: '200.00',
            due_date: '2024-02-01',
            status: 'paid',
            is_manual: false
          }
        ])
        .execute();

      const result = await getClientDueAmount(clientId);
      
      // Only pending invoice: 100 - 25 (balance creditor) = 75
      expect(result).toEqual(75);
    });

    it('should throw error for non-existent client', async () => {
      await expect(getClientDueAmount(999)).rejects.toThrow(/client not found/i);
    });
  });
});
