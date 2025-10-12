import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshCompanies } = useCompany();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bin_iin: '',
    tax_regime: 'USN' as 'USN' | 'OSN',
    currency: 'KZT' as 'KZT' | 'USD' | 'EUR' | 'RUB',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([formData])
        .select()
        .single();

      if (companyError) throw companyError;

      // Link user to company
      const { error: linkError } = await supabase
        .from('user_companies')
        .insert([{
          user_id: user.id,
          company_id: company.id,
          role: 'owner'
        }]);

      if (linkError) throw linkError;

      await refreshCompanies();
      toast.success('Компания успешно создана!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания компании');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Создайте компанию</CardTitle>
          </div>
          <CardDescription>
            Укажите данные вашей организации для начала работы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название компании</Label>
              <Input
                id="name"
                placeholder="ТОО Мой Бизнес"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bin_iin">БИН/ИИН</Label>
              <Input
                id="bin_iin"
                placeholder="123456789012"
                value={formData.bin_iin}
                onChange={(e) => setFormData({ ...formData, bin_iin: e.target.value })}
                required
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

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать компанию
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
