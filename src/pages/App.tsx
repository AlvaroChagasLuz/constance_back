import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DREData, ProjectionPremises, DEFAULT_PREMISES } from '@/types/dre';
import type { SpreadsheetData } from '@/types/spreadsheet';
import { DRETable } from '@/components/DRETable';
import { DataImport } from '@/components/DataImport';
import { ProjectionWizard } from '@/components/ProjectionWizard';
import { VirtualizedSpreadsheet } from '@/components/VirtualizedSpreadsheet';
import { ExcelUpload } from '@/components/ExcelUpload';
import { generateExcel } from '@/utils/excelExporter';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Table2, Settings2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [premises, setPremises] = useState<ProjectionPremises>(DEFAULT_PREMISES);
  const [isExporting, setIsExporting] = useState(false);
  const [leftSpreadsheetData, setLeftSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [rightSpreadsheetData, setRightSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const { toast } = useToast();

  // Auto-copy left data to right whenever left changes
  useEffect(() => {
    if (leftSpreadsheetData) {
      const copiedData: SpreadsheetData = {
        values: leftSpreadsheetData.values.map(row => [...row]),
        formats: leftSpreadsheetData.formats?.map(row => row.map(f => f ? { ...f } : null)),
        mergedCells: leftSpreadsheetData.mergedCells?.map(m => ({ ...m })),
        columnWidths: leftSpreadsheetData.columnWidths ? [...leftSpreadsheetData.columnWidths] : undefined,
        rowHeights: leftSpreadsheetData.rowHeights ? [...leftSpreadsheetData.rowHeights] : undefined,
        rowCount: leftSpreadsheetData.rowCount,
        colCount: leftSpreadsheetData.colCount,
        startRow: leftSpreadsheetData.startRow,
        startCol: leftSpreadsheetData.startCol,
      };
      setRightSpreadsheetData(copiedData);
    } else {
      setRightSpreadsheetData(null);
    }
  }, [leftSpreadsheetData]);

  const handleDataImported = useCallback((data: DREData) => {
    setDreData(data);
    if (data.periods.length > 0) {
      setPremises(prev => ({
        ...prev,
        baseYear: data.periods[data.periods.length - 1],
      }));
    }
  }, []);

  const handleUpdateRow = useCallback((rowId: string, updates: Partial<{ account: string; values: Record<string, number> }>) => {
    if (!dreData) return;
    setDreData({
      ...dreData,
      rows: dreData.rows.map(row =>
        row.id === rowId ? { ...row, ...updates } : row
      ),
    });
  }, [dreData]);

  const handleExport = useCallback(async () => {
    if (!dreData) {
      toast({
        title: 'Nenhuma DRE importada',
        description: 'Importe uma DRE antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      await generateExcel(dreData, premises);
      toast({
        title: 'Excel gerado com sucesso!',
        description: 'O download deve iniciar automaticamente.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar Excel',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [dreData, premises, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-muted/50 flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">Constance</span>
          {dreData && (
            <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-medium ml-2">
              {dreData.rows.length} linhas • {dreData.periods.length} períodos
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link to="/">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Voltar
          </Link>
        </Button>
      </header>

      {/* Main spreadsheet area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Excel Import Spreadsheet */}
        <div className="w-[40%] border-r border-border flex flex-col">
          {/* Sheet tab */}
          <div className="flex items-center bg-muted/30 border-b border-border">
            <div className="px-3 py-1.5 text-xs font-medium bg-background border-r border-border flex items-center gap-1.5">
              <Table2 className="w-3.5 h-3.5 text-primary" />
              Dados Importados
            </div>
          </div>

          {/* Excel Upload / Spreadsheet */}
          <div className="flex-1 overflow-hidden">
            <ExcelUpload
              data={leftSpreadsheetData}
              onDataLoaded={setLeftSpreadsheetData}
            />
          </div>
        </div>

        {/* Right Panel - Mirrored Data */}
        <div className="w-[60%] flex flex-col">
          {/* Sheet tab */}
          <div className="flex items-center bg-muted/30 border-b border-border">
            <div className="px-3 py-1.5 text-xs font-medium bg-background border-r border-border flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-accent" />
              Dados Espelhados
            </div>
            {rightSpreadsheetData && (
              <span className="text-xs text-muted-foreground ml-2">
                {rightSpreadsheetData.rowCount} linhas × {rightSpreadsheetData.colCount} colunas
              </span>
            )}
          </div>

          {/* Spreadsheet content */}
          <div className="flex-1 overflow-hidden border-t border-border">
            <VirtualizedSpreadsheet
              data={rightSpreadsheetData}
              totalRows={1000}
              totalColumns={100}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 px-3 py-1 flex items-center text-xs text-muted-foreground">
        <span className="px-2 py-0.5 bg-muted rounded mr-2">fx</span>
        <span>
          {leftSpreadsheetData
            ? `Importado: ${leftSpreadsheetData.rowCount} linhas × ${leftSpreadsheetData.colCount} colunas — Espelhado automaticamente`
            : 'Aguardando importação de dados...'}
        </span>
      </footer>
    </div>
  );
};

export default Index;
