import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const { currentCompany, companies, loading: companyLoading } = useCompany();
  const [stats, setStats] = useState({
    documents: 0,
    transactions: 0,
    pendingEntries: 0,
    processedToday: 0,
  });

  // No redirect needed - demo mode allows access without auth

  useEffect(() => {
    if (!companyLoading && companies.length === 0 && user) {
      navigate('/onboarding');
    }
  }, [companies, companyLoading, user, navigate]);

  useEffect(() => {
    if (currentCompany) {
      loadStats();
    }
  }, [currentCompany]);

  const loadStats = async () => {
    if (!currentCompany) return;

    try {
      const [docsRes, transRes, entriesRes] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('company_id', currentCompany.id),
        supabase.from('bank_transactions').select('id', { count: 'exact', head: true }).eq('company_id', currentCompany.id),
        supabase.from('entries').select('id', { count: 'exact', head: true }).eq('company_id', currentCompany.id).eq('status', 'suggested'),
      ]);

      setStats({
        documents: docsRes.count || 0,
        transactions: transRes.count || 0,
        pendingEntries: entriesRes.count || 0,
        processedToday: 0, // TODO: implement
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (authLoading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentCompany) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Обзор вашего бухгалтерского учёта
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-base hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Документы
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.documents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Всего загружено
              </p>
            </CardContent>
          </Card>

          <Card className="transition-base hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Транзакции
              </CardTitle>
              <CreditCard className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.transactions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Импортировано из банка
              </p>
            </CardContent>
          </Card>

          <Card className="transition-base hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ожидают проверки
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingEntries}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Предложенных проводок
              </p>
            </CardContent>
          </Card>

          <Card className="transition-base hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Обработано сегодня
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.processedToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Подтверждённых документов
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
            <CardDescription>
              Начните работу с основными функциями Sana
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/documents')}
            >
              <Upload className="h-6 w-6 text-primary" />
              <span className="font-semibold">Загрузить документы</span>
              <span className="text-xs text-muted-foreground">
                Чеки, счета, договоры
              </span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/transactions')}
            >
              <CreditCard className="h-6 w-6 text-secondary" />
              <span className="font-semibold">Импорт банковских выписок</span>
              <span className="text-xs text-muted-foreground">
                CSV файлы из банка
              </span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/assistant')}
            >
              <AlertCircle className="h-6 w-6 text-warning" />
              <span className="font-semibold">Задать вопрос</span>
              <span className="text-xs text-muted-foreground">
                AI-помощник по учёту
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
