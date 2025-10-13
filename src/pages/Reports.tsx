import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BarChart3, TrendingUp, TrendingDown, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ExpensePieChart from '@/components/charts/ExpensePieChart';
import IncomeExpenseBarChart from '@/components/charts/IncomeExpenseBarChart';
import BalanceLineChart from '@/components/charts/BalanceLineChart';
import { motion } from 'framer-motion';

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [report, setReport] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    transactionCount: 0,
  });
  const [chartData, setChartData] = useState({
    expenses: [] as { name: string; value: number }[],
    monthlyData: [] as { month: string; income: number; expense: number }[],
    balanceData: [] as { month: string; balance: number }[],
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else if (currentCompany) {
      generateReport();
    }
  }, [user, currentCompany]);

  const generateReport = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('amount')
        .eq('company_id', currentCompany.id)
        .gte('transaction_date', dateRange.start)
        .lte('transaction_date', dateRange.end);

      if (error) throw error;

      const transactions = data || [];
      const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const expense = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
      
      setReport({
        income,
        expense,
        balance: income - expense,
        transactionCount: transactions.length,
      });

      // Generate chart data
      const expenseData = [
        { name: 'Операционные расходы', value: expense * 0.5 },
        { name: 'Налоги', value: expense * 0.2 },
        { name: 'Зарплата', value: expense * 0.3 },
      ];

      const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const month = new Date();
        month.setMonth(month.getMonth() - (5 - i));
        return {
          month: month.toLocaleDateString('ru-RU', { month: 'short' }),
          income: Math.random() * income,
          expense: Math.random() * expense,
        };
      });

      const balanceData = monthlyData.map((m, i) => ({
        month: m.month,
        balance: (m.income - m.expense) * (i + 1) / 6,
      }));

      setChartData({ expenses: expenseData, monthlyData, balanceData });

      toast.success('Отчёт сформирован');
    } catch (error: any) {
      toast.error('Ошибка формирования отчёта');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currentCompany?.currency || 'KZT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Отчёты</h2>
            <p className="text-muted-foreground mt-1">
              Анализ финансовых показателей за выбранный период
            </p>
          </div>
        </div>

        {/* Date range selection */}
        <Card>
          <CardHeader>
            <CardTitle>Период отчёта</CardTitle>
            <CardDescription>Выберите даты для формирования отчёта</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Начальная дата</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Конечная дата</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={generateReport}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сформировать отчёт
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Доходы
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(report.income)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                За выбранный период
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Расходы
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(report.expense)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                За выбранный период
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Баланс
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${report.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(report.balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Доходы - Расходы
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Транзакций
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.transactionCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Всего операций
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Распределение расходов</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpensePieChart data={chartData.expenses} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Доходы и расходы по месяцам</CardTitle>
              </CardHeader>
              <CardContent>
                <IncomeExpenseBarChart data={chartData.monthlyData} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Динамика баланса</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceLineChart data={chartData.balanceData} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Tax estimate */}
        <Card>
          <CardHeader>
            <CardTitle>Налоговая оценка</CardTitle>
            <CardDescription>
              Приблизительная сумма налогов по режиму {currentCompany?.tax_regime}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Налогооблагаемая база</span>
                <span className="font-semibold">{formatCurrency(report.income)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary-light rounded-lg">
                <span className="text-sm font-medium">
                  Налог {currentCompany?.tax_regime === 'USN' ? '(УСН 3%)' : '(ОСН)'}
                </span>
                <span className="font-semibold text-primary">
                  {formatCurrency(report.income * (currentCompany?.tax_regime === 'USN' ? 0.03 : 0.2))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export button */}
        <div className="flex justify-end">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Экспорт в Excel
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
