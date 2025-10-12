export type Company = {
  id: string;
  name: string;
  bin_iin: string;
  tax_regime: 'USN' | 'OSN';
  currency: 'KZT' | 'USD' | 'EUR' | 'RUB';
  created_at: string;
  updated_at: string;
};

export type UserCompany = {
  id: string;
  user_id: string;
  company_id: string;
  role: 'owner' | 'accountant' | 'viewer';
  created_at: string;
};

export type Document = {
  id: string;
  company_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: 'uploaded' | 'processing' | 'done' | 'error';
  parsed: any;
  document_type?: 'invoice' | 'receipt' | 'contract' | 'statement' | 'other';
  amount?: number;
  currency?: string;
  document_date?: string;
  counterparty?: string;
  created_at: string;
  updated_at: string;
};

export type BankTransaction = {
  id: string;
  company_id: string;
  imported_by: string;
  transaction_date: string;
  description: string;
  amount: number;
  currency: string;
  matched_document_id?: string;
  is_matched: boolean;
  created_at: string;
  updated_at: string;
};

export type Entry = {
  id: string;
  company_id: string;
  transaction_id?: string;
  document_id?: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  currency: string;
  description?: string;
  status: 'suggested' | 'confirmed' | 'rejected';
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  company_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: any;
  new_value?: any;
  created_at: string;
};
