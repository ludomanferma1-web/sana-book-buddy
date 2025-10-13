-- Create ai_history table for storing chat conversations
CREATE TABLE public.ai_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  messages JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_history
CREATE POLICY "Users can view their own chat history"
  ON public.ai_history
  FOR SELECT
  TO authenticated
  USING (user_has_company_access(company_id) AND user_id = auth.uid());

CREATE POLICY "Users can create chat history"
  ON public.ai_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_company_access(company_id) AND user_id = auth.uid());

-- RPC function: get_transactions_summary
CREATE OR REPLACE FUNCTION public.get_transactions_summary(
  _company_id UUID,
  _start_date DATE,
  _end_date DATE
)
RETURNS TABLE (
  income NUMERIC,
  expense NUMERIC,
  balance NUMERIC,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income,
    COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0) as expense,
    COALESCE(SUM(amount), 0) as balance,
    COUNT(*) as count
  FROM public.bank_transactions
  WHERE company_id = _company_id
    AND transaction_date BETWEEN _start_date AND _end_date;
$$;

-- RPC function: get_ai_context
CREATE OR REPLACE FUNCTION public.get_ai_context(_company_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'recent_transactions', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT description, amount, transaction_date, currency
        FROM public.bank_transactions
        WHERE company_id = _company_id
        ORDER BY transaction_date DESC
        LIMIT 5
      ) t
    ),
    'stats', (
      SELECT jsonb_build_object(
        'total_documents', COUNT(DISTINCT d.id),
        'pending_entries', COUNT(DISTINCT CASE WHEN e.status = 'suggested' THEN e.id END),
        'confirmed_entries', COUNT(DISTINCT CASE WHEN e.status = 'confirmed' THEN e.id END)
      )
      FROM public.documents d
      LEFT JOIN public.entries e ON e.company_id = d.company_id
      WHERE d.company_id = _company_id
    ),
    'company_info', (
      SELECT jsonb_build_object(
        'name', name,
        'tax_regime', tax_regime,
        'currency', currency
      )
      FROM public.companies
      WHERE id = _company_id
    )
  );
$$;

-- RPC function: match_transactions
CREATE OR REPLACE FUNCTION public.match_document_with_transaction(
  _document_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_record RECORD;
  matched_transaction RECORD;
  result JSONB;
BEGIN
  -- Get document details
  SELECT * INTO doc_record
  FROM public.documents
  WHERE id = _document_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found');
  END IF;
  
  IF doc_record.amount IS NULL OR doc_record.document_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document missing amount or date');
  END IF;
  
  -- Find matching transaction (amount within 1%, date within 3 days, not matched)
  SELECT * INTO matched_transaction
  FROM public.bank_transactions
  WHERE company_id = doc_record.company_id
    AND is_matched = false
    AND ABS(amount - doc_record.amount) <= ABS(doc_record.amount * 0.01)
    AND transaction_date BETWEEN (doc_record.document_date - INTERVAL '3 days') 
                             AND (doc_record.document_date + INTERVAL '3 days')
  ORDER BY ABS(amount - doc_record.amount) ASC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No matching transaction found');
  END IF;
  
  -- Create suggested entry based on document type
  INSERT INTO public.entries (
    company_id,
    transaction_id,
    document_id,
    debit_account,
    credit_account,
    amount,
    currency,
    description,
    status
  ) VALUES (
    doc_record.company_id,
    matched_transaction.id,
    _document_id,
    CASE doc_record.document_type
      WHEN 'invoice' THEN '1030'  -- Дебиторская задолженность
      WHEN 'receipt' THEN '1010'  -- Касса
      ELSE '2930'  -- Прочие активы
    END,
    CASE doc_record.document_type
      WHEN 'invoice' THEN '7010'  -- Доход от реализации
      WHEN 'receipt' THEN '3310'  -- Краткосрочные обязательства
      ELSE '6010'  -- Расходы
    END,
    doc_record.amount,
    doc_record.currency,
    'Автоматически сопоставлено: ' || doc_record.file_name,
    'suggested'
  );
  
  -- Mark transaction as matched
  UPDATE public.bank_transactions
  SET is_matched = true, matched_document_id = _document_id
  WHERE id = matched_transaction.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', matched_transaction.id,
    'entry_created', true
  );
END;
$$;