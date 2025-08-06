
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { User, LoginInput } from '../../../server/src/schema';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loginData, setLoginData] = useState<LoginInput>({
    username: '',
    password: ''
  });
  const [language, setLanguage] = useState('ar');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await trpc.login.mutate(loginData);
      if (result && result.user) {
        onLogin(result.user);
      } else {
        setError('خطأ في اسم المستخدم أو كلمة المرور');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('خطأ في اسم المستخدم أو كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800 font-cairo">
            نظام إدارة الاشتراكات
          </CardTitle>
          <CardDescription className="font-cairo">
            مقدمي خدمات الإنترنت
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 font-cairo">
                اللغة
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 font-cairo">
                اسم المستخدم
              </label>
              <Input
                type="text"
                value={loginData.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLoginData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
                }
                className="text-right"
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 font-cairo">
                كلمة المرور
              </label>
              <Input
                type="password"
                value={loginData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                }
                className="text-right"
                placeholder="أدخل كلمة المرور"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-cairo">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full btn-primary font-cairo"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري تسجيل الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 font-cairo">
            <p>الأدوار المتاحة:</p>
            <div className="mt-2 space-y-1">
              <p><span className="font-medium">مدير:</span> صلاحية كاملة</p>
              <p><span className="font-medium">محصل:</span> الحسابات والمدفوعات</p>
              <p><span className="font-medium">فني دعم:</span> التذاكر والمصروفات/الإيرادات</p>
              <p><span className="font-medium">مخصص:</span> صلاحيات قابلة للتخصيص</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
