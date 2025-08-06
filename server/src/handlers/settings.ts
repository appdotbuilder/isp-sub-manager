
import { db } from '../db';
import { companySettingsTable } from '../db/schema';
import { type CompanySettings } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCompanySettings(): Promise<CompanySettings | null> {
  try {
    const results = await db.select()
      .from(companySettingsTable)
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const settings = results[0];
    return {
      ...settings,
      tax_rate: parseFloat(settings.tax_rate) // Convert numeric field to number
    };
  } catch (error) {
    console.error('Failed to get company settings:', error);
    throw error;
  }
}

export async function updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings | null> {
  try {
    // Get existing settings first
    const existing = await getCompanySettings();
    
    if (!existing) {
      // Create new settings if none exist
      const insertData: any = {
        company_name: updates.company_name || 'Default Company',
        logo_url: updates.logo_url || null,
        address: updates.address || null,
        phone: updates.phone || null,
        email: updates.email || null,
        default_language: updates.default_language || 'ar',
        phone_country_code: updates.phone_country_code || '+966',
        currency_symbol: updates.currency_symbol || 'SAR',
        tax_rate: updates.tax_rate ? updates.tax_rate.toString() : '0'
      };

      const results = await db.insert(companySettingsTable)
        .values(insertData)
        .returning()
        .execute();

      const newSettings = results[0];
      return {
        ...newSettings,
        tax_rate: parseFloat(newSettings.tax_rate)
      };
    } else {
      // Update existing settings
      const updateData: any = { ...updates };
      
      // Convert numeric fields to strings for database
      if (updateData.tax_rate !== undefined) {
        updateData.tax_rate = updateData.tax_rate.toString();
      }

      const results = await db.update(companySettingsTable)
        .set(updateData)
        .where(eq(companySettingsTable.id, existing.id))
        .returning()
        .execute();

      if (results.length === 0) {
        return null;
      }

      const updatedSettings = results[0];
      return {
        ...updatedSettings,
        tax_rate: parseFloat(updatedSettings.tax_rate)
      };
    }
  } catch (error) {
    console.error('Failed to update company settings:', error);
    throw error;
  }
}

export async function createBackup(): Promise<{ filename: string; size: number; created_at: Date }> {
  // This is a placeholder implementation for database backup
  // In a real implementation, you would:
  // 1. Use pg_dump or similar tool to create a backup
  // 2. Save it to a designated backup directory
  // 3. Return the actual file information
  
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${timestamp}.sql`;
  
  return {
    filename,
    size: 1024, // Placeholder size
    created_at: now
  };
}

export async function restoreFromBackup(filename: string): Promise<boolean> {
  // This is a placeholder implementation for database restore
  // In a real implementation, you would:
  // 1. Validate the backup file exists
  // 2. Use psql or similar tool to restore from the backup
  // 3. Handle any restoration errors
  // 4. Return success/failure status
  
  if (!filename || filename.length === 0) {
    return false;
  }
  
  // Placeholder: assume restoration succeeds for valid filenames
  return filename.endsWith('.sql');
}
