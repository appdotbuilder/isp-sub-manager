
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { expensesTable } from '../db/schema';
import { type CreateExpenseInput } from '../schema';
import { 
  createExpense, 
  getExpenses, 
  getExpenseById, 
  updateExpense, 
  deleteExpense, 
  getTotalExpenses 
} from '../handlers/expenses';
import { eq } from 'drizzle-orm';

// Test inputs
const testExpenseInput: CreateExpenseInput = {
  type: 'maintenance',
  amount: 150.75,
  date: new Date('2024-01-15'),
  description: 'Equipment repair'
};

const testExpenseInput2: CreateExpenseInput = {
  type: 'electricity',
  amount: 200.00,
  date: new Date('2024-01-20'),
  description: 'Monthly electricity bill'
};

describe('createExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an expense', async () => {
    const result = await createExpense(testExpenseInput);

    expect(result.type).toEqual('maintenance');
    expect(result.amount).toEqual(150.75);
    expect(typeof result.amount).toBe('number');
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.description).toEqual('Equipment repair');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save expense to database', async () => {
    const result = await createExpense(testExpenseInput);

    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, result.id))
      .execute();

    expect(expenses).toHaveLength(1);
    expect(expenses[0].type).toEqual('maintenance');
    expect(parseFloat(expenses[0].amount)).toEqual(150.75);
    expect(expenses[0].date).toEqual('2024-01-15'); // Stored as string in DB
    expect(expenses[0].description).toEqual('Equipment repair');
    expect(expenses[0].created_at).toBeInstanceOf(Date);
  });

  it('should create expense with null description', async () => {
    const inputWithoutDescription: CreateExpenseInput = {
      type: 'equipment',
      amount: 500.00,
      date: new Date('2024-01-10')
    };

    const result = await createExpense(inputWithoutDescription);

    expect(result.type).toEqual('equipment');
    expect(result.amount).toEqual(500.00);
    expect(result.description).toBeNull();
  });
});

describe('getExpenses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all expenses when no date filters', async () => {
    await createExpense(testExpenseInput);
    await createExpense(testExpenseInput2);

    const results = await getExpenses();

    expect(results).toHaveLength(2);
    expect(results.every(expense => typeof expense.amount === 'number')).toBe(true);
    expect(results.every(expense => expense.date instanceof Date)).toBe(true);
    
    // Should be ordered by date desc, then created_at desc
    expect(results[0].date >= results[1].date).toBe(true);
  });

  it('should filter expenses by date range', async () => {
    await createExpense(testExpenseInput); // 2024-01-15
    await createExpense(testExpenseInput2); // 2024-01-20

    const results = await getExpenses(
      new Date('2024-01-18'),
      new Date('2024-01-25')
    );

    expect(results).toHaveLength(1);
    expect(results[0].date).toEqual(new Date('2024-01-20'));
    expect(results[0].type).toEqual('electricity');
  });

  it('should filter expenses from date only', async () => {
    await createExpense(testExpenseInput); // 2024-01-15
    await createExpense(testExpenseInput2); // 2024-01-20

    const results = await getExpenses(new Date('2024-01-18'));

    expect(results).toHaveLength(1);
    expect(results[0].date).toEqual(new Date('2024-01-20'));
  });

  it('should filter expenses to date only', async () => {
    await createExpense(testExpenseInput); // 2024-01-15
    await createExpense(testExpenseInput2); // 2024-01-20

    const results = await getExpenses(undefined, new Date('2024-01-18'));

    expect(results).toHaveLength(1);
    expect(results[0].date).toEqual(new Date('2024-01-15'));
  });

  it('should return empty array when no expenses match filters', async () => {
    await createExpense(testExpenseInput);

    const results = await getExpenses(
      new Date('2024-02-01'),
      new Date('2024-02-28')
    );

    expect(results).toHaveLength(0);
  });
});

