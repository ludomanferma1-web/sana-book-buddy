import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Document } from '@/types/database';
import { toast } from 'sonner';

const Documents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else if (currentCompany) {
      loadDocuments();
    }
  }, [user, currentCompany]);

  const loadDocuments = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as Document[]);
    } catch (error: any) {
      toast.error('Ошибка загрузки документов');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentCompany || !user) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      // Upload to storage
      const filePath = `${currentCompany.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert([{
          company_id: currentCompany.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          status: 'uploaded'
        }]);

      if (insertError) throw insertError;

      toast.success('Документ загружен успешно');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <Badge className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Обработан</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Обработка</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Ошибка</Badge>;
      default:
        return <Badge variant="outline">Загружен</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Документы</h2>
            <p className="text-muted-foreground mt-1">
              Загружайте чеки, счета и договоры для автоматической обработки
            </p>
          </div>
        </div>

        {/* Upload area */}
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Загрузите документ</h3>
            <p className="text-sm text-muted-foreground mb-4">
              PDF, JPG, PNG до 10MB
            </p>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Выбрать файл
            </Button>
          </CardContent>
        </Card>

        {/* Documents list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p>Пока нет загруженных документов</p>
              </CardContent>
            </Card>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id} className="transition-base hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <FileText className="h-10 w-10 text-primary" />
                    <div>
                      <h4 className="font-medium">{doc.file_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Documents;
