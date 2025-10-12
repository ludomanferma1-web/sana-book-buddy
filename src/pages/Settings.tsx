import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCompany, refreshCompanies } = useCompany();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bin_iin: '',
    tax_regime: 'USN' as 'USN' | 'OSN',
    currency: 'KZT' as 'KZT' | 'USD' | 'EUR' | 'RUB',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else if (currentCompany) {
      setFormData({
        name: currentCompany.name,
        bin_iin: currentCompany.bin_iin,
        tax_regime: currentCompany.tax_regime,
        currency: currentCompany.currency,
      });
    }
  }, [user, currentCompany, navigate]);

  const handleSave = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', currentCompany.id);

      if (error) throw error;

      await refreshCompanies();
      toast.success('Настройки сохранены');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  if (!currentCompany) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Настройки</h2>
          <p className="text-muted-foreground mt-1">
            Управление настройками компании и учётной записи
          </p>
        </div>

        {/* Company settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Настройки компании</CardTitle>
            </div>
            <CardDescription>
              Обновите информацию о вашей организации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название компании</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bin_iin">БИН/ИИН</Label>
              <Input
                id="bin_iin"
                value={formData.bin_iin}
                onChange={(e) => setFormData({ ...formData, bin_iin: e.target.value })}
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_regime">Налоговый режим</Label>
              <Select
                value={formData.tax_regime}
                onValueChange={(value: 'USN' | 'OSN') => 
                  setFormData({ ...formData, tax_regime: value })
                }
              >
                <SelectTrigger id="tax_regime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USN">УСН (Упрощенная система)</SelectItem>
                  <SelectItem value="OSN">ОСН (Общая система)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Валюта учета</Label>
              <Select
                value={formData.currency}
                onValueChange={(value: any) => 
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KZT">KZT (Тенге)</SelectItem>
                  <SelectItem value="USD">USD (Доллар)</SelectItem>
                  <SelectItem value="EUR">EUR (Евро)</SelectItem>
                  <SelectItem value="RUB">RUB (Рубль)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Сохранить изменения
            </Button>
          </CardContent>
        </Card>

        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle>Учётная запись</CardTitle>
            <CardDescription>
              Информация о вашем аккаунте
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>ID пользователя</Label>
              <Input value={user?.id || ''} disabled className="font-mono text-xs" />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
