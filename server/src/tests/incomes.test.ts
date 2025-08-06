
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { incomesTable } from '../db/schema';
import { type CreateIncomeInput } from '../schema';
import { 
  createIncome, 
  getIncomes, 
  getIncomeById, 
  updateIncome, 
  deleteIncome, 
  getTotalOtherIncome 
} from '../handlers/incomes';
import { eq } from 'drizzle-orm';

// Test input data
const testIncomeInput: CreateIncomeInput = {
  type: 'connecting_service',
  amount: 150.50,
  date: new Date('2024-01-15'),
  description: 'Connection service fee for new client'
};

const testEquipmentSaleInput: CreateIncomeInput = {
  type: 'sale_equipment',
  amount: 250.00,
  date: new Date('2024-01-20'),
  description: 'Router sale'
};

describe('Income Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createIncome', () => {
    it('should create an income record', async () => {
      const result = await createIncome(testIncomeInput);

      expect(result.id).toBeDefined();
      expect(result.type).toEqual('connecting_service');
      expect(result.amount).toEqual(150.50);
      expect(typeof result.amount).toEqual('number');
      expect(result.date).toEqual(new Date('2024-01-15'));
      expect(result.description).toEqual('Connection service fee for new client');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save income to database', async () => {
      const result = await createIncome(testIncomeInput);

      const incomes = await db.select()
        .from(incomesTable)
        .where(eq(incomesTable.id, result.id))
        .execute();

      expect(incomes).toHaveLength(1);
      expect(incomes[0].type).toEqual('connecting_service');
      expect(parseFloat(incomes[0].amount)).toEqual(150.50);
      expect(incomes[0].date).toEqual('2024-01-15');
      expect(incomes[0].description).toEqual('Connection service fee for new client');
    });

    it('should handle income without description', async () => {
      const input: CreateIncomeInput = {
        type: 'other',
        amount: 75.25,
        date: new Date('2024-01-10')
      };

      const result = await createIncome(input);

      expect(result.description).toBeNull();
      expect(result.amount).toEqual(75.25);
    });
  });

  describe('getIncomes', () => {
    beforeEach(async () => {
      // Create test data
      await createIncome(testIncomeInput);
      await createIncome(testEquipmentSaleInput);
      await createIncome({
        type: 'other',
        amount: 100.00,
        date: new Date('2024-02-01'),
        description: 'Other income'
      });
    });

    it('should retrieve all incomes when no date filter is provided', async () => {
      const results = await getIncomes();

      expect(results).toHaveLength(3);
      // Should be ordered by date descending
      expect(results[0].date).toEqual(new Date('2024-02-01'));
      expect(results[1].date).toEqual(new Date('2024-01-20'));
      expect(results[2].date).toEqual(new Date('2024-01-15'));
      
      // Verify numeric conversion
      results.forEach(income => {
        expect(typeof income.amount).toEqual('number');
        expect(income.date).toBeInstanceOf(Date);
      });
    });

    it('should filter incomes by date range', async () => {
      const dateFrom = new Date('2024-01-15');
      const dateTo = new Date('2024-01-25');

      const results = await getIncomes(dateFrom, dateTo);

      expect(results).toHaveLength(2);
      expect(results.some(r => r.type === 'connecting_service')).toBe(true);
      expect(results.some(r => r.type === 'sale_equipment')).toBe(true);
      expect(results.some(r => r.date >= new Date('2024-02-01'))).toBe(false);
    });

    it('should filter incomes by start date only', async () => {
      const dateFrom = new Date('2024-01-20');

      const results = await getIncomes(dateFrom);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.date >= dateFrom)).toBe(true);
    });

    it('should filter incomes by end date only', async () => {
      const dateTo = new Date('2024-01-20');

      const results = await getIncomes(undefined, dateTo);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.date <= dateTo)).toBe(true);
    });
  });

  describe('getIncomeById', () => {
    it('should retrieve income by ID', async () => {
      const created = await createIncome(testIncomeInput);
      const result = await getIncomeById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.type).toEqual('connecting_service');
      expect(result!.amount).toEqual(150.50);
      expect(typeof result!.amount).toEqual('number');
      expect(result!.date).toBeInstanceOf(Date);
      expect(result!.date).toEqual(new Date('2024-01-15'));
    });

    it('should return null for non-existent income', async () => {
      const result = await getIncomeById(999);
      expect(result).toBeNull();
    });
  });

  describe('updateIncome', () => {
    it('should update income record', async () => {
      const created = await createIncome(testIncomeInput);
      
      const updates = {
        amount: 200.00,
        description: 'Updated connection fee'
      };

      const result = await updateIncome(created.id, updates);

      expect(result).not.toBeNull();
      expect(result!.amount).toEqual(200.00);
      expect(typeof result!.amount).toEqual('number');
      expect(result!.description).toEqual('Updated connection fee');
      expect(result!.type).toEqual('connecting_service'); // Unchanged
      expect(result!.date).toBeInstanceOf(Date);
    });

    it('should return null for non-existent income', async () => {
      const result = await updateIncome(999, { amount: 100 });
      expect(result).toBeNull();
    });

    it('should update only provided fields', async () => {
      const created = await createIncome(testIncomeInput);
      
      const result = await updateIncome(created.id, { amount: 175.75 });

      expect(result).not.toBeNull();
      expect(result!.amount).toEqual(175.75);
      expect(result!.description).toEqual('Connection service fee for new client'); // Unchanged
      expect(result!.type).toEqual('connecting_service'); // Unchanged
      expect(result!.date).toEqual(new Date('2024-01-15')); // Unchanged
    });

    it('should update date field correctly', async () => {
      const created = await createIncome(testIncomeInput);
      
      const newDate = new Date('2024-01-25');
      const result = await updateIncome(created.id, { date: newDate });

      expect(result).not.toBeNull();
      expect(result!.date).toEqual(newDate);
      expect(result!.date).toBeInstanceOf(Date);
      expect(result!.amount).toEqual(150.50); // Unchanged
    });
  });

  describe('deleteIncome', () => {
    it('should delete income record', async () => {
      const created = await createIncome(testIncomeInput);
      
      const result = await deleteIncome(created.id);
      expect(result).toBe(true);

      // Verify deletion
      const retrieved = await getIncomeById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent income', async () => {
      const result = await deleteIncome(999);
      expect(result).toBe(false);
    });
  });

  describe('getTotalOtherIncome', () => {
    beforeEach(async () => {
      // Create test data
      await createIncome(testIncomeInput); // 150.50 on 2024-01-15
      await createIncome(testEquipmentSaleInput); // 250.00 on 2024-01-20
      await createIncome({
        type: 'other',
        amount: 100.00,
        date: new Date('2024-02-01'),
        description: 'Other income'
      });
    });

    it('should calculate total income without date filter', async () => {
      const total = await getTotalOtherIncome();
      
      expect(total).toEqual(500.50); // 150.50 + 250.00 + 100.00
      expect(typeof total).toEqual('number');
    });

    it('should calculate total income with date range filter', async () => {
      const dateFrom = new Date('2024-01-15');
      const dateTo = new Date('2024-01-25');

      const total = await getTotalOtherIncome(dateFrom, dateTo);
      
      expect(total).toEqual(400.50); // 150.50 + 250.00
    });

    it('should return 0 when no incomes match filter', async () => {
      const dateFrom = new Date('2024-03-01');
      const dateTo = new Date('2024-03-31');

      const total = await getTotalOtherIncome(dateFrom, dateTo);
      
      expect(total).toEqual(0);
    });

    it('should handle empty table', async () => {
      // Delete all test data
      await db.delete(incomesTable).execute();

      const total = await getTotalOtherIncome();
      
      expect(total).toEqual(0);
    });

    it('should filter by start date only', async () => {
      const dateFrom = new Date('2024-01-20');

      const total = await getTotalOtherIncome(dateFrom);
      
      expect(total).toEqual(350.00); // 250.00 + 100.00
    });

    it('should filter by end date only', async () => {
      const dateTo = new Date('2024-01-20');

      const total = await getTotalOtherIncome(undefined, dateTo);
      
      expect(total).toEqual(400.50); // 150.50 + 250.00
    });
  });
});
