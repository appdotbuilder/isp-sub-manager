
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { Client, Invoice, Payment, Expense, Income, UserRole } from '../../../server/src/schema';
import type { NavigationPage } from '@/App';
import InvoicesTab from '@/components/accounts/InvoicesTab';
import PaymentsTab from '@/components/accounts/PaymentsTab';
import ExpensesTab from '@/components/accounts/ExpensesTab';
import IncomeTab from '@/components/accounts/IncomeTab';

interface AccountsProps {
  activeTab: 'invoices' | 'payments' | 'expenses' | 'income';
  onTabChange: (tab: NavigationPage) => void;
  clients: Client[];
  userRole: UserRole;
  onRefresh: () => void;
}

export default function Accounts({ activeTab, onTabChange, clients, userRole, onRefresh }: AccountsProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccountsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises: Promise<Invoice[] | Payment[] | Expense[] | Income[]>[] = [];

      // Load data based on user permissions
      if (userRole === 'manager' || userRole === 'collector' || userRole === 'custom') {
        promises.push(
          trpc.getInvoices.query() as Promise<Invoice[]>,
          trpc.getPayments.query() as Promise<Payment[]>
        );
      } else {
        // Add empty promises to maintain array structure
        promises.push(Promise.resolve([]), Promise.resolve([]));
      }

      if (userRole === 'manager' || userRole === 'support_technician' || userRole === 'custom') {
        promises.push(
          trpc.getExpenses.query() as Promise<Expense[]>,
          trpc.getIncomes.query() as Promise<Income[]>
        );
      } else {
        // Add empty promises to maintain array structure
        promises.push(Promise.resolve([]), Promise.resolve([]));
      }

      const [invoicesResult, paymentsResult, expensesResult, incomesResult] = await Promise.all(promises);

      if (userRole === 'manager' || userRole === 'collector' || userRole === 'custom') {
        setInvoices(invoicesResult as Invoice[]);
        setPayments(paymentsResult as Payment[]);
      }

      if (userRole === 'manager' || userRole === 'support_technician' || userRole === 'custom') {
        setExpenses(expensesResult as Expense[]);
        setIncomes(incomesResult as Income[]);
      }
    } catch (error) {
      console.error('Failed to load accounts data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    loadAccountsData();
  }, [loadAccountsData]);

  const handleRefresh = useCallback(() => {
    loadAccountsData();
    onRefresh();
  }, [loadAccountsData, onRefresh]);

  const tabTranslations = {
    invoices: 'الفواتير',
    payments: 'المدفوعات',
    expenses: 'المصروفات',
    income: 'الإيرادات الأخرى'
  };

  // Check permissions for each tab
  const canAccessInvoicesPayments = userRole === 'manager' || userRole === 'collector' || userRole === 'custom';
  const canAccessExpensesIncome = userRole === 'manager' || userRole === 'support_technician' || userRole === 'custom';

  if (!canAccessInvoicesPayments && !canAccessExpensesIncome) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 font-cairo">غير مصرح</h3>
          <p className="mt-1 text-sm text-gray-500 font-cairo">
            ليس لديك صلاحية للوصول إلى قسم الحسابات
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-cairo">الحسابات</h1>
          <p className="text-gray-600 font-cairo">
            إدارة الفواتير والمدفوعات والمصروفات والإيرادات
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {canAccessInvoicesPayments && (
          <>
            <Card className="stat-card" onClick={() => onTabChange('invoices')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 font-cairo">
                  إجمالي الفواتير
                </CardTitle>
                <div className="p-2 rounded-lg icon-bg-blue">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800 arabic-numbers font-cairo">
                  {invoices.length}
                </div>
                <p className="text-xs text-gray-500 font-cairo">
                  المعلقة: {invoices.filter((i: Invoice) => i.status === 'pending').length}
                </p>
              </CardContent>
            </Card>

            <Card className="stat-card" onClick={() => onTabChange('payments')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 font-cairo">
                  إجمالي المدفوعات
                </CardTitle>
                <div className="p-2 rounded-lg icon-bg-green">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800 arabic-numbers font-cairo">
                  {payments.reduce((sum: number, p: Payment) => sum + p.amount, 0).toLocaleString('ar-EG')} ج.م
                </div>
                <p className="text-xs text-gray-500 font-cairo">
                  عدد المدفوعات: {payments.length}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {canAccessExpensesIncome && (
          <>
            <Card className="stat-card" onClick={() => onTabChange('expenses')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 font-cairo">
                  إجمالي المصروفات
                </CardTitle>
                <div className="p-2 rounded-lg icon-bg-red">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800 arabic-numbers font-cairo">
                  {expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0).toLocaleString('ar-EG')} ج.م
                </div>
                <p className="text-xs text-gray-500 font-cairo">
                  عدد المصروفات: {expenses.length}
                </p>
              </CardContent>
            </Card>

            <Card className="stat-card" onClick={() => onTabChange('income')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 font-cairo">
                  الإيرادات الأخرى
                </CardTitle>
                <div className="p-2 rounded-lg icon-bg-yellow">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800 arabic-numbers font-cairo">
                  {incomes.reduce((sum: number, i: Income) => sum + i.amount, 0).toLocaleString('ar-EG')} ج.م
                </div>
                <p className="text-xs text-gray-500 font-cairo">
                  عدد الإيرادات: {incomes.length}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as NavigationPage)}>
        <TabsList className="grid w-full grid-cols-4">
          {canAccessInvoicesPayments && (
            <>
              <TabsTrigger value="invoices" className="font-cairo">
                {tabTranslations.invoices}
              </TabsTrigger>
              <TabsTrigger value="payments" className="font-cairo">
                {tabTranslations.payments}
              </TabsTrigger>
            </>
          )}
          {canAccessExpensesIncome && (
            <>
              <TabsTrigger value="expenses" className="font-cairo">
                {tabTranslations.expenses}
              </TabsTrigger>
              <TabsTrigger value="income" className="font-cairo">
                {tabTranslations.income}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {canAccessInvoicesPayments && (
          <>
            <TabsContent value="invoices" className="space-y-6">
              <InvoicesTab
                invoices={invoices}
                clients={clients}
                onRefresh={handleRefresh}
                userRole={userRole}
              />
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <PaymentsTab
                payments={payments}
                clients={clients}
                invoices={invoices}
                onRefresh={handleRefresh}
                userRole={userRole}
              />
            </TabsContent>
          </>
        )}

        {canAccessExpensesIncome && (
          <>
            <TabsContent value="expenses" className="space-y-6">
              <ExpensesTab
                expenses={expenses}
                onRefresh={handleRefresh}
                userRole={userRole}
              />
            </TabsContent>

            <TabsContent value="income" className="space-y-6">
              <IncomeTab
                incomes={incomes}
                onRefresh={handleRefresh}
                userRole={userRole}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="mr-2 font-cairo">جاري التحميل...</span>
        </div>
      )}
    </div>
  );
}
