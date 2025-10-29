import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Entry } from '@/types/database';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const Entries = () => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();
  const { currentCompany } = useCompany();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'suggested' | 'confirmed' | 'rejected'>('all');

  useEffect(() => {
    if (currentCompany) {
      loadEntries();
    }
  }, [currentCompany, filter]);

  const loadEntries = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      let query = supabase
        .from('entries')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data || []) as Entry[]);
    } catch (error: any) {
      toast.error('Ошибка загрузки проводок');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (entryId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('entries')
        .update({
          status: 'confirmed',
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;
      toast.success('Проводка подтверждена');
      loadEntries();
    } catch (error: any) {
      toast.error('Ошибка подтверждения проводки');
      console.error(error);
    }
  };

  const handleReject = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('entries')
        .update({ status: 'rejected' })
        .eq('id', entryId);

      if (error) throw error;
      toast.success('Проводка отклонена');
      loadEntries();
    } catch (error: any) {
      toast.error('Ошибка отклонения проводки');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'suggested':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Ожидает
        </Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Подтверждена
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Отклонена
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const filteredStats = {
    total: entries.length,
    suggested: entries.filter(e => e.status === 'suggested').length,
    confirmed: entries.filter(e => e.status === 'confirmed').length,
    rejected: entries.filter(e => e.status === 'rejected').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {isDemoMode && <DemoBanner />}
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Проводки</h2>
            <p className="text-muted-foreground mt-1">
              Управление бухгалтерскими проводками
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('all')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredStats.total}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('suggested')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ожидают</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{filteredStats.suggested}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('confirmed')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Подтверждены</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{filteredStats.confirmed}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('rejected')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Отклонены</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{filteredStats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Entries list */}
        <Card>
          <CardHeader>
            <CardTitle>Список проводок</CardTitle>
            <CardDescription>
              {filter !== 'all' && `Фильтр: ${filter}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Нет проводок для отображения
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(entry.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <div className="font-medium">
                        Дт {entry.debit_account} → Кт {entry.credit_account}
                      </div>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(entry.amount, entry.currency)}
                        </div>
                      </div>
                      {entry.status === 'suggested' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(entry.id)}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={isDemoMode}
                          >
                            {isDemoMode ? 'Доступно после регистрации' : 'Подтвердить'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(entry.id)}
                            disabled={isDemoMode}
                          >
                            Отклонить
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Entries;