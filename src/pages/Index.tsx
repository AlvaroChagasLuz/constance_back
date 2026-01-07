import React, { useState, useCallback } from 'react';
import { DREData, ProjectionPremises, DEFAULT_PREMISES } from '@/types/dre';
import { DRETable } from '@/components/DRETable';
import { DataImport } from '@/components/DataImport';
import { ProjectionWizard } from '@/components/ProjectionWizard';
import { generateExcel } from '@/utils/excelExporter';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Table2, Settings2 } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">DRE Valuation</h1>
              <p className="text-xs text-muted-foreground">Projeções financeiras automatizadas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {dreData && (
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent font-medium">
                {dreData.rows.length} linhas • {dreData.periods.length} períodos
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
          {/* Left Panel - DRE Table */}
          <div className="lg:w-[40%] flex flex-col">
            <div className="glass-card rounded-xl overflow-hidden flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
                <Table2 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">DRE Importada</h2>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {dreData ? (
                  <DRETable dreData={dreData} onUpdateRow={handleUpdateRow} />
                ) : (
                  <DataImport onDataImported={handleDataImported} />
                )}
              </div>

              {dreData && (
                <div className="p-4 border-t border-border bg-secondary/20">
                  <button
                    onClick={() => setDreData(null)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Importar outra DRE
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Projection Wizard */}
          <div className="lg:w-[60%] flex flex-col">
            <div className="glass-card rounded-xl overflow-hidden flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-accent" />
                <h2 className="font-semibold text-foreground">Configurações de Projeção</h2>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                {dreData ? (
                  <ProjectionWizard
                    premises={premises}
                    onPremisesChange={setPremises}
                    baseYear={dreData.periods[dreData.periods.length - 1] || ''}
                    onExport={handleExport}
                    isExporting={isExporting}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                    <div className="w-20 h-20 mb-6 rounded-full bg-muted flex items-center justify-center">
                      <Settings2 className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Importe sua DRE primeiro
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Após importar os dados da DRE no painel à esquerda, você poderá configurar
                      as premissas de projeção e gerar o Excel final.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
