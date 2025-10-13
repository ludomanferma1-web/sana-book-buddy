import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { messages, companyId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get AI context for the company
    let contextData: any = {};
    if (companyId) {
      const { data: context } = await supabase.rpc('get_ai_context', {
        _company_id: companyId
      });
      contextData = context || {};
    }

    const companyInfo = contextData.company_info || {};
    const recentTransactions = contextData.recent_transactions || [];
    const stats = contextData.stats || {};

    const systemPrompt = `Ты AI-бухгалтер Sana. Помогаешь владельцам бизнеса с учётом и финансами.

Текущая компания: ${companyInfo.name || 'Не указана'}
Налоговый режим: ${companyInfo.tax_regime || 'USN'}
Валюта: ${companyInfo.currency || 'KZT'}

Статистика:
- Всего документов: ${stats.total_documents || 0}
- Ожидающих проводок: ${stats.pending_entries || 0}
- Подтвержденных проводок: ${stats.confirmed_entries || 0}

Последние транзакции:
${recentTransactions.map((t: any) => 
  `- ${t.transaction_date}: ${t.description} - ${t.amount} ${t.currency}`
).join('\n') || 'Нет данных'}

Отвечай на русском языке, кратко и по делу. Давай практические советы по бухгалтерии.`;

    console.log('Sending request to Lovable AI with context:', {
      companyId,
      hasContext: !!companyId
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Превышен лимит запросов, попробуйте позже.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Требуется пополнить баланс Lovable AI.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Ошибка AI сервиса' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});