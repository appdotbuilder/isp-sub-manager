
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import type { Client, UserRole, FinancialReport, DebtorReportItem } from '../../../server/src/schema';
import { cn } from '@/lib/utils';

interface ReportsProps {
  clients: Client[];
  userRole: UserRole;
}

type ReportType = 'financial' | 'debtors' | 'revenue_by_package' | 'monthly_revenue';

export default function Reports({ userRole }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('financial');
  const [dateFrom, setDateFrom] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [debtorReport, setDebtorReport] = useState<DebtorReportItem[]>([]);

  const generateFinancialReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const report = await trpc.generateFinancialReport.query({
        date_from: dateFrom,
        date_to: dateTo
      });
      setFinancialReport(report);
    } catch (error) {
      console.error('Failed to generate financial report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  const generateDebtorReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const report = await trpc.generateDebtorReport.query();
      setDebtorReport(report);
    } catch (error) {
      console.error('Failed to generate debtor report:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (userRole !== 'manager' && userRole !== 'custom') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 font-cairo">غير مصرح</h3>
          <p className="mt-1 text-sm text-gray-500 font-cairo">
            ليس لديك صلاحية للوصول إلى التقارير
          </p>
        </div>
      </div>
    );
  }

  const handleGenerateReport = () => {
    if (activeReport === 'financial') {
      generateFinancialReport();
    } else if (activeReport === 'debtors') {
      generateDebtorReport();
    }
  };

  const exportToPDF = () => {
    // This would implement PDF export functionality
    console.log('Exporting to PDF...');
  };

  const exportToExcel = () => {
    // This would implement Excel export functionality
    console.log('Exporting to Excel...');
  };

  const sendWhatsAppReminders = () => {
    // This would send WhatsApp reminders to all debtors
    console.log('Sending WhatsApp reminders...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-cairo">التقارير</h1>
          <p className="text-gray-600 font-cairo">تقارير مالية ومتابعة العملاء</p>
        </div>
        
        <div className="flex space-x-2 space-x-reverse">
          <Button onClick={exportToPDF} variant="outline" className="font-cairo">
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="font-cairo">
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* Report Selection and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">إعدادات التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                نوع التقرير
              </label>
              <Select value={activeReport} onValueChange={(value: ReportType) => setActiveReport(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">التقرير المالي الشامل</SelectItem>
                  <SelectItem value="debtors">تقرير المدينين</SelectItem>
                  <SelectItem value="revenue_by_package">الإيرادات حسب الباقة</SelectItem>
                  <SelectItem value="monthly_revenue">الإيرادات الشهرية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(activeReport === 'financial' || activeReport === 'revenue_by_package') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                    من تاريخ
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal font-cairo",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        {dateFrom ? (
                          dateFrom.toLocaleDateString('ar-EG')
                        ) : (
                          <span>اختر التاريخ</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => setDateFrom(date || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                    إلى تاريخ
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal font-cairo",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        {dateTo ? (
                          dateTo.toLocaleDateString('ar-EG')
                        ) : (
                          <span>اختر التاريخ</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => setDateTo(date || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="w-full btn-primary font-cairo"
              >
                {isLoading ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Report */}
      {activeReport === 'financial' && financialReport && (
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">التقرير المالي الشامل</CardTitle>
            <p className="text-sm text-gray-600 font-cairo">
              الفترة: من {financialReport.period_start.toLocaleDateString('ar-EG')} إلى {financialReport.period_end.toLocaleDateString('ar-EG')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Revenue Section */}
              <Card className="bg-card-green">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-card-green font-cairo">الإيرادات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-cairo">إيرادات الاشتراكات:</span>
                    <span className="font-bold arabic-numbers font-cairo">
                      {financialReport.subscription_revenues.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-cairo">الإيرادات الأخرى:</span>
                    <span className="font-bold arabic-numbers font-cairo">
                      {financialReport.other_income.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                  <hr className="border-green-200" />
                  <div className="flex justify-between text-lg font-bold text-card-green">
                    <span className="font-cairo">إجمالي الإيرادات:</span>
                    <span className="arabic-numbers font-cairo">
                      {financialReport.total_revenues.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Section */}
              <Card className="bg-card-red">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-card-red font-cairo">المصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-lg font-bold text-card-red">
                    <span className="font-cairo">إجمالي المصروفات:</span>
                    <span className="arabic-numbers font-cairo">
                      {financialReport.total_expenses.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Net Profit Section */}
              <Card className={`${financialReport.net_profit >= 0 ? 'bg-card-blue' : 'bg-card-orange'}`}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-lg ${financialReport.net_profit >= 0 ? 'text-card-blue' : 'text-card-orange'} font-cairo`}>
                    صافي الربح
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`flex justify-between text-lg font-bold ${financialReport.net_profit >= 0 ? 'text-card-blue' : 'text-card-orange'}`}>
                    <span className="font-cairo">
                      {financialReport.net_profit >= 0 ? 'صافي الربح:' : 'صافي الخسارة:'}
                    </span>
                    <span className="arabic-numbers font-cairo">
                      {Math.abs(financialReport.net_profit).toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debtor Report */}
      {activeReport === 'debtors' && debtorReport.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-cairo">تقرير المدينين</CardTitle>
              <Button onClick={sendWhatsAppReminders} className="btn-warning font-cairo">
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                إرسال تذكيرات واتس اب
              </Button>
            </div>
            <p className="text-sm text-gray-600 font-cairo">
              إجمالي المدينين: {debtorReport.length} | إجمالي الديون: {debtorReport.reduce((sum, item) => sum + item.due_amount, 0).toLocaleString('ar-EG')} ج.م
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="mobile-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-cairo">اسم العميل</TableHead>
                    <TableHead className="text-right font-cairo">رقم الهاتف</TableHead>
                    <TableHead className="text-right font-cairo">المبلغ المستحق</TableHead>
                    <TableHead className="text-right font-cairo">أيام التأخير</TableHead>
                    <TableHead className="text-right font-cairo">آخر دفعة</TableHead>
                    <TableHead className="text-right font-cairo">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtorReport.map((debtor: DebtorReportItem) => (
                    <TableRow key={debtor.client_id} className="debtor-row">
                      <TableCell data-label="اسم العميل" className="font-medium font-cairo">
                        {debtor.client_name}
                      </TableCell>
                      <TableCell data-label="رقم الهاتف" className="font-cairo arabic-numbers">
                        {debtor.phone}
                      </TableCell>
                      <TableCell data-label="المبلغ المستحق" className="font-cairo arabic-numbers">
                        {debtor.due_amount.toLocaleString('ar-EG')} ج.م
                      </TableCell>
                      <TableCell data-label="أيام التأخير" className="font-cairo arabic-numbers">
                        {debtor.days_delay} يوم
                      </TableCell>
                      <TableCell data-label="آخر دفعة" className="font-cairo arabic-numbers">
                        {debtor.last_payment_date?.toLocaleDateString('ar-EG') || 'لا يوجد'}
                      </TableCell>
                      <TableCell data-label="الإجراءات">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const message = encodeURIComponent(
                              `عزيزي ${debtor.client_name}، يرجى تسوية المستحقات البالغة ${debtor.due_amount} ج.م في أسرع وقت ممكن.`
                            );
                            const whatsappUrl = `https://wa.me/2${debtor.phone.replace(/\D/g, '')}?text=${message}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                          className="font-cairo"
                        >
                          واتس اب
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {((activeReport === 'financial' && !financialReport) || (activeReport === 'debtors' && debtorReport.length === 0)) && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 font-cairo">لا توجد بيانات</h3>
            <p className="mt-1 text-sm text-gray-500 font-cairo">
              اضغط على "إنشاء التقرير" لعرض النتائج
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
