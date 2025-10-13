import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    console.log('Processing document:', document.file_name);

    // Update status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // Mock OCR result (в реальной версии здесь будет вызов OCR API)
    // Для демо генерируем случайные данные на основе имени файла
    const mockParsedData = {
      document_type: document.file_name.toLowerCase().includes('invoice') ? 'invoice' : 
                     document.file_name.toLowerCase().includes('receipt') ? 'receipt' : 'contract',
      amount: Math.floor(Math.random() * 100000) + 1000,
      currency: document.currency || 'KZT',
      document_date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      counterparty: `Контрагент ${Math.floor(Math.random() * 100)}`,
      confidence: 0.95,
      extracted_text: `Документ: ${document.file_name}\nСумма: ${Math.floor(Math.random() * 100000) + 1000}\nДата: ${new Date().toLocaleDateString('ru-RU')}`,
    };

    console.log('OCR result:', mockParsedData);

    // Update document with parsed data
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'done',
        parsed: mockParsedData,
        document_type: mockParsedData.document_type,
        amount: mockParsedData.amount,
        currency: mockParsedData.currency,
        document_date: mockParsedData.document_date,
        counterparty: mockParsedData.counterparty,
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      throw updateError;
    }

    // Try to match with transactions
    console.log('Attempting to match document with transactions...');
    const { data: matchResult, error: matchError } = await supabase.rpc(
      'match_document_with_transaction',
      { _document_id: documentId }
    );

    if (matchError) {
      console.error('Match error:', matchError);
    } else {
      console.log('Match result:', matchResult);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        parsed: mockParsedData,
        matched: matchResult?.success || false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Process document error:', error);
    
    // Try to update document status to error
    try {
      const { documentId } = await req.json();
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      await supabase
        .from('documents')
        .update({ status: 'error' })
        .eq('id', documentId);
    } catch (e) {
      console.error('Error updating document status:', e);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});