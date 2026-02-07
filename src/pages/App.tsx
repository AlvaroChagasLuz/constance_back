import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { SpreadsheetData } from '@/types/spreadsheet';
import { VirtualizedSpreadsheet } from '@/components/VirtualizedSpreadsheet';
import { ExcelUpload } from '@/components/ExcelUpload';
import { ConfirmationBanner } from '@/components/ConfirmationBanner';
import { FinancialModellingPanel } from '@/components/FinancialModellingPanel';
import { ProjectionAssumptions } from '@/components/ProjectionAssumptions';
import { addProjectionColumns, applyRevenueProjection } from '@/utils/projectionUtils';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Table2, Settings2, ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppStep = 'import' | 'confirm' | 'modelling' | 'assumptions';

const Index = () => {
  const [leftSpreadsheetData, setLeftSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [rightSpreadsheetData, setRightSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [originalRightData, setOriginalRightData] = useState<SpreadsheetData | null>(null);
  const [originalColCount, setOriginalColCount] = useState<number>(0);
  const [hasAppliedRevenue, setHasAppliedRevenue] = useState(false);
  const [step, setStep] = useState<AppStep>('import');
  const { toast } = useToast();

  // Auto-copy left data to right whenever left changes during import step
  useEffect(() => {
    if (step !== 'import') return;

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
      setOriginalRightData(copiedData);
      setOriginalColCount(copiedData.colCount);
      setStep('confirm');
    } else {
      setRightSpreadsheetData(null);
    }
  }, [leftSpreadsheetData]);

  const handleConfirm = useCallback(() => {
    setStep('modelling');
    toast({
      title: 'Dados confirmados!',
      description: 'Configure a modelagem financeira no painel esquerdo.',
    });
  }, [toast]);

  const handleReject = useCallback(() => {
    setLeftSpreadsheetData(null);
    setRightSpreadsheetData(null);
    setOriginalRightData(null);
    setOriginalColCount(0);
    setHasAppliedRevenue(false);
    setStep('import');
  }, []);

  // Step 4: "Continuar" in modelling → add projection columns + advance to assumptions
  const handleModellingContinue = useCallback((years: number) => {
    if (!originalRightData) return;

    const projected = addProjectionColumns(originalRightData, years);
    setRightSpreadsheetData(projected);
    setStep('assumptions');

    toast({
      title: `${years} ano${years > 1 ? 's' : ''} adicionado${years > 1 ? 's' : ''}!`,
      description: 'Defina as premissas de projeção.',
    });
  }, [originalRightData, toast]);

  // Step 5a: "Projetar Receita" — apply growth rate to revenue row
  const handleApplyRevenue = useCallback((revenueGrowthRate: number) => {
    if (!rightSpreadsheetData) return;

    const projected = applyRevenueProjection(rightSpreadsheetData, revenueGrowthRate, originalColCount);
    setRightSpreadsheetData(projected);
    setHasAppliedRevenue(true);

    toast({
      title: 'Projeção de receita aplicada!',
      description: `Taxa de crescimento: ${revenueGrowthRate}% ao ano`,
    });
  }, [rightSpreadsheetData, originalColCount, toast]);

  // Step 5b: "Continuar" — advance to next workflow step
  const handleAssumptionsContinue = useCallback(() => {
    // Future: advance to next workflow step (e.g., COGS, SG&A)
    toast({
      title: 'Premissas confirmadas!',
      description: 'Avançando para a próxima etapa.',
    });
  }, [toast]);

  // Left panel tab label & icon based on current step
  const getLeftTabConfig = () => {
    switch (step) {
      case 'modelling':
        return { label: 'Modelagem Financeira', Icon: TrendingUp };
      case 'assumptions':
        return { label: 'Premissas de Projeção', Icon: BarChart3 };
      default:
        return { label: 'Dados Importados', Icon: Table2 };
    }
  };

  const { label: leftTabLabel, Icon: LeftTabIcon } = getLeftTabConfig();

  // Render left panel content based on step
  const renderLeftPanel = () => {
    switch (step) {
      case 'modelling':
        return <FinancialModellingPanel onContinue={handleModellingContinue} />;
      case 'assumptions':
        return <ProjectionAssumptions onApply={handleApplyRevenue} onContinue={handleAssumptionsContinue} hasApplied={hasAppliedRevenue} />;
      default:
        return (
          <ExcelUpload
            data={leftSpreadsheetData}
            onDataLoaded={setLeftSpreadsheetData}
          />
        );
    }
  };

  // Footer status text
  const getFooterText = () => {
    switch (step) {
      case 'modelling':
        return 'Dados confirmados — Defina o número de anos';
      case 'assumptions':
        return 'Colunas projetadas — Defina as premissas';
      default:
        return leftSpreadsheetData
          ? `Importado: ${leftSpreadsheetData.rowCount} linhas × ${leftSpreadsheetData.colCount} colunas — Espelhado automaticamente`
          : 'Aguardando importação de dados...';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-muted/50 flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">Constance</span>
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
        {/* Left Panel */}
        <div className="w-[40%] border-r border-border flex flex-col">
          {/* Sheet tab */}
          <div className="flex items-center bg-muted/30 border-b border-border">
            <div className="px-3 py-1.5 text-xs font-medium bg-background border-r border-border flex items-center gap-1.5">
              <LeftTabIcon className="w-3.5 h-3.5 text-primary" />
              {leftTabLabel}
            </div>
          </div>

          {/* Left panel content */}
          <div className="flex-1 overflow-hidden">
            {renderLeftPanel()}
          </div>
        </div>

        {/* Right Panel */}
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
          <div className="flex-1 overflow-hidden border-t border-border relative">
            {step === 'confirm' && (
              <ConfirmationBanner onConfirm={handleConfirm} onReject={handleReject} />
            )}
            {rightSpreadsheetData ? (
              <VirtualizedSpreadsheet
                data={rightSpreadsheetData}
                totalRows={1000}
                totalColumns={100}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Cole seus dados do Excel no painel esquerdo
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 px-3 py-1 flex items-center text-xs text-muted-foreground">
        <span className="px-2 py-0.5 bg-muted rounded mr-2">fx</span>
        <span>{getFooterText()}</span>
      </footer>
    </div>
  );
};

export default Index;
