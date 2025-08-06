
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { packagesTable, clientsTable } from '../db/schema';
import { type CreatePackageInput } from '../schema';
import { 
  createPackage, 
  getPackages, 
  getPackageById, 
  updatePackage, 
  deletePackage, 
  getActivePackages 
} from '../handlers/packages';
import { eq } from 'drizzle-orm';

const testPackageInput: CreatePackageInput = {
  name: 'High Speed Internet',
  speed: '100 Mbps',
  monthly_price: 99.99,
  billing_cycle: 'monthly',
  days_allowed: 30,
  description: 'Premium internet package'
};

describe('Package Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createPackage', () => {
    it('should create a package successfully', async () => {
      const result = await createPackage(testPackageInput);

      expect(result.name).toEqual('High Speed Internet');
      expect(result.speed).toEqual('100 Mbps');
      expect(result.monthly_price).toEqual(99.99);
      expect(typeof result.monthly_price).toBe('number');
      expect(result.billing_cycle).toEqual('monthly');
      expect(result.days_allowed).toEqual(30);
      expect(result.description).toEqual('Premium internet package');
      expect(result.status).toEqual('active');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save package to database', async () => {
      const result = await createPackage(testPackageInput);

      const packages = await db.select()
        .from(packagesTable)
        .where(eq(packagesTable.id, result.id))
        .execute();

      expect(packages).toHaveLength(1);
      expect(packages[0].name).toEqual('High Speed Internet');
      expect(parseFloat(packages[0].monthly_price)).toEqual(99.99);
    });

    it('should handle package without description', async () => {
      const inputWithoutDescription = { ...testPackageInput };
      delete inputWithoutDescription.description;

      const result = await createPackage(inputWithoutDescription);

      expect(result.description).toBeNull();
    });
  });

  describe('getPackages', () => {
    it('should return empty array when no packages exist', async () => {
      const result = await getPackages();
      expect(result).toEqual([]);
    });

    it('should return all packages', async () => {
      await createPackage(testPackageInput);
      const secondPackage = {
        ...testPackageInput,
        name: 'Basic Internet',
        monthly_price: 49.99
      };
      await createPackage(secondPackage);

      const result = await getPackages();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('High Speed Internet');
      expect(result[0].monthly_price).toEqual(99.99);
      expect(typeof result[0].monthly_price).toBe('number');
      expect(result[1].name).toEqual('Basic Internet');
      expect(result[1].monthly_price).toEqual(49.99);
    });
  });

  describe('getPackageById', () => {
    it('should return null for non-existent package', async () => {
      const result = await getPackageById(999);
      expect(result).toBeNull();
    });

    it('should return package by ID', async () => {
      const created = await createPackage(testPackageInput);

      const result = await getPackageById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('High Speed Internet');
      expect(result!.monthly_price).toEqual(99.99);
      expect(typeof result!.monthly_price).toBe('number');
    });
  });

  describe('updatePackage', () => {
    it('should return null for non-existent package', async () => {
      const result = await updatePackage(999, { name: 'Updated' });
      expect(result).toBeNull();
    });

    it('should update package successfully', async () => {
      const created = await createPackage(testPackageInput);

      const result = await updatePackage(created.id, {
        name: 'Updated Package',
        monthly_price: 129.99
      });

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Updated Package');
      expect(result!.monthly_price).toEqual(129.99);
      expect(typeof result!.monthly_price).toBe('number');
      expect(result!.speed).toEqual('100 Mbps'); // Unchanged field
    });

    it('should update package in database', async () => {
      const created = await createPackage(testPackageInput);

      await updatePackage(created.id, { name: 'Updated Package' });

      const updated = await db.select()
        .from(packagesTable)
        .where(eq(packagesTable.id, created.id))
        .execute();

      expect(updated[0].name).toEqual('Updated Package');
    });
  });

  describe('deletePackage', () => {
    it('should return false for non-existent package', async () => {
      const result = await deletePackage(999);
      expect(result).toBe(false);
    });

    it('should delete package successfully', async () => {
      const created = await createPackage(testPackageInput);

      const result = await deletePackage(created.id);

      expect(result).toBe(true);

      const packages = await db.select()
        .from(packagesTable)
        .where(eq(packagesTable.id, created.id))
        .execute();

      expect(packages).toHaveLength(0);
    });

    it('should not delete package with clients', async () => {
      const created = await createPackage(testPackageInput);

      // Create a client using this package
      await db.insert(clientsTable)
        .values({
          name: 'Test Client',
          phone: '123456789',
          package_id: created.id,
          start_date: '2024-01-01',
          subscription_end_date: '2024-02-01',
          service_status: 'active',
          payment_status: 'paid',
          balance_creditor: '0'
        })
        .execute();

      const result = await deletePackage(created.id);

      expect(result).toBe(false);

      // Package should still exist
      const packages = await db.select()
        .from(packagesTable)
        .where(eq(packagesTable.id, created.id))
        .execute();

      expect(packages).toHaveLength(1);
    });
  });

  describe('getActivePackages', () => {
    it('should return only active packages', async () => {
      const activePackage = await createPackage(testPackageInput);
      
      // Create inactive package
      await db.insert(packagesTable)
        .values({
          name: 'Inactive Package',
          speed: '50 Mbps',
          monthly_price: '29.99',
          billing_cycle: 'monthly',
          days_allowed: 30,
          status: 'inactive'
        })
        .execute();

      const result = await getActivePackages();

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(activePackage.id);
      expect(result[0].status).toEqual('active');
      expect(result[0].monthly_price).toEqual(99.99);
      expect(typeof result[0].monthly_price).toBe('number');
    });

    it('should return empty array when no active packages exist', async () => {
      await db.insert(packagesTable)
        .values({
          name: 'Inactive Package',
          speed: '50 Mbps',
          monthly_price: '29.99',
          billing_cycle: 'monthly',
          days_allowed: 30,
          status: 'inactive'
        })
        .execute();

      const result = await getActivePackages();

      expect(result).toEqual([]);
    });
  });
});
