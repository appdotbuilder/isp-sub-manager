
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type CompanySettings } from '../schema';
import { 
  getCompanySettings, 
  updateCompanySettings, 
  createBackup, 
  restoreFromBackup 
} from '../handlers/settings';

describe('getCompanySettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no settings exist', async () => {
    const result = await getCompanySettings();
    expect(result).toBeNull();
  });

  it('should return settings with proper numeric conversion', async () => {
    // First create settings
    const updates = {
      company_name: 'Test Company',
      tax_rate: 15.5,
      currency_symbol: 'USD'
    };

    await updateCompanySettings(updates);

    // Then retrieve them
    const result = await getCompanySettings();

    expect(result).not.toBeNull();
    expect(result!.company_name).toEqual('Test Company');
    expect(result!.tax_rate).toEqual(15.5);
    expect(typeof result!.tax_rate).toBe('number');
    expect(result!.currency_symbol).toEqual('USD');
    expect(result!.id).toBeDefined();
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});

describe('updateCompanySettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new settings when none exist', async () => {
    const updates = {
      company_name: 'New Company',
      email: 'test@company.com',
      tax_rate: 10.0
    };

    const result = await updateCompanySettings(updates);

    expect(result).not.toBeNull();
    expect(result!.company_name).toEqual('New Company');
    expect(result!.email).toEqual('test@company.com');
    expect(result!.tax_rate).toEqual(10.0);
    expect(typeof result!.tax_rate).toBe('number');
    expect(result!.default_language).toEqual('ar'); // Default value
    expect(result!.currency_symbol).toEqual('SAR'); // Default value
    expect(result!.id).toBeDefined();
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update existing settings', async () => {
    // Create initial settings
    const initial = {
      company_name: 'Initial Company',
      tax_rate: 5.0
    };
    
    await updateCompanySettings(initial);

    // Update some fields
    const updates = {
      company_name: 'Updated Company',
      phone: '+1234567890',
      tax_rate: 8.5
    };

    const result = await updateCompanySettings(updates);

    expect(result).not.toBeNull();
    expect(result!.company_name).toEqual('Updated Company');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.tax_rate).toEqual(8.5);
    expect(typeof result!.tax_rate).toBe('number');
  });

  it('should handle partial updates correctly', async () => {
    // Create initial settings
    await updateCompanySettings({
      company_name: 'Test Company',
      email: 'original@test.com',
      tax_rate: 12.0
    });

    // Update only some fields
    const updates = {
      email: 'updated@test.com'
    };

    const result = await updateCompanySettings(updates);

    expect(result).not.toBeNull();
    expect(result!.company_name).toEqual('Test Company'); // Should remain unchanged
    expect(result!.email).toEqual('updated@test.com'); // Should be updated
    expect(result!.tax_rate).toEqual(12.0); // Should remain unchanged
  });

  it('should handle null values correctly', async () => {
    const updates = {
      company_name: 'Test Company',
      logo_url: null,
      address: null,
      tax_rate: 0
    };

    const result = await updateCompanySettings(updates);

    expect(result).not.toBeNull();
    expect(result!.company_name).toEqual('Test Company');
    expect(result!.logo_url).toBeNull();
    expect(result!.address).toBeNull();
    expect(result!.tax_rate).toEqual(0);
    expect(typeof result!.tax_rate).toBe('number');
  });
});

describe('createBackup', () => {
  it('should return backup information with filename and timestamp', async () => {
    const result = await createBackup();

    expect(result.filename).toBeDefined();
    expect(result.filename).toMatch(/^backup_.*\.sql$/);
    expect(result.size).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should generate unique filenames for multiple backups', async () => {
    const backup1 = await createBackup();
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    const backup2 = await createBackup();

    expect(backup1.filename).not.toEqual(backup2.filename);
    expect(backup1.created_at.getTime()).toBeLessThan(backup2.created_at.getTime());
  });
});

describe('restoreFromBackup', () => {
  it('should return false for empty filename', async () => {
    const result = await restoreFromBackup('');
    expect(result).toBe(false);
  });

  it('should return false for invalid filename', async () => {
    const result = await restoreFromBackup('invalid_file.txt');
    expect(result).toBe(false);
  });

  it('should return true for valid SQL backup filename', async () => {
    const result = await restoreFromBackup('backup_2024-01-01.sql');
    expect(result).toBe(true);
  });

  it('should handle various SQL file extensions', async () => {
    const validResult = await restoreFromBackup('database_backup.sql');
    expect(validResult).toBe(true);

    const invalidResult = await restoreFromBackup('not_a_backup.json');
    expect(invalidResult).toBe(false);
  });
});
