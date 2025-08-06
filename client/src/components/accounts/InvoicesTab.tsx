
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trpc } from '@/utils/trpc';
import type { Invoice, Client, CreateInvoiceInput, UserRole } from '../../../../server/src/schema';
import { cn } from '@/lib/utils';

interface InvoicesTabProps {
  invoices: Invoice[];
  clients: Client[];
  onRefresh: () => void;
  userRole: UserRole;
}

const statusTranslations = {
  pending: 'معلقة',
  paid: 'مدفوعة',
  overdue: 'متأخرة',
  cancelled: 'ملغاة'
};

export default function InvoicesTab({ invoices, clients, onRefresh }: InvoicesTabProps) {
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [newInvoiceData, setNewInvoiceData] = useState<CreateInvoiceInput>({
    client_id: 0,
    amount: 0,
    details: null,
    due_date: new Date(),
    is_manual: true
  });

  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesClient = clientFilter === 'all' || invoice.client_id.toString() === clientFilter;
    const matchesDateFrom = !dateFrom || invoice.created_at >= dateFrom;
    const matchesDateTo = !dateTo || invoice.created_at <= dateTo;

    return matchesStatus && matchesClient && matchesDateFrom && matchesDateTo;
  });

  const getClientName = (clientId: number) => {
    const client = clients.find((c: Client) => c.id === clientId);
    return client ? client.name : 'غير محدد';
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await trpc.createInvoice.mutate(newInvoiceData);
      setIsCreateInvoiceOpen(false);
      setNewInvoiceData({
        client_id: 0,
        amount: 0,
        details: null,
        due_date: new Date(),
        is_manual: true
      });
      setSelectedClient(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to create invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (invoiceId: number, status: 'pending' | 'paid' | 'overdue' | 'cancelled') => {
    try {
      await trpc.updateInvoiceStatus.mutate({ id: invoiceId, status });
      onRefresh();
    } catch (error) {
      console.error('Failed to update invoice status:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    try {
      await trpc.deleteInvoice.mutate(invoiceId);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const generateMonthlyInvoices = async () => {
    setIsLoading(true);
    try {
      await trpc.generateMonthlyInvoices.mutate();
      onRefresh();
    } catch (error) {
      console.error('Failed to generate monthly invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendWhatsAppInvoice = (invoice: Invoice) => {
    const client = clients.find((c: Client) => c.id === invoice.client_id);
    if (!client) return;

    const message = encodeURIComponent(
      `عزيزي ${client.name}، فاتورتك رقم ${invoice.id} بمبلغ ${invoice.amount} ج.م مستحقة بتاريخ ${invoice.due_date.toLocaleDateString('ar-EG')}. يرجى التواصل معنا لتسوية المستحقات.`
    );
    const whatsappUrl = `https://wa.me/2${client.phone.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 font-cairo">الفواتير</h2>
          <p className="text-gray-600 font-cairo">
            إجمالي الفواتير: {invoices.length} | المعلقة: {invoices.filter((i: Invoice) => i.status === 'pending').length}
          </p>
        </div>
        
        <div className="flex space-x-2 space-x-reverse">
          <Button
            onClick={generateMonthlyInvoices}
            disabled={isLoading}
            className="btn-success font-cairo"
          >
            {isLoading ? 'جاري الإنشاء...' : 'إنشاء فواتير شهرية'}
          </Button>
          
          <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary font-cairo">
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إنشاء فاتورة يدوية
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-cairo">إنشاء فاتورة يدوية</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      البحث عن العميل *
                    </label>
                    <Select
                      value={newInvoiceData.client_id?.toString() || ''}
                      onValueChange={(value) => {
                        const clientId = parseInt(value);
                        setNewInvoiceData((prev: CreateInvoiceInput) => ({ ...prev, client_id: clientId }));
                        setSelectedClient(clients.find((c: Client) => c.id === clientId) || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العميل" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client: Client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name} - {client.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedClient && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 font-cairo">معلومات العميل</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div className="font-cairo">الاسم: {selectedClient.name}</div>
                        <div className="font-cairo">الهاتف: {selectedClient.phone}</div>
                        <div className="font-cairo">حالة الخدمة: {selectedClient.service_status === 'active' ? 'نشط' : 'غير نشط'}</div>
                        <div className="font-cairo">حالة السداد: {selectedClient.payment_status === 'paid' ? 'مدفوع' : 'مدين'}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      المبلغ (ج.م) *
                    </label>
                    <Input
                      type="number"
                      value={newInvoiceData.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewInvoiceData((prev: CreateInvoiceInput) => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0
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
                      تاريخ الاستحقاق *
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-right font-normal font-cairo",
                            !newInvoiceData.due_date && "text-muted-foreground"
                          )}
                        >
                          {newInvoiceData.due_date ? (
                            newInvoiceData.due_date.toLocaleDateString('ar-EG')
                          ) : (
                            <span>اختر التاريخ</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newInvoiceData.due_date}
                          onSelect={(date) =>
                            setNewInvoiceData((prev: CreateInvoiceInput) => ({ ...prev, due_date: date || new Date() }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                      تفاصيل الفاتورة
                    </label>
                    <Textarea
                      value={newInvoiceData.details || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setNewInvoiceData((prev: CreateInvoiceInput) => ({
                          ...prev,
                          details: e.target.value || null
                        }))
                      }
                      className="text-right"
                      placeholder="تفاصيل إضافية للفاتورة..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateInvoiceOpen(false)}
                    className="font-cairo"
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={isLoading} className="btn-primary font-cairo">
                    {isLoading ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="حالة الفاتورة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">معلقة</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger>
                <SelectValue placeholder="العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع العملاء</SelectItem>
                {clients.map((client: Client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="font-cairo">
                  {dateFrom ? dateFrom.toLocaleDateString('ar-EG') : 'من تاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="font-cairo">
                  {dateTo ? dateTo.toLocaleDateString('ar-EG') : 'إلى تاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">
            قائمة الفواتير ({filteredInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="mobile-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right font-cairo">رقم الفاتورة</TableHead>
                  <TableHead className="text-right font-cairo">العميل</TableHead>
                  <TableHead className="text-right font-cairo">المبلغ</TableHead>
                  <TableHead className="text-right font-cairo">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-right font-cairo">تاريخ الاستحقاق</TableHead>
                  <TableHead className="text-right font-cairo">الحالة</TableHead>
                  <TableHead className="text-right font-cairo">نوع الفاتورة</TableHead>
                  <TableHead className="text-right font-cairo">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice: Invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell data-label="رقم الفاتورة" className="font-medium font-cairo arabic-numbers">
                      #{invoice.id}
                    </TableCell>
                    <TableCell data-label="العميل" className="font-cairo">
                      {getClientName(invoice.client_id)}
                    </TableCell>
                    <TableCell data-label="المبلغ" className="font-cairo arabic-numbers">
                      {invoice.amount.toLocaleString('ar-EG')} ج.م
                    </TableCell>
                    <TableCell data-label="تاريخ الإنشاء" className="font-cairo arabic-numbers">
                      {invoice.created_at.toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell data-label="تاريخ الاستحقاق" className="font-cairo arabic-numbers">
                      {invoice.due_date.toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell data-label="الحالة">
                      <Badge
                        variant={
                          invoice.status === 'paid' ? 'default' :
                          invoice.status === 'overdue' ? 'destructive' :
                          invoice.status === 'cancelled' ? 'secondary' : 'outline'
                        }
                        className="font-cairo"
                      >
                        {statusTranslations[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell data-label="نوع الفاتورة">
                      <Badge variant={invoice.is_manual ? 'outline' : 'default'} className="font-cairo">
                        {invoice.is_manual ? 'يدوية' : 'تلقائية'}
                      </Badge>
                    </TableCell>
                    <TableCell data-label="الإجراءات">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendWhatsAppInvoice(invoice)}
                          className="font-cairo"
                        >
                          واتس اب
                        </Button>
                        
                        <Select
                          value={invoice.status}
                          onValueChange={(value: 'pending' | 'paid' | 'overdue' | 'cancelled') =>
                            handleUpdateStatus(invoice.id, value)
                          }
                        >
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">معلقة</SelectItem>
                            <SelectItem value="paid">مدفوعة</SelectItem>
                            <SelectItem value="overdue">متأخرة</SelectItem>
                            <SelectItem value="cancelled">ملغاة</SelectItem>
                          </SelectContent>
                        </Select>
                        
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
                                هل أنت متأكد من حذف الفاتورة #{invoice.id}؟ 
                                لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteInvoice(invoice.id)}
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
          
          {filteredInvoices.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 font-cairo">لا توجد فواتير تطابق المعايير المحددة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
