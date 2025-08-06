
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Income, UserRole } from '../../../../server/src/schema';

interface IncomeTabProps {
  incomes: Income[];
  onRefresh: () => void;
  userRole: UserRole;
}

export default function IncomeTab({ incomes }: IncomeTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 font-cairo">الإيرادات الأخرى</h2>
          <p className="text-gray-600 font-cairo">
            إجمالي الإيرادات: {incomes.length}
          </p>
        </div>
        
        <Button className="btn-primary font-cairo">
          <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إضافة إيراد
        </Button>
      </div>

      <Card>
        <CardContent className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 font-cairo">قسم الإيرادات الأخرى</h3>
          <p className="mt-1 text-sm text-gray-500 font-cairo">
            سيتم تطوير هذا القسم لإدارة الإيرادات الأخرى مثل خدمات التوصيل وبي�� المعدات
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
