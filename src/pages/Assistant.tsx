import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User, Bot } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const PREDEFINED_RESPONSES: Record<string, string> = {
  'как провести': 'Для проведения документа: загрузите его через раздел "Документы", система автоматически распознает сумму и предложит проводку. Затем в разделе "Транзакции" подтвердите или отредактируйте предложенную проводку.',
  'налог': 'Для расчёта налога используйте раздел "Отчёты". Выберите период, и система покажет доходы, расходы и примерную сумму налога по вашему режиму (УСН/ОСН).',
  'выписка': 'Для импорта банковской выписки: перейдите в "Транзакции", загрузите CSV файл с колонками: дата, описание, сумма, валюта. Система автоматически импортирует транзакции.',
  'документ': 'Вы можете загружать документы в формате PDF, JPG, PNG до 10MB. Система распознает основную информацию: сумму, дату, контрагента и предложит соответствующую проводку.',
  'проводка': 'Проводка - это бухгалтерская запись операции. Sana автоматически предлагает проводки на основе загруженных документов и банковских транзакций. Вы можете подтвердить, отредактировать или отклонить предложенную проводку.',
};

const Assistant = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Здравствуйте! Я AI-помощник Sana. Задайте мне вопрос о бухгалтерском учёте, и я постараюсь помочь.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Find matching response
    let response = 'Спасибо за вопрос! В MVP версии я могу помочь с базовыми вопросами. Попробуйте спросить про: проведение документов, налоги, выписки, или загрузку документов.';
    
    const lowerInput = input.toLowerCase();
    for (const [key, value] of Object.entries(PREDEFINED_RESPONSES)) {
      if (lowerInput.includes(key)) {
        response = value;
        break;
      }
    }

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 500);

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Помощник</h2>
          <p className="text-muted-foreground mt-1">
            Задайте вопросы о бухгалтерском учёте
          </p>
        </div>

        {/* Suggested questions */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-base"
            onClick={() => setInput('Как провести оплату?')}
          >
            Как провести оплату?
          </Badge>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-base"
            onClick={() => setInput('Сколько налогов за квартал?')}
          >
            Сколько налогов за квартал?
          </Badge>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-base"
            onClick={() => setInput('Как импортировать выписку?')}
          >
            Как импортировать выписку?
          </Badge>
        </div>

        {/* Chat messages */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Чат с помощником
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' ? 'bg-primary' : 'bg-secondary'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-secondary-foreground" />
                    )}
                  </div>
                  <div
                    className={`flex-1 rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-12'
                        : 'bg-muted mr-12'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Напишите ваш вопрос..."
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Assistant;