describe('getExpenseById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return expense by ID', async () => {
    const created = await createExpense(testExpenseInput);

    const result = await getExpenseById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.type).toEqual('maintenance');
    expect(result!.amount).toEqual(150.75);
    expect(typeof result!.amount).toBe('number');
    expect(result!.date).toEqual(new Date('2024-01-15'));
    expect(result!.description).toEqual('Equipment repair');
  });

  it('should return null for non-existent ID', async () => {
    const result = await getExpenseById(999);

    expect(result).toBeNull();
  });
});

describe('updateExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update expense fields', async () => {
    const created = await createExpense(testExpenseInput);

    const updates: Partial<CreateExpenseInput> = {
      amount: 200.50,
      description: 'Updated repair cost'
    };

    const result = await updateExpense(created.id, updates);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.type).toEqual('maintenance'); // Unchanged
    expect(result!.amount).toEqual(200.50);
    expect(typeof result!.amount).toBe('number');
    expect(result!.description).toEqual('Updated repair cost');
    expect(result!.date).toEqual(new Date('2024-01-15')); // Unchanged
  });

  it('should update only provided fields', async () => {
    const created = await createExpense(testExpenseInput);

    const updates: Partial<CreateExpenseInput> = {
      type: 'equipment'
    };

    const result = await updateExpense(created.id, updates);

    expect(result).not.toBeNull();
    expect(result!.type).toEqual('equipment');
    expect(result!.amount).toEqual(150.75); // Unchanged
    expect(result!.description).toEqual('Equipment repair'); // Unchanged
  });

  it('should update date field correctly', async () => {
    const created = await createExpense(testExpenseInput);

    const newDate = new Date('2024-02-01');
    const updates: Partial<CreateExpenseInput> = {
      date: newDate
    };

    const result = await updateExpense(created.id, updates);

    expect(result).not.toBeNull();
    expect(result!.date).toEqual(newDate);
    expect(result!.type).toEqual('maintenance'); // Unchanged
    expect(result!.amount).toEqual(150.75); // Unchanged
  });

  it('should return null for non-existent ID', async () => {
    const updates: Partial<CreateExpenseInput> = {
      amount: 100.00
    };

    const result = await updateExpense(999, updates);

    expect(result).toBeNull();
  });
});

describe('deleteExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete expense and return true', async () => {
    const created = await createExpense(testExpenseInput);

    const result = await deleteExpense(created.id);

    expect(result).toBe(true);

    // Verify deletion
    const expense = await getExpenseById(created.id);
    expect(expense).toBeNull();
  });

  it('should return false for non-existent ID', async () => {
    const result = await deleteExpense(999);

    expect(result).toBe(false);
  });
});

describe('getTotalExpenses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return total of all expenses when no date filters', async () => {
    await createExpense(testExpenseInput); // 150.75
    await createExpense(testExpenseInput2); // 200.00

    const total = await getTotalExpenses();

    expect(total).toEqual(350.75);
    expect(typeof total).toBe('number');
  });

  it('should return total for date range', async () => {
    await createExpense(testExpenseInput); // 150.75 on 2024-01-15
    await createExpense(testExpenseInput2); // 200.00 on 2024-01-20

    const total = await getTotalExpenses(
      new Date('2024-01-18'),
      new Date('2024-01-25')
    );

    expect(total).toEqual(200.00); // Only the second expense
  });

  it('should return total from date only', async () => {
    await createExpense(testExpenseInput); // 150.75 on 2024-01-15
    await createExpense(testExpenseInput2); // 200.00 on 2024-01-20

    const total = await getTotalExpenses(new Date('2024-01-18'));

    expect(total).toEqual(200.00);
  });

  it('should return total to date only', async () => {
    await createExpense(testExpenseInput); // 150.75 on 2024-01-15
    await createExpense(testExpenseInput2); // 200.00 on 2024-01-20

    const total = await getTotalExpenses(undefined, new Date('2024-01-18'));

    expect(total).toEqual(150.75);
  });

  it('should return 0 when no expenses match filters', async () => {
    await createExpense(testExpenseInput);

    const total = await getTotalExpenses(
      new Date('2024-02-01'),
      new Date('2024-02-28')
    );

    expect(total).toEqual(0);
  });

  it('should return 0 when no expenses exist', async () => {
    const total = await getTotalExpenses();

    expect(total).toEqual(0);
  });
});
