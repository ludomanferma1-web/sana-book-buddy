import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Company } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

type CompanyContextType = {
  currentCompany: Company | null;
  companies: Company[];
  loading: boolean;
  setCurrentCompany: (company: Company | null) => void;
  refreshCompanies: () => Promise<void>;
};

const CompanyContext = createContext<CompanyContextType>({
  currentCompany: null,
  companies: [],
  loading: true,
  setCurrentCompany: () => {},
  refreshCompanies: async () => {},
});

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};

const DEMO_COMPANY: Company = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Demo Компания',
  bin_iin: '000000000000',
  tax_regime: 'USN',
  currency: 'KZT',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { user, isDemoMode } = useAuth();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCompanies = async () => {
    if (isDemoMode) {
      setCompanies([DEMO_COMPANY]);
      setCurrentCompany(DEMO_COMPANY);
      setLoading(false);
      return;
    }

    if (!user) {
      setCompanies([]);
      setCurrentCompany(null);
      setLoading(false);
      return;
    }

    try {
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id);

      if (ucError) throw ucError;

      if (!userCompanies || userCompanies.length === 0) {
        setCompanies([]);
        setCurrentCompany(null);
        setLoading(false);
        return;
      }

      const companyIds = userCompanies.map(uc => uc.company_id);
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .in('id', companyIds);

      if (companiesError) throw companiesError;

      const companies = (companiesData || []) as Company[];
      setCompanies(companies);
      
      // Set first company as current if none selected
      if (!currentCompany && companies.length > 0) {
        setCurrentCompany(companies[0]);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCompanies();
  }, [user, isDemoMode]);

  return (
    <CompanyContext.Provider value={{ 
      currentCompany, 
      companies, 
      loading, 
      setCurrentCompany,
      refreshCompanies
    }}>
      {children}
    </CompanyContext.Provider>
  );
};
