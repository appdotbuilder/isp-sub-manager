
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import type { Client, Package, CreateClientInput, UserRole } from '../../../server/src/schema';
import { cn } from '@/lib/utils';

interface ClientManagementProps {
  clients: Client[];
  packages: Package[];
  onRefresh: () => void;
  userRole: UserRole;
}

export default function ClientManagement({ clients, packages, onRefresh, userRole }: ClientManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [newClientData, setNewClientData] = useState<CreateClientInput>({
    name: '',
    phone: '',
    address: null,
    package_id: 0,
    service_status: 'active',
    payment_status: 'paid',
    indebtedness_prefix: null,
    balance_creditor: 0,
    notes: null
  });

  // Filter clients based on search and filters
  const filteredClients = clients.filter((client: Client) => {
    const matchesSearch = !searchTerm || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || client.service_status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || client.payment_status === paymentFilter;
    const matchesPackage = packageFilter === 'all' || client.package_id.toString() === packageFilter;

    return matchesSearch && matchesStatus && matchesPayment && matchesPackage;
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await trpc.createClient.mutate(newClientData);
      setIsAddClientOpen(false);
      setNewClientData({
        name: '',
        phone: '',
        address: null,
        package_id: 0,
        service_status: 'active',
        payment_status: 'paid',
        indebtedness_prefix: null,
        balance_creditor: 0,
        notes: null
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to create client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    setIsLoading(true);

    try {
      await trpc.updateClient.mutate({
        id: selectedClient.id,
        updates: newClientData
      });
      setIsEditClientOpen(false);
      setSelectedClient(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to update client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    try {
      await trpc.deleteClient.mutate(clientId);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const openEditDialog = (client: Client) => {
    setSelectedClient(client);
    setNewClientData({
      name: client.name,
      phone: client.phone,
      address: client.address,
      package_id: client.package_id,
      service_status: client.service_status,
      payment_status: client.payment_status,
      indebtedness_prefix: client.indebtedness_prefix,
      balance_creditor: client.balance_creditor,
      notes: client.notes
    });
    setIsEditClientOpen(true);
  };

  const getPackageName = (packageId: number) => {
    const pkg = packages.find((p: Package) => p.id === packageId);
    return pkg ? pkg.name : 'غير محدد';
  };

  const sendWhatsAppMessage = (client: Client) => {
    const message = encodeURIComponent(
      `مرحباً ${client.name}، نذكركم بموعد استحقاق الفاتورة. يرجى التواصل معنا لتسوية المستحقات.`
    );
    const whatsappUrl = `https://wa.me/2${client.phone.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-cairo">إدارة العملاء</h1>
          <p className="text-gray-600 font-cairo">
            إجمالي العملاء: {clients.length} | النشطين: {clients.filter((c: Client) => c.service_status === 'active').length}
          </p>
        </div>
        
        {(userRole === 'manager' || userRole === 'collector') && (
          <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary font-cairo">
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إضافة عميل جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-cairo">إضافة عميل جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      الاسم *
                    </label>
                    <Input
                      value={newClientData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewClientData((prev: CreateClientInput) => ({ ...prev, name: e.target.value }))
                      }
                      className="text-right"
                      placeholder="اسم العميل"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      رقم الهاتف *
                    </label>
                    <Input
                      value={newClientData.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewClientData((prev: CreateClientInput) => ({ ...prev, phone: e.target.value }))
                      }
                      className="text-right"
                      placeholder="رقم الهاتف"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      العنوان
                    </label>
                    <Input
                      value={newClientData.address || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewClientData((prev: CreateClientInput) => ({
                          ...prev,
                          address: e.target.value || null
                        }))
                      }
                      className="text-right"
                      placeholder="عنوان العميل"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      الباقة *
                    </label>
                    <Select
                      value={newClientData.package_id > 0 ? newClientData.package_id.toString() : ''}
                      onValueChange={(value) =>
                        setNewClientData((prev: CreateClientInput) => ({ ...prev, package_id: parseInt(value) || 0 }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الباقة" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.filter((pkg: Package) => pkg.status === 'active').map((pkg: Package) => (
                          <SelectItem key={pkg.id} value={pkg.id.toString()}>
                            {pkg.name} - {pkg.monthly_price} ج.م
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      حالة الخدمة
                    </label>
                    <Select
                      value={newClientData.service_status || 'active'}
                      onValueChange={(value: 'active' | 'inactive') =>
                        setNewClientData((prev: CreateClientInput) => ({ ...prev, service_status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="inactive">غير نشط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      حالة السداد
                    </label>
                    <Select
                      value={newClientData.payment_status || 'paid'}
                      onValueChange={(value: 'paid' | 'debted') =>
                        setNewClientData((prev: CreateClientInput) => ({ ...prev, payment_status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">مدفوع</SelectItem>
                        <SelectItem value="debted">مدين</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      الرصيد الدائن
                    </label>
                    <Input
                      type="number"
                      value={newClientData.balance_creditor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewClientData((prev: CreateClientInput) => ({
                          ...prev,
                          balance_creditor: parseFloat(e.target.value) || 0
                        }))
                      }
                      className="text-right"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      ملاحظات
                    </label>
                    <Input
                      value={newClientData.notes || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewClientData((prev: CreateClientInput) => ({
                          ...prev,
                          notes: e.target.value || null
                        }))
                      }
                      className="text-right"
                      placeholder="ملاحظات إضافية"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddClientOpen(false)}
                    className="font-cairo"
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={isLoading} className="btn-primary font-cairo">
                    {isLoading ? 'جاري الحفظ...' : 'حفظ العميل'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Input
                placeholder="البحث بالاسم أو الهاتف..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="text-right"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="حالة الخدمة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="حالة السداد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="debted">مدين</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الباقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الباقات</SelectItem>
                {packages.map((pkg: Package) => (
                  <SelectItem key={pkg.id} value={pkg.id.toString()}>
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={onRefresh} className="font-cairo">
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">
            قائمة العملاء ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="mobile-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right font-cairo">الاسم</TableHead>
                  <TableHead className="text-right font-cairo">الهاتف</TableHead>
                  <TableHead className="text-right font-cairo">الباقة</TableHead>
                  <TableHead className="text-right font-cairo">تاريخ انتهاء الاشتراك</TableHead>
                  <TableHead className="text-right font-cairo">المبلغ المستحق</TableHead>
                  <TableHead className="text-right font-cairo">آخر تحديث</TableHead>
                  <TableHead className="text-right font-cairo">حالة الخدمة</TableHead>
                  <TableHead className="text-right font-cairo">حالة السداد</TableHead>
                  <TableHead className="text-right font-cairo">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client: Client) => (
                  <TableRow
                    key={client.id}
                    className={cn(
                      client.payment_status === 'debted' && 'debtor-row'
                    )}
                  >
                    <TableCell data-label="الاسم" className="font-medium font-cairo">
                      {client.name}
                    </TableCell>
                    <TableCell data-label="الهاتف" className="font-cairo arabic-numbers">
                      {client.phone}
                    </TableCell>
                    <TableCell data-label="الباقة" className="font-cairo">
                      {getPackageName(client.package_id)}
                    </TableCell>
                    <TableCell data-label="تاريخ انتهاء الاشتراك" className="font-cairo arabic-numbers">
                      {client.subscription_end_date.toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell data-label="المبلغ المستحق" className="font-cairo arabic-numbers">
                      {/* Note: This would need to be calculated from the actual due amount */}
                      0.00 ج.م
                    </TableCell>
                    <TableCell data-label="آخر تحديث" className="font-cairo arabic-numbers">
                      {client.last_push_date?.toLocaleDateString('ar-EG') || 'لا يوجد'}
                    </TableCell>
                    <TableCell data-label="حالة الخدمة">
                      <Badge
                        variant={client.service_status === 'active' ? 'default' : 'secondary'}
                        className="font-cairo"
                      >
                        {client.service_status === 'active' ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell data-label="حالة السداد">
                      <Badge
                        variant={client.payment_status === 'paid' ? 'default' : 'destructive'}
                        className="font-cairo"
                      >
                        {client.payment_status === 'paid' ? 'مدفوع' : 'مدين'}
                      </Badge>
                    </TableCell>
                    <TableCell data-label="الإجراءات">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendWhatsAppMessage(client)}
                          className="font-cairo"
                        >
                          واتس اب
                        </Button>
                        
                        {(userRole === 'manager' || userRole === 'collector') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(client)}
                              className="font-cairo"
                            >
                              تعديل
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="font-cairo">
                                  حذف
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-cairo">
                                    تأكيد الحذف
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="font-cairo">
                                    هل أنت متأكد من حذف العميل "{client.name}"؟ 
                                    لا يمكن التراجع عن هذا الإجراء.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="bg-red-600 hover:bg-red-700 font-cairo"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredClients.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 font-cairo">لا توجد نتائج تطابق البحث</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              تعديل بيانات العميل: {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditClient} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  الاسم *
                </label>
                <Input
                  value={newClientData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewClientData((prev: CreateClientInput) => ({ ...prev, name: e.target.value }))
                  }
                  className="text-right"
                  placeholder="اسم العميل"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  رقم الهاتف *
                </label>
                <Input
                  value={newClientData.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewClientData((prev: CreateClientInput) => ({ ...prev, phone: e.target.value }))
                  }
                  className="text-right"
                  placeholder="رقم الهاتف"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  العنوان
                </label>
                <Input
                  value={newClientData.address || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewClientData((prev: CreateClientInput) => ({
                      ...prev,
                      address: e.target.value || null
                    }))
                  }
                  className="text-right"
                  placeholder="عنوان العميل"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  الباقة *
                </label>
                <Select
                  value={newClientData.package_id > 0 ? newClientData.package_id.toString() : ''}
                  onValueChange={(value) =>
                    setNewClientData((prev: CreateClientInput) => ({ ...prev, package_id: parseInt(value) || 0 }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الباقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.filter((pkg: Package) => pkg.status === 'active').map((pkg: Package) => (
                      <SelectItem key={pkg.id} value={pkg.id.toString()}>
                        {pkg.name} - {pkg.monthly_price} ج.م
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  حالة الخدمة
                </label>
                <Select
                  value={newClientData.service_status || 'active'}
                  onValueChange={(value: 'active' | 'inactive') =>
                    setNewClientData((prev: CreateClientInput) => ({ ...prev, service_status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  حالة السداد
                </label>
                <Select
                  value={newClientData.payment_status || 'paid'}
                  onValueChange={(value: 'paid' | 'debted') =>
                    setNewClientData((prev: CreateClientInput) => ({ ...prev, payment_status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="debted">مدين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  الرصيد الدائن
                </label>
                <Input
                  type="number"
                  value={newClientData.balance_creditor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewClientData((prev: CreateClientInput) => ({
                      ...prev,
                      balance_creditor: parseFloat(e.target.value) || 0
                    }))
                  }
                  className="text-right"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                  ملاحظات
                </label>
                <Input
                  value={newClientData.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewClientData((prev: CreateClientInput) => ({
                      ...prev,
                      notes: e.target.value || null
                    }))
                  }
                  className="text-right"
                  placeholder="ملاحظات إضافية"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditClientOpen(false)}
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
