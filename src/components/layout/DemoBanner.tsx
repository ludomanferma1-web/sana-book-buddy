import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export const DemoBanner = () => {
  return (
    <Alert className="mb-4 border-primary/50 bg-primary/5">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm">
          Вы в режиме просмотра. Функции загрузки и редактирования недоступны.
        </span>
        <Link to="/auth">
          <Button size="sm" variant="default">
            Зарегистрироваться
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
};
