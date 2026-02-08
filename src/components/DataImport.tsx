import React, { useCallback, useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { parsePastedData } from '@/utils/dreParser';
import { DREData } from '@/types/dre';
import { useToast } from '@/hooks/use-toast';
import ExcelJS from 'exceljs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { validateFile, validateDataSize } from '@/utils/fileValidation';

interface DataImportProps {
  onDataImported: (data: DREData) => void;
}

export const DataImport: React.FC<DataImportProps> = ({ onDataImported }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

        // Pick the first worksheet that actually contains data.
        const worksheet =
          workbook.worksheets.find((ws) => (ws.actualRowCount || ws.rowCount || 0) > 0 && (ws.actualColumnCount || ws.columnCount || 0) > 1) ||
          workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('Nenhuma planilha encontrada no arquivo');
        }

        // Convert worksheet to tab-separated string
        const rows: string[] = [];
        const maxCols = worksheet.actualColumnCount || worksheet.columnCount || 0;

        worksheet.eachRow({ includeEmpty: true }, (row) => {
          const cleanValues: string[] = [];
          for (let col = 1; col <= maxCols; col++) {
            const cell = row.getCell(col);
            // Use cell.text to support rich text / formatted cells / formulas.
            cleanValues.push((cell?.text ?? '').toString());
          }

          // Skip fully empty rows
          if (cleanValues.every((v) => !v || v.trim() === '')) return;
          rows.push(cleanValues.join('\t'));
        });

        if (rows.length < 2) {
          throw new Error('Dados insuficientes na planilha. Verifique se há cabeçalho e ao menos uma linha de dados.');
        }

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

  return (
    <div className="space-y-4 animate-slide-up">
      <Tabs defaultValue="excel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary">
          <TabsTrigger value="excel" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4" />
            CSV
          </TabsTrigger>
        </TabsList>

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
