import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DREData, ProjectionPremises, DEFAULT_PREMISES } from '@/types/dre';
import { DRETable } from '@/components/DRETable';
import { DataImport } from '@/components/DataImport';
import { ProjectionWizard } from '@/components/ProjectionWizard';
import { generateExcel } from '@/utils/excelExporter';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Table2, Settings2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [premises, setPremises] = useState<ProjectionPremises>(DEFAULT_PREMISES);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleDataImported = useCallback((data: DREData) => {
    setDreData(data);
    // Set base year from last period
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

  // Helper to generate column letters
  const getColumnLetter = (index: number): string => {
    let result = '';
    let n = index;
    while (n >= 0) {
      result = String.fromCharCode(65 + (n % 26)) + result;
      n = Math.floor(n / 26) - 1;
    }
    return result;
  };

  // Spreadsheet header component
  const SpreadsheetHeader: React.FC<{ columns: number }> = ({ columns }) => (
    <div
      className="grid border-b border-border bg-muted sticky top-0 z-10"
      style={{ gridTemplateColumns: `40px repeat(${columns}, minmax(100px, 1fr))` }}
    >
      <div className="border-r border-border px-2 py-1.5 text-xs font-medium text-muted-foreground text-center"></div>
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className="border-r border-border px-2 py-1.5 text-xs font-medium text-muted-foreground text-center">
          {getColumnLetter(i)}
        </div>
      ))}
    </div>
  );

  // Empty spreadsheet row
  const EmptyRow: React.FC<{ rowNumber: number; columns: number }> = ({ rowNumber, columns }) => (
    <div
      className="grid border-b border-border"
      style={{ gridTemplateColumns: `40px repeat(${columns}, minmax(100px, 1fr))` }}
    >
      <div className="border-r border-border px-2 py-1.5 text-xs font-medium text-muted-foreground text-center bg-muted min-h-[32px] flex items-center justify-center">
        {rowNumber}
      </div>
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className="border-r border-border px-2 py-1.5 min-h-[32px] bg-background"></div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal spreadsheet-style header */}
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
        {/* Left Panel - DRE Table as Spreadsheet */}
        <div className="w-[40%] border-r border-border flex flex-col">
          {/* Sheet tab */}
          <div className="flex items-center bg-muted/30 border-b border-border">
            <div className="px-3 py-1.5 text-xs font-medium bg-background border-r border-border flex items-center gap-1.5">
              <Table2 className="w-3.5 h-3.5 text-primary" />
              DRE Importada
            </div>
            {dreData && (
              <button
                onClick={() => setDreData(null)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                + Nova DRE
              </button>
            )}
          </div>

          {/* Spreadsheet content */}
          <div className="flex-1 overflow-auto border-l border-t border-border">
            {dreData ? (
              <DRETable dreData={dreData} onUpdateRow={handleUpdateRow} />
            ) : (
              <div className="h-full flex flex-col">
                <SpreadsheetHeader columns={5} />
                {/* First few rows with import prompt */}
                <div
                  className="grid border-b border-border"
                  style={{ gridTemplateColumns: `40px repeat(5, minmax(100px, 1fr))` }}
                >
                  <div className="border-r border-border px-2 py-1.5 text-xs font-medium text-muted-foreground text-center bg-muted min-h-[32px] flex items-center justify-center">
                    1
                  </div>
                  <div className="col-span-5 border-r border-border bg-background">
                    <DataImport onDataImported={handleDataImported} />
                  </div>
                </div>
                {/* Empty rows */}
                {Array.from({ length: 20 }, (_, i) => (
                  <EmptyRow key={i + 2} rowNumber={i + 2} columns={5} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Projection Wizard as Spreadsheet */}
        <div className="w-[60%] flex flex-col">
          {/* Sheet tab */}
          <div className="flex items-center bg-muted/30 border-b border-border">
            <div className="px-3 py-1.5 text-xs font-medium bg-background border-r border-border flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-accent" />
              Configurações de Projeção
            </div>
          </div>

          {/* Spreadsheet content */}
          <div className="flex-1 overflow-hidden border-t border-border">
            {dreData ? (
              <ProjectionWizard
                premises={premises}
                onPremisesChange={setPremises}
                baseYear={dreData.periods[dreData.periods.length - 1] || ''}
                onExport={handleExport}
                isExporting={isExporting}
              />
            ) : (
              <div className="h-full flex flex-col">
                <SpreadsheetHeader columns={4} />
                {/* Info row */}
                <div
                  className="grid border-b border-border"
                  style={{ gridTemplateColumns: `40px repeat(4, minmax(100px, 1fr))` }}
                >
                  <div className="border-r border-border px-2 py-1.5 text-xs font-medium text-muted-foreground text-center bg-muted min-h-[32px] flex items-center justify-center">
                    1
                  </div>
                  <div className="col-span-4 border-r border-border px-3 py-4 bg-background flex items-center justify-center">
                    <div className="text-center">
                      <Settings2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Importe sua DRE para configurar as projeções
                      </p>
                    </div>
                  </div>
                </div>
                {/* Empty rows */}
                {Array.from({ length: 15 }, (_, i) => (
                  <EmptyRow key={i + 2} rowNumber={i + 2} columns={4} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer formula bar style */}
      <footer className="border-t border-border bg-muted/30 px-3 py-1 flex items-center text-xs text-muted-foreground">
        <span className="px-2 py-0.5 bg-muted rounded mr-2">fx</span>
        <span>{dreData ? `Base: ${premises.baseYear || dreData.periods[dreData.periods.length - 1]}` : 'Aguardando importação de dados...'}</span>
      </footer>
    </div>
  );
};

export default Index;
