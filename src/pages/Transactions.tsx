import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BankTransaction } from '@/types/database';
import { toast } from 'sonner';

const Transactions = () => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();
  const { currentCompany } = useCompany();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      loadTransactions();
    }
  }, [currentCompany]);

  const loadTransactions = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as BankTransaction[]);
    } catch (error: any) {
      toast.error('Ошибка загрузки транзакций');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentCompany || !user) return;

    const file = e.target.files[0];
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header
      const dataLines = lines.slice(1);
      
      const transactions = dataLines.map(line => {
        const [date, description, amount, currency] = line.split(',').map(s => s.trim());
        return {
          company_id: currentCompany.id,
          imported_by: user.id,
          transaction_date: date,
          description,
          amount: parseFloat(amount),
          currency: currency || 'KZT',
        };
      }).filter(t => t.transaction_date && t.amount);

      if (transactions.length === 0) {
        throw new Error('Не найдены валидные транзакции в CSV файле');
      }

      const { error } = await supabase
        .from('bank_transactions')
        .insert(transactions);

      if (error) throw error;

      toast.success(`Импортировано ${transactions.length} транзакций`);
      loadTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка импорта CSV');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {isDemoMode && <DemoBanner />}
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Банковские транзакции</h2>
            <p className="text-muted-foreground mt-1">
              Импортируйте выписки из банка для автоматического сопоставления
            </p>
          </div>
        </div>

        {/* Import area */}
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Импорт банковской выписки</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Формат CSV: дата, описание, сумма, валюта
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              disabled={importing}
              className="hidden"
              id="csv-import"
            />
            <Button
              onClick={() => document.getElementById('csv-import')?.click()}
              disabled={importing || isDemoMode}
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDemoMode ? 'Доступно после регистрации' : 'Выбрать CSV файл'}
            </Button>
          </CardContent>
        </Card>

        {/* Transactions list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Upload className="h-12 w-12 mb-4" />
                <p>Импортируйте банковскую выписку для начала работы</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>История транзакций</CardTitle>
                <CardDescription>Всего: {transactions.length} транзакций</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg border transition-base hover:shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.is_matched && (
                            <Badge variant="outline" className="text-success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Сопоставлен
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
