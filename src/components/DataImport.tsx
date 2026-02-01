import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, ClipboardPaste, FileText, Loader2 } from 'lucide-react';
import { parsePastedData, SAMPLE_DRE } from '@/utils/dreParser';
import { DREData } from '@/types/dre';
import { useToast } from '@/hooks/use-toast';
import ExcelJS from 'exceljs';

// File validation constants
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_ROWS = 10000;
const MAX_COLUMNS = 100;

// Valid MIME types for file validation
const VALID_EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];
const VALID_CSV_TYPES = [
  'text/csv',
  'text/plain', // Some systems report CSV as text/plain
  'application/csv',
];

interface DataImportProps {
  onDataImported: (data: DREData) => void;
}

// Validate file size and type
const validateFile = (file: File, type: 'excel' | 'csv'): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `O arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB. Por favor, use um arquivo menor.`,
    };
  }

  // Check file size is not zero
  if (file.size === 0) {
    return {
      valid: false,
      error: 'O arquivo está vazio. Por favor, selecione um arquivo válido.',
    };
  }

  // Check MIME type
  const validTypes = type === 'excel' ? VALID_EXCEL_TYPES : VALID_CSV_TYPES;
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const expectedExtensions = type === 'excel' ? ['xlsx', 'xls'] : ['csv'];

  // Validate extension matches expected type
  if (!fileExtension || !expectedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Extensão de arquivo inválida. Esperado: ${expectedExtensions.join(', ')}`,
    };
  }

  // MIME type check (lenient - some browsers report incorrectly)
  if (file.type && !validTypes.includes(file.type) && file.type !== 'application/octet-stream') {
    console.warn(`Unexpected MIME type: ${file.type} for file: ${file.name}`);
    // Don't fail on MIME type alone, just warn - some systems misreport
  }

  return { valid: true };
};

// Validate row and column counts
const validateDataSize = (rows: string[], maxCols: number = MAX_COLUMNS): { valid: boolean; error?: string } => {
  if (rows.length > MAX_ROWS) {
    return {
      valid: false,
      error: `O arquivo contém muitas linhas (${rows.length}). Limite máximo: ${MAX_ROWS} linhas.`,
    };
  }

  // Check column count in first few rows
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const cols = rows[i].split('\t').length;
    if (cols > maxCols) {
      return {
        valid: false,
        error: `O arquivo contém muitas colunas (${cols}). Limite máximo: ${maxCols} colunas.`,
      };
    }
  }

  return { valid: true };
};

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

    // Validate pasted data size
    const lines = pastedText.split('\n');
    const sizeValidation = validateDataSize(lines);
    if (!sizeValidation.valid) {
      toast({
        title: 'Dados muito grandes',
        description: sizeValidation.error,
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

    // Validate file before processing
    const fileValidation = validateFile(file, type);
    if (!fileValidation.valid) {
      toast({
        title: 'Arquivo inválido',
        description: fileValidation.error,
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    setIsLoading(true);

    try {
      if (type === 'excel') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('Nenhuma planilha encontrada no arquivo');
        }

        // Convert worksheet to tab-separated string
        const rows: string[] = [];
        worksheet.eachRow((row) => {
          const values = row.values as (string | number | null | undefined)[];
          // ExcelJS row.values is 1-indexed, first element is undefined
          const cleanValues = values.slice(1).map(v => {
            if (v === null || v === undefined) return '';
            return String(v);
          });
          rows.push(cleanValues.join('\t'));
        });

        // Validate data size after parsing
        const sizeValidation = validateDataSize(rows);
        if (!sizeValidation.valid) {
          throw new Error(sizeValidation.error);
        }

        const csvData = rows.join('\n');
        const dreData = parsePastedData(csvData);
        onDataImported(dreData);
      } else {
        const text = await file.text();
        // Convert CSV to tab-separated
        const lines = text.split('\n').map(line => {
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

        // Validate data size after parsing
        const sizeValidation = validateDataSize(lines);
        if (!sizeValidation.valid) {
          throw new Error(sizeValidation.error);
        }
        
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
      // Reset input
      event.target.value = '';
    }
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
