-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bin_iin TEXT NOT NULL UNIQUE,
  tax_regime TEXT NOT NULL CHECK (tax_regime IN ('USN', 'OSN')),
  currency TEXT NOT NULL DEFAULT 'KZT' CHECK (currency IN ('KZT', 'USD', 'EUR', 'RUB')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_companies junction table
CREATE TABLE public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'accountant', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'done', 'error')),
  parsed JSONB,
  document_type TEXT CHECK (document_type IN ('invoice', 'receipt', 'contract', 'statement', 'other')),
  amount DECIMAL(15, 2),
  currency TEXT,
  document_date DATE,
  counterparty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create bank_transactions table
CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  imported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KZT',
  matched_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  is_matched BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create entries table (accounting entries/проводки)
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  debit_account TEXT NOT NULL,
  credit_account TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KZT',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'confirmed', 'rejected')),
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has access to company
CREATE OR REPLACE FUNCTION public.user_has_company_access(company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_companies
    WHERE user_companies.user_id = auth.uid()
      AND user_companies.company_id = $1
  );
$$;

-- RLS Policies for companies
CREATE POLICY "Users can view their companies"
  ON public.companies FOR SELECT
  USING (public.user_has_company_access(id));

CREATE POLICY "Users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Company owners can update their companies"
  ON public.companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies
      WHERE user_companies.company_id = companies.id
        AND user_companies.user_id = auth.uid()
        AND user_companies.role = 'owner'
    )
  );

-- RLS Policies for user_companies
CREATE POLICY "Users can view their company relationships"
  ON public.user_companies FOR SELECT
  USING (user_id = auth.uid() OR public.user_has_company_access(company_id));

CREATE POLICY "Users can create company relationships"
  ON public.user_companies FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their companies"
  ON public.documents FOR SELECT
  USING (public.user_has_company_access(company_id));

CREATE POLICY "Users can upload documents to their companies"
  ON public.documents FOR INSERT
  WITH CHECK (public.user_has_company_access(company_id) AND uploaded_by = auth.uid());

CREATE POLICY "Users can update documents in their companies"
  ON public.documents FOR UPDATE
  USING (public.user_has_company_access(company_id));

CREATE POLICY "Users can delete documents in their companies"
  ON public.documents FOR DELETE
  USING (public.user_has_company_access(company_id));

-- RLS Policies for bank_transactions
CREATE POLICY "Users can view transactions in their companies"
  ON public.bank_transactions FOR SELECT
  USING (public.user_has_company_access(company_id));

CREATE POLICY "Users can import transactions to their companies"
  ON public.bank_transactions FOR INSERT
  WITH CHECK (public.user_has_company_access(company_id) AND imported_by = auth.uid());

CREATE POLICY "Users can update transactions in their companies"
  ON public.bank_transactions FOR UPDATE
  USING (public.user_has_company_access(company_id));

CREATE POLICY "Users can delete transactions in their companies"
  ON public.bank_transactions FOR DELETE
  USING (public.user_has_company_access(company_id));

-- RLS Policies for entries
CREATE POLICY "Users can view entries in their companies"
  ON public.entries FOR SELECT
  USING (public.user_has_company_access(company_id));

CREATE POLICY "Users can create entries for their companies"
  ON public.entries FOR INSERT
  WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "Users can update entries in their companies"
  ON public.entries FOR UPDATE
  USING (public.user_has_company_access(company_id));

CREATE POLICY "Users can delete entries in their companies"
  ON public.entries FOR DELETE
  USING (public.user_has_company_access(company_id));

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs for their companies"
  ON public.audit_logs FOR SELECT
  USING (public.user_has_company_access(company_id));

CREATE POLICY "System can create audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.user_has_company_access(company_id));

-- Create indexes for better performance
CREATE INDEX idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON public.user_companies(company_id);
CREATE INDEX idx_documents_company_id ON public.documents(company_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_bank_transactions_company_id ON public.bank_transactions(company_id);
CREATE INDEX idx_bank_transactions_date ON public.bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_matched ON public.bank_transactions(is_matched);
CREATE INDEX idx_entries_company_id ON public.entries(company_id);
CREATE INDEX idx_entries_status ON public.entries(status);
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage RLS policies
CREATE POLICY "Users can view documents in their companies"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.user_companies uc ON d.company_id = uc.company_id
      WHERE d.file_path = storage.objects.name
        AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents to their companies"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update documents in their companies"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.user_companies uc ON d.company_id = uc.company_id
      WHERE d.file_path = storage.objects.name
        AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their companies"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.user_companies uc ON d.company_id = uc.company_id
      WHERE d.file_path = storage.objects.name
        AND uc.user_id = auth.uid()
    )
  );