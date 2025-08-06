
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import type { Package, CreatePackageInput, BillingCycle, UserRole } from '../../../server/src/schema';

interface PackageManagementProps {
  packages: Package[];
  onRefresh: () => void;
  userRole: UserRole;
}

const billingCycleTranslations: Record<BillingCycle, string> = {
  monthly: 'شهرياً',
  quarterly: 'ربع سنوي',
  semi_annual: 'نصف سنوي',
  annual: 'سنوياً'
};

export default function PackageManagement({ packages, onRefresh, userRole }: PackageManagementProps) {
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [newPackageData, setNewPackageData] = useState<CreatePackageInput>({
    name: '',
    speed: '',
    monthly_price: 0,
    billing_cycle: 'monthly',
    days_allowed: 30,
    description: null
  });

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await trpc.createPackage.mutate(newPackageData);
      setIsAddPackageOpen(false);
      setNewPackageData({
        name: '',
        speed: '',
        monthly_price: 0,
        billing_cycle: 'monthly',
        days_allowed: 30,
        description: null
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to create package:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    
    setIsLoading(true);

    try {
      await trpc.updatePackage.mutate({
        id: selectedPackage.id,
        updates: newPackageData
      });
      setIsEditPackageOpen(false);
      setSelectedPackage(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to update package:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePackage = async (packageId: number) => {
    try {
      await trpc.deletePackage.mutate(packageId);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete package:', error);
    }
  };

  const openEditDialog = (pkg: Package) => {
    setSelectedPackage(pkg);
    setNewPackageData({
      name: pkg.name,
      speed: pkg.speed,
      monthly_price: pkg.monthly_price,
      billing_cycle: pkg.billing_cycle,
      days_allowed: pkg.days_allowed,
      description: pkg.description
    });
    setIsEditPackageOpen(true);
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
            ليس لديك صلاحية للوصول إلى إدارة الباقات
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-cairo">إدارة الباقات</h1>
          <p className="text-gray-600 font-cairo">
            إجمالي الباقات: {packages.length} | الن��طة: {packages.filter((p: Package) => p.status === 'active').length}
          </p>
        </div>
        
        <Dialog open={isAddPackageOpen} onOpenChange={setIsAddPackageOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary font-cairo">
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة باقة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-cairo">إضافة باقة جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPackage} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                    اسم الباقة *
                  </label>
                  <Input
                    value={newPackageData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPackageData((prev: CreatePackageInput) => ({ ...prev, name: e.target.value }))
                    }
                    className="text-right"
                    placeholder="مثال: باقة السرعة العالية"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                    السرعة *
                  </label>
                  <Input
                    value={newPackageData.speed}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPackageData((prev: CreatePackageInput) => ({ ...prev, speed: e.target.value }))
                    }
                    className="text-right"
                    placeholder="مثال: 100 ميجا"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                    السعر الشهري (ج.م) *
                  </label>
                  <Input
                    type="number"
                    value={newPackageData.monthly_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPackageData((prev: CreatePackageInput) => ({
                        ...prev,
                        monthly_price: parseFloat(e.target.value) || 0
                      }))
                    }
                    className="text-right"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                    دورة الفوترة *
                  </label>
                  <Select
                    value={newPackageData.billing_cycle || 'monthly'}
                    onValueChange={(value: BillingCycle) =>
                      setNewPackageData((prev: CreatePackageInput) => ({ ...prev, billing_cycle: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">شهرياً</SelectItem>
                      <SelectItem value="quarterly">ربع سنوي</SelectItem>
                      <SelectItem value="semi_annual">نصف سنوي</SelectItem>
                      <SelectItem value="annual">سنوياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                    فترة السماح (بالأيام) *
                  </label>
                  <Input
                    type="number"
                    value={newPackageData.days_allowed}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPackageData((prev: CreatePackageInput) => ({
                        ...prev,
                        days_allowed: parseInt(e.target.value) || 0
                      }))
                    }
                    className="text-right"
                    placeholder="30"
                    min="0"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                    الوصف
                  </label>
                  <Textarea
                    value={newPackageData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewPackageData((prev: CreatePackageInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    className="text-right"
                    placeholder="وصف الباقة وميزاتها..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddPackageOpen(false)}
                  className="font-cairo"
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={isLoading} className="btn-primary font-cairo">
                  {isLoading ? 'جاري الحفظ...' : 'حفظ الباقة'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">قائمة الباقات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="mobile-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right font-cairo">اسم الباقة</TableHead>
                  <TableHead className="text-right font-cairo">السرعة</TableHead>
                  <TableHead className="text-right font-cairo">السعر الشهري</TableHead>
                  <TableHead className="text-right font-cairo">دورة الفوترة</TableHead>
                  <TableHead className="text-right font-cairo">فترة السماح</TableHead>
                  <TableHead className="text-right font-cairo">الحالة</TableHead>
                  <TableHead className="text-right font-cairo">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-right font-cairo">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg: Package) => (
                  <TableRow key={pkg.id}>
                    <TableCell data-label="اسم الباقة" className="font-medium font-cairo">
                      <div>
                        <div>{pkg.name}</div>
                        {pkg.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {pkg.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-label="السرعة" className="font-cairo">
                      {pkg.speed}
                    </TableCell>
                    <TableCell data-label="السعر الشهري" className="font-cairo arabic-numbers">
                      {pkg.monthly_price.toLocaleString('ar-EG')} ج.م
                    </TableCell>
                    <TableCell data-label="دورة الفوترة" className="font-cairo">
                      {billingCycleTranslations[pkg.billing_cycle]}
                    </TableCell>
                    <TableCell data-label="فترة السماح" className="font-cairo arabic-numbers">
                      {pkg.days_allowed} يوم
                    </TableCell>
                    <TableCell data-label="الحالة">
                      <Badge
                        variant={pkg.status === 'active' ? 'default' : 'secondary'}
                        className="font-cairo"
                      >
                        {pkg.status === 'active' ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell data-label="تاريخ الإنشاء" className="font-cairo arabic-numbers">
                      {pkg.created_at.toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell data-label="الإجراءات">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(pkg)}
                          className="font-cairo"
                        >
                          تعديل
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="font-cairo"
                              disabled={pkg.status === 'active'} // Prevent deletion of active packages
                            >
                              حذف
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-cairo">
                                تأكيد الحذف
                              </AlertDialogTitle>
                              <AlertDialogDescription className="font-cairo">
                                هل أنت متأكد من حذف الباقة "{pkg.name}"؟ 
                                لا يمكن حذف الباقات المرتبطة بعملاء نشطين.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePackage(pkg.id)}
                                className="bg-red-600 hover:bg-red-700 font-cairo"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {packages.length === 0 && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 font-cairo">لا توجد باقات</h3>
              <p className="mt-1 text-sm text-gray-500 font-cairo">ابدأ بإضافة باقة جديدة</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Package Dialog */}
      <Dialog open={isEditPackageOpen} onOpenChange={setIsEditPackageOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              تعديل الباقة: {selectedPackage?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditPackage} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  اسم الباقة *
                </label>
                <Input
                  value={newPackageData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPackageData((prev: CreatePackageInput) => ({ ...prev, name: e.target.value }))
                  }
                  className="text-right"
                  placeholder="مثال: باقة السرعة العالية"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  السرعة *
                </label>
                <Input
                  value={newPackageData.speed}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPackageData((prev: CreatePackageInput) => ({ ...prev, speed: e.target.value }))
                  }
                  className="text-right"
                  placeholder="مثال: 100 ميجا"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  السعر الشهري (ج.م) *
                </label>
                <Input
                  type="number"
                  value={newPackageData.monthly_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPackageData((prev: CreatePackageInput) => ({
                      ...prev,
                      monthly_price: parseFloat(e.target.value) || 0
                    }))
                  }
                  className="text-right"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  دورة الفوترة *
                </label>
                <Select
                  value={newPackageData.billing_cycle || 'monthly'}
                  onValueChange={(value: BillingCycle) =>
                    setNewPackageData((prev: CreatePackageInput) => ({ ...prev, billing_cycle: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">شهرياً</SelectItem>
                    <SelectItem value="quarterly">ربع سنوي</SelectItem>
                    <SelectItem value="semi_annual">نصف سنوي</SelectItem>
                    <SelectItem value="annual">سنوياً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  فترة السماح (بالأيام) *
                </label>
                <Input
                  type="number"
                  value={newPackageData.days_allowed}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPackageData((prev: CreatePackageInput) => ({
                      ...prev,
                      days_allowed: parseInt(e.target.value) || 0
                    }))
                  }
                  className="text-right"
                  placeholder="30"
                  min="0"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  الوصف
                </label>
                <Textarea
                  value={newPackageData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewPackageData((prev: CreatePackageInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                  className="text-right"
                  placeholder="وصف الباقة وميزاتها..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditPackageOpen(false)}
                className="font-cairo"
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading} className="btn-primary font-cairo">
                {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
