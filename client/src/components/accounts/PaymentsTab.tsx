
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Payment, Client, Invoice, UserRole } from '../../../../server/src/schema';

interface PaymentsTabProps {
  payments: Payment[];
  clients: Client[];
  invoices: Invoice[];
  onRefresh: () => void;
  userRole: UserRole;
}

export default function PaymentsTab({ payments }: PaymentsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 font-cairo">المدفوعات</h2>
          <p className="text-gray-600 font-cairo">
            إجمالي المدفوعات: {payments.length}
          </p>
        </div>
        
        <Button className="btn-primary font-cairo">
          <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إضافة دفعة جماعية
        </Button>
      </div>

      <Card>
        <CardContent className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 font-cairo">قسم المدفوعات</h3>
          <p className="mt-1 text-sm text-gray-500 font-cairo">
            سيتم تطوير هذا القسم لإدارة المدفوعات والدفعات الجماعية
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
