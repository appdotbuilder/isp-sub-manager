
import { db } from '../db';
import { expensesTable } from '../db/schema';
import { type CreateExpenseInput, type Expense } from '../schema';
import { eq, gte, lte, and, desc, sum, SQL } from 'drizzle-orm';

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  try {
    // Convert Date to string for date column
    const dateString = input.date.toISOString().split('T')[0]; // YYYY-MM-DD format

    const result = await db.insert(expensesTable)
      .values({
        type: input.type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        date: dateString, // Convert Date to string for date column
        description: input.description || null
      })
      .returning()
      .execute();

    const expense = result[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount), // Convert string back to number
      date: new Date(expense.date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Expense creation failed:', error);
    throw error;
  }
}

export async function getExpenses(dateFrom?: Date, dateTo?: Date): Promise<Expense[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (dateFrom !== undefined) {
      const dateFromString = dateFrom.toISOString().split('T')[0];
      conditions.push(gte(expensesTable.date, dateFromString));
    }

    if (dateTo !== undefined) {
      const dateToString = dateTo.toISOString().split('T')[0];
      conditions.push(lte(expensesTable.date, dateToString));
    }

    // Build the complete query in one go
    const results = conditions.length === 0
      ? await db.select()
          .from(expensesTable)
          .orderBy(desc(expensesTable.date), desc(expensesTable.created_at))
          .execute()
      : await db.select()
          .from(expensesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(expensesTable.date), desc(expensesTable.created_at))
          .execute();

    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount), // Convert numeric fields back to numbers
      date: new Date(expense.date) // Convert string back to Date
    }));
  } catch (error) {
    console.error('Get expenses failed:', error);
    throw error;
  }
}

export async function getExpenseById(id: number): Promise<Expense | null> {
  try {
    const results = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const expense = results[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount), // Convert numeric field back to number
      date: new Date(expense.date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Get expense by ID failed:', error);
    throw error;
  }
}

export async function updateExpense(id: number, updates: Partial<CreateExpenseInput>): Promise<Expense | null> {
  try {
    // Prepare update values, converting numeric and date fields
    const updateValues: any = {};
    
    if (updates.type !== undefined) {
      updateValues.type = updates.type;
    }
    
    if (updates.amount !== undefined) {
      updateValues.amount = updates.amount.toString(); // Convert number to string for numeric column
    }
    
    if (updates.date !== undefined) {
      updateValues.date = updates.date.toISOString().split('T')[0]; // Convert Date to string
    }
    
    if (updates.description !== undefined) {
      updateValues.description = updates.description;
    }

    const results = await db.update(expensesTable)
      .set(updateValues)
      .where(eq(expensesTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      return null;
    }

    const expense = results[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount), // Convert string back to number
      date: new Date(expense.date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Update expense failed:', error);
    throw error;
  }
}

export async function deleteExpense(id: number): Promise<boolean> {
  try {
    const results = await db.delete(expensesTable)
      .where(eq(expensesTable.id, id))
      .returning()
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Delete expense failed:', error);
    throw error;
  }
}

export async function getTotalExpenses(dateFrom?: Date, dateTo?: Date): Promise<number> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (dateFrom !== undefined) {
      const dateFromString = dateFrom.toISOString().split('T')[0];
      conditions.push(gte(expensesTable.date, dateFromString));
    }

    if (dateTo !== undefined) {
      const dateToString = dateTo.toISOString().split('T')[0];
      conditions.push(lte(expensesTable.date, dateToString));
    }

    // Build the complete query in one go
    const results = conditions.length === 0
      ? await db.select({
          total: sum(expensesTable.amount)
        }).from(expensesTable).execute()
      : await db.select({
          total: sum(expensesTable.amount)
        }).from(expensesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute();
    
    // Handle null result from sum aggregation
    const total = results[0]?.total;
    return total ? parseFloat(total) : 0;
  } catch (error) {
    console.error('Get total expenses failed:', error);
    throw error;
  }
}
