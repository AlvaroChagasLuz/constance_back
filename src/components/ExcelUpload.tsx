import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { VirtualizedSpreadsheet, SpreadsheetData } from './VirtualizedSpreadsheet';
import { Button } from '@/components/ui/button';

interface ExcelUploadProps {
  onDataLoaded: (data: SpreadsheetData) => void;
  data: SpreadsheetData | null;
}

export const ExcelUpload: React.FC<ExcelUploadProps> = ({ onDataLoaded, data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dimensions, setDimensions] = useState<{ rows: number; cols: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcelFile = useCallback(async (file: File) => {
    setIsLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get range of used cells
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const rowCount = range.e.r - range.s.r + 1;
      const colCount = range.e.c - range.s.c + 1;
      
      // Convert to array of arrays
      const jsonData = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
        header: 1,
        defval: null,
      });
      
      // Normalize rows to have consistent column count
      const normalizedData: (string | number | null)[][] = jsonData.map(row => {
        const normalizedRow = [...row];
        while (normalizedRow.length < colCount) {
          normalizedRow.push(null);
        }
        return normalizedRow;
      });
      
      // Pad with empty rows if needed
      while (normalizedData.length < rowCount) {
        normalizedData.push(Array(colCount).fill(null));
      }
      
      const spreadsheetData: SpreadsheetData = {
        values: normalizedData,
        rowCount,
        colCount,
      };
      
      setDimensions({ rows: rowCount, cols: colCount });
      onDataLoaded(spreadsheetData);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parseExcelFile(file);
      }
    }
  }, [parseExcelFile]);

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
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parseExcelFile(file);
      }
    }
  }, [parseExcelFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // If no data, show upload zone
  if (!data) {
    return (
      <div className="h-full flex flex-col">
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
                  Arraste um arquivo Excel ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos suportados: .xlsx, .xls
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
    <div className="h-full flex flex-col">
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
