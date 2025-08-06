
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, UserRole } from '../../../server/src/schema';

interface SettingsProps {
  currentUser: User;
  userRole: UserRole;
  onUserUpdate: (user: User) => void;
}

export default function Settings({ currentUser, userRole, onUserUpdate }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const [newUserData, setNewUserData] = useState<CreateUserInput>({
    username: '',
    email: '',
    password: '',
    role: 'collector',
    is_active: true
  });

  const [companyData, setCompanyData] = useState({
    company_name: '',
    logo_url: null as string | null,
    address: null as string | null,
    phone: null as string | null,
    email: null as string | null,
    default_language: 'ar',
    phone_country_code: '+20',
    currency_symbol: 'ج.م',
    tax_rate: 0
  });

  useEffect(() => {
    if (userRole === 'manager') {
      loadSettings();
    }
  }, [userRole]);

  const loadSettings = async () => {
    try {
      const settingsResult = await trpc.getCompanySettings.query();
      
      if (settingsResult) {
        setCompanyData({
          company_name: settingsResult.company_name,
          logo_url: settingsResult.logo_url,
          address: settingsResult.address,
          phone: settingsResult.phone,
          email: settingsResult.email,
          default_language: settingsResult.default_language,
          phone_country_code: settingsResult.phone_country_code,
          currency_symbol: settingsResult.currency_symbol,
          tax_rate: settingsResult.tax_rate
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleUpdateCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await trpc.updateCompanySettings.mutate(companyData);
      await loadSettings();
    } catch (error) {
      console.error('Failed to update company settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newUser = await trpc.createUser.mutate(newUserData);
      // If the created user is the current user, update the current user state
      if (newUser.id === currentUser.id) {
        onUserUpdate(newUser);
      }
      setIsAddUserOpen(false);
      setNewUserData({
        username: '',
        email: '',
        password: '',
        role: 'collector',
        is_active: true
      });
      // Reload users list would go here
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      await trpc.createBackup.mutate();
      // Show success message
    } catch (error) {
      console.error('Failed to create backup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (userRole !== 'manager' && userRole !== 'custom') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 font-cairo">غير مصرح</h3>
          <p className="mt-1 text-sm text-gray-500 font-cairo">
            ليس لديك صلاحية للوصول إلى الإعدادات
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-cairo">الإعدادات</h1>
          <p className="text-gray-600 font-cairo">إعدادات النظام والشركة</p>
          <p className="text-sm text-gray-500 font-cairo">
            مرحباً {currentUser.username}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="font-cairo">الإعدادات العامة</TabsTrigger>
          <TabsTrigger value="users" className="font-cairo">إدارة المستخدمين</TabsTrigger>
          <TabsTrigger value="backup" className="font-cairo">النسخ الاحتياطي</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo">معلومات الشركة</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateCompanySettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      اسم الشركة *
                    </label>
                    <Input
                      value={companyData.company_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCompanyData(prev => ({ ...prev, company_name: e.target.value }))
                      }
                      className="text-right"
                      placeholder="اسم الشركة"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      رابط الشعار
                    </label>
                    <Input
                      value={companyData.logo_url || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCompanyData(prev => ({ ...prev, logo_url: e.target.value || null }))
                      }
                      className="text-right"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      عنوان الشركة
                    </label>
                    <Textarea
                      value={companyData.address || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCompanyData(prev => ({ ...prev, address: e.target.value || null }))
                      }
                      className="text-right"
                      placeholder="العنوان الكامل للشركة"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      رقم الهاتف
                    </label>
                    <Input
                      value={companyData.phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCompanyData(prev => ({ ...prev, phone: e.target.value || null }))
                      }
                      className="text-right"
                      placeholder="رقم هاتف الشركة"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      البريد الإلكتروني
                    </label>
                    <Input
                      type="email"
                      value={companyData.email || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCompanyData(prev => ({ ...prev, email: e.target.value || null }))
                      }
                      className="text-right"
                      placeholder="info@company.com"
                    />
                  </div>

                

                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      اللغة الافتراضية
                    </label>
                    <Select
                      value={companyData.default_language || 'ar'}
                      onValueChange={(value) =>
                        setCompanyData(prev => ({ ...prev, default_language: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      كود الدولة للهاتف
                    </label>
                    <Input
                      value={companyData.phone_country_code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCompanyData(prev => ({ ...prev, phone_country_code: e.target.value }))
                      }
                      className="text-right"
                      placeholder="+20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      رمز العملة
                    </label>
                    <Input
                      value={companyData.currency_symbol}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCompanyData(prev => ({ ...prev, currency_symbol: e.target.value }))
                      }
                      className="text-right"
                      placeholder="ج.م"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      معدل الضريبة (%)
                    </label>
                    <Input
                      type="number"
                      value={companyData.tax_rate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCompanyData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))
                      }
                      className="text-right"
                      placeholder="14"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isLoading} className="btn-primary font-cairo">
                    {isLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-cairo">إدارة المستخدمين</CardTitle>
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button className="btn-primary font-cairo">
                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      إضافة مستخدم جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-cairo">إضافة مستخدم جديد</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                          اسم المستخدم *
                        </label>
                        <Input
                          value={newUserData.username}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewUserData(prev => ({ ...prev, username: e.target.value }))
                          }
                          className="text-right"
                          placeholder="اسم المستخدم"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                          البريد الإلكتروني *
                        </label>
                        <Input
                          type="email"
                          value={newUserData.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewUserData(prev => ({ ...prev, email: e.target.value }))
                          }
                          className="text-right"
                          placeholder="email@example.com"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                          كلمة المرور *
                        </label>
                        <Input
                          type="password"
                          value={newUserData.password}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewUserData(prev => ({ ...prev, password: e.target.value }))
                          }
                          className="text-right"
                          placeholder="كلمة المرور"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                          الدور *
                        </label>
                        <Select
                          value={newUserData.role || 'collector'}
                          onValueChange={(value: UserRole) =>
                            setNewUserData(prev => ({ ...prev, role: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">مدير</SelectItem>
                            <SelectItem value="collector">محصل</SelectItem>
                            <SelectItem value="support_technician">فني دعم</SelectItem>
                            <SelectItem value="custom">مخصص</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddUserOpen(false)}
                          className="font-cairo"
                        >
                          إلغاء
                        </Button>
                        <Button type="submit" disabled={isLoading} className="btn-primary font-cairo">
                          {isLoading ? 'جاري الإضافة...' : 'إضافة المستخدم'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500 font-cairo">
                  قائمة المستخدمين ستظهر هنا بعد تنفيذ واجهة إدارة المستخدمين
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo">النسخ الاحتياطي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-cairo">إنشاء نسخة احتياطية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 font-cairo">
                      إنشاء نسخة احتياطية من جميع بيانات النظام
                    </p>
                    <Button
                      onClick={handleCreateBackup}
                      disabled={isLoading}
                      className="w-full btn-primary font-cairo"
                    >
                      {isLoading ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-cairo">استرداد النسخة الاحتياطية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 font-cairo">
                      استرداد البيانات من نسخة احتياطية سابقة
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full font-cairo">
                          استرداد من نسخة احتياطية
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-cairo">تأكيد الاسترداد</AlertDialogTitle>
                          <AlertDialogDescription className="font-cairo">
                            تحذير: سيتم استبدال جميع البيانات الحالية بالنسخة الاحتياطية. 
                            لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700 font-cairo">
                            تأكيد الاسترداد
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>

              {/* Backup Schedule Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-cairo">جدولة النسخ الاحتياطي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-cairo">النسخ التلقائي اليومي:</span>
                      <Badge className="bg-green-100 text-green-800 font-cairo">مفعل</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-cairo">آخر نسخة احتياطية:</span>
                      <span className="text-sm text-gray-600 font-cairo arabic-numbers">
                        {new Date().toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-cairo">الوقت المحدد:</span>
                      <span className="text-sm text-gray-600 font-cairo arabic-numbers">02:00 ص</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
