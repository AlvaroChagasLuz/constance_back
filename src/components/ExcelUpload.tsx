import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { VirtualizedSpreadsheet } from './VirtualizedSpreadsheet';
import { Button } from '@/components/ui/button';
import { parseExcelWithFormatting, parseClipboardHtml } from '@/utils/excelFormatParser';
import type { SpreadsheetData } from '@/types/spreadsheet';
import { validateFile, validateSpreadsheetData, MAX_ROWS, MAX_COLUMNS } from '@/utils/fileValidation';
import { useToast } from '@/hooks/use-toast';

interface ExcelUploadProps {
  onDataLoaded: (data: SpreadsheetData) => void;
  data: SpreadsheetData | null;
}

export const ExcelUpload: React.FC<ExcelUploadProps> = ({ onDataLoaded, data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dimensions, setDimensions] = useState<{ rows: number; cols: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExcelFile = useCallback(async (file: File) => {
    // Validate file before processing
    const fileCheck = validateFile(file, 'excel');
    if (!fileCheck.valid) {
      toast({
        title: 'Arquivo inválido',
        description: fileCheck.error,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const spreadsheetData = await parseExcelWithFormatting(file);

      // Validate parsed data dimensions
      const dataCheck = validateSpreadsheetData(spreadsheetData);
      if (!dataCheck.valid) {
        toast({
          title: 'Dados inválidos',
          description: dataCheck.error,
          variant: 'destructive',
        });
        return;
      }

      setDimensions({ rows: spreadsheetData.rowCount, cols: spreadsheetData.colCount });
      onDataLoaded(spreadsheetData);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      toast({
        title: 'Erro ao processar arquivo',
        description: error instanceof Error ? error.message : 'Formato inválido ou arquivo corrompido.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        handleExcelFile(file);
      } else {
        toast({
          title: 'Formato não suportado',
          description: 'Por favor, use arquivos .xlsx ou .xls.',
          variant: 'destructive',
        });
      }
    }
  }, [handleExcelFile, toast]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleExcelFile(files[0]);
    }
    // Reset input so re-selecting the same file triggers onChange
    e.target.value = '';
  }, [handleExcelFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle clipboard paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData('text/html');
    if (html) {
      const parsed = parseClipboardHtml(html);
      if (parsed) {
        // Validate dimensions
        const dataCheck = validateSpreadsheetData(parsed);
        if (!dataCheck.valid) {
          toast({
            title: 'Dados inválidos',
            description: dataCheck.error,
            variant: 'destructive',
          });
          return;
        }
        e.preventDefault();
        setDimensions({ rows: parsed.rowCount, cols: parsed.colCount });
        onDataLoaded(parsed);
        return;
      }
    }
    
    // Fallback: parse plain text as tab-separated values
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      e.preventDefault();
      const rows = text.split('\n').filter(r => r.length > 0);

      // Validate row count
      if (rows.length > MAX_ROWS) {
        toast({
          title: 'Dados inválidos',
          description: `Os dados colados excedem o limite de ${MAX_ROWS} linhas.`,
          variant: 'destructive',
        });
        return;
      }

      const values = rows.map(row => {
        return row.split('\t').map(cell => {
          const trimmed = cell.trim();
          if (trimmed === '') return null;
          const num = Number(trimmed.replace(/[,\s]/g, ''));
          return !isNaN(num) && trimmed !== '' ? num : trimmed;
        });
      });
      
      const maxCols = Math.max(...values.map(r => r.length));

      // Validate column count
      if (maxCols > MAX_COLUMNS) {
        toast({
          title: 'Dados inválidos',
          description: `Os dados colados excedem o limite de ${MAX_COLUMNS} colunas.`,
          variant: 'destructive',
        });
        return;
      }

      const normalized = values.map(row => {
        while (row.length < maxCols) row.push(null);
        return row;
      });
      
      const spreadsheetData: SpreadsheetData = {
        values: normalized,
        rowCount: normalized.length,
        colCount: maxCols,
      };
      setDimensions({ rows: spreadsheetData.rowCount, cols: spreadsheetData.colCount });
      onDataLoaded(spreadsheetData);
    }
  }, [onDataLoaded, toast]);

  // If no data, show upload zone
  if (!data) {
    return (
      <div className="h-full flex flex-col" onPaste={handlePaste} tabIndex={0}>
        <div
          className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg m-4 transition-colors cursor-pointer ${
            isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Processando arquivo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Arraste um arquivo Excel, cole dados (Ctrl+V) ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos suportados: .xlsx, .xls ou colar do Excel
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show spreadsheet with data
  return (
    <div className="h-full flex flex-col" onPaste={handlePaste} tabIndex={0}>
      {/* Dimensions indicator */}
      {dimensions && (
        <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Importado: {dimensions.rows} linhas × {dimensions.cols} colunas
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-xs"
            onClick={() => {
              setDimensions(null);
              onDataLoaded(null as unknown as SpreadsheetData);
            }}
          >
            Limpar
          </Button>
        </div>
      )}
      
      {/* Virtualized spreadsheet */}
      <div className="flex-1">
        <VirtualizedSpreadsheet data={data} />
      </div>
    </div>
  );
};
