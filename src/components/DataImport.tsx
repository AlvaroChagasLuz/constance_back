import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, ClipboardPaste, FileText, Loader2 } from 'lucide-react';
import { parsePastedData, SAMPLE_DRE } from '@/utils/dreParser';
import { DREData } from '@/types/dre';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface DataImportProps {
  onDataImported: (data: DREData) => void;
}

export const DataImport: React.FC<DataImportProps> = ({ onDataImported }) => {
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePaste = useCallback(() => {
    if (!pastedText.trim()) {
      toast({
        title: 'Dados vazios',
        description: 'Cole os dados da sua DRE no campo acima.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const data = parsePastedData(pastedText);
      onDataImported(data);
      toast({
        title: 'DRE importada com sucesso!',
        description: `${data.rows.length} linhas e ${data.periods.length} períodos identificados.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao importar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [pastedText, onDataImported, toast]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, type: 'excel' | 'csv') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          
          if (type === 'excel') {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csvData = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
            const dreData = parsePastedData(csvData);
            onDataImported(dreData);
          } else {
            const csvText = data as string;
            // Convert CSV to tab-separated
            const lines = csvText.split('\n').map(line => {
              // Handle quoted values
              const values: string[] = [];
              let current = '';
              let inQuotes = false;
              
              for (const char of line) {
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if ((char === ',' || char === ';') && !inQuotes) {
                  values.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              values.push(current.trim());
              
              return values.join('\t');
            });
            
            const dreData = parsePastedData(lines.join('\n'));
            onDataImported(dreData);
          }

          toast({
            title: 'Arquivo importado com sucesso!',
            description: 'Os dados foram processados e estão prontos para visualização.',
          });
        } catch (error) {
          toast({
            title: 'Erro ao processar arquivo',
            description: error instanceof Error ? error.message : 'Formato inválido',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        toast({
          title: 'Erro ao ler arquivo',
          description: 'Não foi possível ler o arquivo selecionado.',
          variant: 'destructive',
        });
        setIsLoading(false);
      };

      if (type === 'excel') {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error) {
      toast({
        title: 'Erro ao carregar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      setIsLoading(false);
    }

    // Reset input
    event.target.value = '';
  }, [onDataImported, toast]);

  const loadSample = useCallback(() => {
    try {
      const data = parsePastedData(SAMPLE_DRE);
      onDataImported(data);
      setPastedText(SAMPLE_DRE);
      toast({
        title: 'Exemplo carregado!',
        description: 'Uma DRE de exemplo foi carregada para demonstração.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao carregar exemplo',
        description: 'Não foi possível carregar os dados de exemplo.',
        variant: 'destructive',
      });
    }
  }, [onDataImported, toast]);

  return (
    <div className="space-y-4 animate-slide-up">
      <Tabs defaultValue="paste" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger value="paste" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardPaste className="w-4 h-4" />
            Colar
          </TabsTrigger>
          <TabsTrigger value="excel" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4" />
            CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Cole sua DRE aqui (copie e cole do Excel)
            </label>
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`Conta\t2021\t2022\t2023\nReceita Líquida\t1000000\t1200000\t1500000\nCOGS\t-300000\t-360000\t-450000\n...`}
              className="min-h-[160px] font-mono text-sm bg-background border-input resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePaste} className="flex-1 bg-primary hover:bg-primary/90">
              <Upload className="w-4 h-4 mr-2" />
              Importar Dados
            </Button>
            <Button variant="outline" onClick={loadSample} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              Carregar Exemplo
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="excel" className="mt-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e, 'excel')}
              className="hidden"
              id="excel-upload"
              disabled={isLoading}
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              {isLoading ? (
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent animate-spin" />
              ) : (
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              )}
              <p className="text-sm font-medium text-foreground">
                {isLoading ? 'Processando...' : 'Clique para selecionar ou arraste seu arquivo Excel'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Suporta .xlsx e .xls
              </p>
            </label>
          </div>
        </TabsContent>

        <TabsContent value="csv" className="mt-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, 'csv')}
              className="hidden"
              id="csv-upload"
              disabled={isLoading}
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              {isLoading ? (
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent animate-spin" />
              ) : (
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              )}
              <p className="text-sm font-medium text-foreground">
                {isLoading ? 'Processando...' : 'Clique para selecionar ou arraste seu arquivo CSV'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Suporta separadores vírgula e ponto-e-vírgula
              </p>
            </label>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
