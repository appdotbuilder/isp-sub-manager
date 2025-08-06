
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DashboardStats } from '../../../server/src/schema';
import type { NavigationPage } from '@/App';

interface DashboardProps {
  stats: DashboardStats | null;
  onNavigate: (page: NavigationPage) => void;
  onRefresh: () => void;
}

export default function Dashboard({ stats, onNavigate, onRefresh }: DashboardProps) {
  const quickActions = [
    {
      label: 'إضافة عميل جديد',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      color: 'bg-blue-600 hover:bg-blue-700',
      page: 'clients' as NavigationPage
    },
    {
      label: 'إنشاء فاتورة يدوية',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      color: 'bg-green-600 hover:bg-green-700',
      page: 'invoices' as NavigationPage
    },
    {
      label: 'إضافة دفعة جماعية',
      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      color: 'bg-purple-600 hover:bg-purple-700',
      page: 'payments' as NavigationPage
    },
    {
      label: 'إضافة مصروف',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      color: 'bg-red-600 hover:bg-red-700',
      page: 'expenses' as NavigationPage
    },
    {
      label: 'إضافة إيراد',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      page: 'income' as NavigationPage
    }
  ];

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-cairo">لوحة التحكم</h1>
            <p className="text-gray-600 font-cairo">نظرة عامة على الأعمال</p>
          </div>
          <Button onClick={onRefresh} variant="outline" className="font-cairo">
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث البيانات
          </Button>
        </div>

        {/* Loading skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'إجمالي العملاء',
      value: stats.total_clients,
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      color: 'icon-bg-blue',
      page: 'clients' as NavigationPage
    },
    {
      title: 'إيرادات الشهر الحالي',
      value: `${stats.current_month_revenues.toLocaleString('ar-EG')} ج.م`,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      color: 'icon-bg-green',
      page: 'reports' as NavigationPage
    },
    {
      title: 'عدد المدينين',
      value: stats.number_of_debtors,
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      color: 'icon-bg-red',
      page: 'clients' as NavigationPage,
      highlight: stats.number_of_debtors > 0
    },
    {
      title: 'إجمالي الديون',
      value: `${stats.total_debts.toLocaleString('ar-EG')} ج.م`,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      color: 'icon-bg-orange',
      page: 'reports' as NavigationPage,
      highlight: stats.total_debts > 0
    },
    {
      title: 'العملاء النشطين',
      value: stats.total_active_clients,
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
      color: 'icon-bg-emerald',
      page: 'clients' as NavigationPage
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-cairo">لوحة التحكم</h1>
          <p className="text-gray-600 font-cairo">نظرة عامة على الأعمال</p>
        </div>
        <Button onClick={onRefresh} variant="outline" className="font-cairo">
          <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث البيانات
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className={`stat-card cursor-pointer transition-all ${stat.highlight ? 'ring-2 ring-red-200' : ''}`}
            onClick={() => onNavigate(stat.page)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 font-cairo">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800 arabic-numbers font-cairo">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">الإجراءات السريعة</CardTitle>
          <CardDescription className="font-cairo">
            اختصارات للعمليات الأكثر استخداماً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                onClick={() => onNavigate(action.page)}
                className={`${action.color} text-white p-6 h-auto flex flex-col items-center space-y-3 font-cairo`}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                </svg>
                <span className="text-sm text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">العملاء الجدد</CardTitle>
            <CardDescription className="font-cairo">
              آخر العملاء المسجلين
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-center text-gray-500 py-4 font-cairo">
                لا توجد بيانات متاحة حالياً
              </p>
              <Button 
                variant="outline" 
                className="w-full font-cairo"
                onClick={() => onNavigate('clients')}
              >
                عرض جميع العملاء
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">الفواتير المستحقة</CardTitle>
            <CardDescription className="font-cairo">
              الفواتير التي تحتاج متابعة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-center text-gray-500 py-4 font-cairo">
                لا توجد فواتير مستحقة حالياً
              </p>
              <Button 
                variant="outline" 
                className="w-full font-cairo"
                onClick={() => onNavigate('invoices')}
              >
                عرض جميع الفواتير
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
