
import { db } from '../db';
import { incomesTable } from '../db/schema';
import { type CreateIncomeInput, type Income } from '../schema';
import { eq, gte, lte, and, sum, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

// Helper function to format date for database (YYYY-MM-DD)
const formatDateForDB = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to parse date from database
const parseDateFromDB = (dateStr: string): Date => {
  return new Date(dateStr + 'T00:00:00.000Z');
};

export async function createIncome(input: CreateIncomeInput): Promise<Income> {
  try {
    const result = await db.insert(incomesTable)
      .values({
        type: input.type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        date: formatDateForDB(input.date), // Convert Date to string for date column
        description: input.description || null
      })
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const income = result[0];
    return {
      ...income,
      amount: parseFloat(income.amount), // Convert string back to number
      date: parseDateFromDB(income.date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Income creation failed:', error);
    throw error;
  }
}

export async function getIncomes(dateFrom?: Date, dateTo?: Date): Promise<Income[]> {
  try {
    // Build conditions array for date filtering
    const conditions: SQL<unknown>[] = [];

    if (dateFrom) {
      conditions.push(gte(incomesTable.date, formatDateForDB(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(incomesTable.date, formatDateForDB(dateTo)));
    }

    // Build query with conditions
    const results = conditions.length > 0 
      ? await db.select()
          .from(incomesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(incomesTable.date))
          .execute()
      : await db.select()
          .from(incomesTable)
          .orderBy(desc(incomesTable.date))
          .execute();

    // Convert numeric and date fields back to proper types
    return results.map(income => ({
      ...income,
      amount: parseFloat(income.amount), // Convert string back to number
      date: parseDateFromDB(income.date) // Convert string back to Date
    }));
  } catch (error) {
    console.error('Income retrieval failed:', error);
    throw error;
  }
}

export async function getIncomeById(id: number): Promise<Income | null> {
  try {
    const results = await db.select()
      .from(incomesTable)
      .where(eq(incomesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric and date fields back to proper types
    const income = results[0];
    return {
      ...income,
      amount: parseFloat(income.amount), // Convert string back to number
      date: parseDateFromDB(income.date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Income retrieval by ID failed:', error);
    throw error;
  }
}

export async function updateIncome(id: number, updates: Partial<CreateIncomeInput>): Promise<Income | null> {
  try {
    // Prepare update values, converting amount and date to strings if provided
    const updateValues: any = { ...updates };
    if (updates.amount !== undefined) {
      updateValues.amount = updates.amount.toString();
    }
    if (updates.date !== undefined) {
      updateValues.date = formatDateForDB(updates.date);
    }

    const results = await db.update(incomesTable)
      .set(updateValues)
      .where(eq(incomesTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric and date fields back to proper types
    const income = results[0];
    return {
      ...income,
      amount: parseFloat(income.amount), // Convert string back to number
      date: parseDateFromDB(income.date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Income update failed:', error);
    throw error;
  }
}

export async function deleteIncome(id: number): Promise<boolean> {
  try {
    const results = await db.delete(incomesTable)
      .where(eq(incomesTable.id, id))
      .returning()
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Income deletion failed:', error);
    throw error;
  }
}

export async function getTotalOtherIncome(dateFrom?: Date, dateTo?: Date): Promise<number> {
  try {
    // Build conditions array for date filtering
    const conditions: SQL<unknown>[] = [];

    if (dateFrom) {
      conditions.push(gte(incomesTable.date, formatDateForDB(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(incomesTable.date, formatDateForDB(dateTo)));
    }

    // Build query with conditions
    const results = conditions.length > 0 
      ? await db.select({
          total: sum(incomesTable.amount)
        })
        .from(incomesTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .execute()
      : await db.select({
          total: sum(incomesTable.amount)
        })
        .from(incomesTable)
        .execute();

    // Handle null result from sum aggregation
    const total = results[0]?.total;
    return total ? parseFloat(total) : 0;
  } catch (error) {
    console.error('Total income calculation failed:', error);
    throw error;
  }
}
