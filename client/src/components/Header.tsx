
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { User } from '../../../server/src/schema';
import type { NavigationPage } from '@/App';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  currentPage: NavigationPage;
}

const pageTranslations: Record<NavigationPage, string> = {
  dashboard: 'لوحة التحكم',
  clients: 'إدارة العملاء',
  packages: 'إدارة الباقات',
  invoices: 'الفواتير',
  payments: 'المدفوعات',
  expenses: 'المصروفات',
  income: 'الإيرادات الأخرى',
  reports: 'التقارير',
  settings: 'الإعدادات'
};

const roleTranslations: Record<string, string> = {
  manager: 'مدير',
  collector: 'محصل',
  support_technician: 'فني دعم',
  custom: 'مخصص'
};

export default function Header({ user, onLogout, currentPage }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 font-cairo">
            {pageTranslations[currentPage]}
          </h2>
          <p className="text-sm text-gray-500 font-cairo">
            {new Date().toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="flex items-center space-x-4 space-x-reverse">
          {/* Quick Actions */}
          <div className="hidden md:flex items-center space-x-3 space-x-reverse">
            <Button
              size="sm"
              variant="outline"
              className="font-cairo"
            >
              إضافة عميل جديد
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="font-cairo"
            >
              فاتورة يدوية
            </Button>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-600 text-white font-cairo">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start space-x-2 space-x-reverse p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white font-cairo">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium font-cairo">{user.username}</p>
                  <p className="text-xs text-muted-foreground font-cairo">
                    {roleTranslations[user.role]}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="font-cairo">
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                الملف الشخصي
              </DropdownMenuItem>
              <DropdownMenuItem className="font-cairo">
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                الإعدادات
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="font-cairo text-red-600 focus:text-red-600"
                onClick={onLogout}
              >
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
