
import { db } from '../db';
import { packagesTable, clientsTable } from '../db/schema';
import { type CreatePackageInput, type Package } from '../schema';
import { eq, count } from 'drizzle-orm';

export async function createPackage(input: CreatePackageInput): Promise<Package> {
  try {
    const result = await db.insert(packagesTable)
      .values({
        name: input.name,
        speed: input.speed,
        monthly_price: input.monthly_price.toString(),
        billing_cycle: input.billing_cycle,
        days_allowed: input.days_allowed,
        description: input.description || null,
        status: 'active'
      })
      .returning()
      .execute();

    const packageData = result[0];
    return {
      ...packageData,
      monthly_price: parseFloat(packageData.monthly_price),
      status: packageData.status as 'active' | 'inactive'
    };
  } catch (error) {
    console.error('Package creation failed:', error);
    throw error;
  }
}

export async function getPackages(): Promise<Package[]> {
  try {
    const results = await db.select()
      .from(packagesTable)
      .execute();

    return results.map(pkg => ({
      ...pkg,
      monthly_price: parseFloat(pkg.monthly_price),
      status: pkg.status as 'active' | 'inactive'
    }));
  } catch (error) {
    console.error('Failed to fetch packages:', error);
    throw error;
  }
}

export async function getPackageById(id: number): Promise<Package | null> {
  try {
    const results = await db.select()
      .from(packagesTable)
      .where(eq(packagesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const packageData = results[0];
    return {
      ...packageData,
      monthly_price: parseFloat(packageData.monthly_price),
      status: packageData.status as 'active' | 'inactive'
    };
  } catch (error) {
    console.error('Failed to fetch package by ID:', error);
    throw error;
  }
}

export async function updatePackage(id: number, updates: Partial<CreatePackageInput>): Promise<Package | null> {
  try {
    // Check if package exists
    const existing = await getPackageById(id);
    if (!existing) {
      return null;
    }

    // Prepare update values, converting numeric fields
    const updateValues: any = { ...updates };
    if (updateValues.monthly_price !== undefined) {
      updateValues.monthly_price = updateValues.monthly_price.toString();
    }

    const result = await db.update(packagesTable)
      .set(updateValues)
      .where(eq(packagesTable.id, id))
      .returning()
      .execute();

    const packageData = result[0];
    return {
      ...packageData,
      monthly_price: parseFloat(packageData.monthly_price),
      status: packageData.status as 'active' | 'inactive'
    };
  } catch (error) {
    console.error('Package update failed:', error);
    throw error;
  }
}

export async function deletePackage(id: number): Promise<boolean> {
  try {
    // Check if any clients are using this package
    const clientCount = await db.select({ count: count() })
      .from(clientsTable)
      .where(eq(clientsTable.package_id, id))
      .execute();

    if (clientCount[0].count > 0) {
      return false; // Cannot delete package with active clients
    }

    const result = await db.delete(packagesTable)
      .where(eq(packagesTable.id, id))
      .execute();

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Package deletion failed:', error);
    throw error;
  }
}

export async function getActivePackages(): Promise<Package[]> {
  try {
    const results = await db.select()
      .from(packagesTable)
      .where(eq(packagesTable.status, 'active'))
      .execute();

    return results.map(pkg => ({
      ...pkg,
      monthly_price: parseFloat(pkg.monthly_price),
      status: pkg.status as 'active' | 'inactive'
    }));
  } catch (error) {
    console.error('Failed to fetch active packages:', error);
    throw error;
  }
}
