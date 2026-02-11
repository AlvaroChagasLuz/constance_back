import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { SpreadsheetData } from '@/types/spreadsheet';
import { VirtualizedSpreadsheet } from '@/components/VirtualizedSpreadsheet';
import { ExcelUpload } from '@/components/ExcelUpload';
import { ConfirmationBanner } from '@/components/ConfirmationBanner';
import { FinancialModellingPanel } from '@/components/FinancialModellingPanel';
import { ProjectionAssumptions } from '@/components/ProjectionAssumptions';
import { RevenueDeductions } from '@/components/RevenueDeductions';
import { addProjectionColumns, applyRevenueProjection, applyDeductionsProjection } from '@/utils/projectionUtils';
import { buildAssumptionsSheet, type AssumptionEntry } from '@/utils/assumptionsSheetBuilder';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Table2, Settings2, ArrowLeft, BarChart3, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppStep = 'import' | 'confirm' | 'modelling' | 'assumptions' | 'deductions';
type RightTab = 'base' | 'financials' | 'assumptions';

const Index = () => {
  const [leftSpreadsheetData, setLeftSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [rightSpreadsheetData, setRightSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [baseSheetData, setBaseSheetData] = useState<SpreadsheetData | null>(null);
  const [originalRightData, setOriginalRightData] = useState<SpreadsheetData | null>(null);
  const [projectedBaseData, setProjectedBaseData] = useState<SpreadsheetData | null>(null);
  const [originalColCount, setOriginalColCount] = useState<number>(0);
  const [hasAppliedRevenue, setHasAppliedRevenue] = useState(false);
  const [step, setStep] = useState<AppStep>('import');
  const [activeRightTab, setActiveRightTab] = useState<RightTab>('financials');
  const [assumptionsSheetData, setAssumptionsSheetData] = useState<SpreadsheetData | null>(null);
  const [assumptionEntries, setAssumptionEntries] = useState<AssumptionEntry[]>([]);
  const { toast } = useToast();

  // Auto-copy left data to right whenever left changes during import step
  useEffect(() => {
    if (step !== 'import') return;

    if (leftSpreadsheetData) {
      const deepCopy = (src: SpreadsheetData): SpreadsheetData => ({
        values: src.values.map(row => [...row]),
        formats: src.formats?.map(row => row.map(f => f ? { ...f } : null)),
        mergedCells: src.mergedCells?.map(m => ({ ...m })),
        columnWidths: src.columnWidths ? [...src.columnWidths] : undefined,
        rowHeights: src.rowHeights ? [...src.rowHeights] : undefined,
        rowCount: src.rowCount,
        colCount: src.colCount,
        startRow: src.startRow,
        startCol: src.startCol,
      });
      const copiedData = deepCopy(leftSpreadsheetData);
      setBaseSheetData(deepCopy(leftSpreadsheetData));
      setRightSpreadsheetData(copiedData);
      setOriginalRightData(copiedData);
      setOriginalColCount(copiedData.colCount);
      setStep('confirm');
    } else {
      setRightSpreadsheetData(null);
      setBaseSheetData(null);
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
    setBaseSheetData(null);
    setOriginalRightData(null);
    setProjectedBaseData(null);
    setOriginalColCount(0);
    setHasAppliedRevenue(false);
    setActiveRightTab('financials');
    setAssumptionsSheetData(null);
    setAssumptionEntries([]);
    setStep('import');
  }, []);

  // Step 4: "Continuar" in modelling → add projection columns + advance to assumptions
  const handleModellingContinue = useCallback((years: number) => {
    if (!originalRightData) return;

    const projected = addProjectionColumns(originalRightData, years);
    setRightSpreadsheetData(projected);
    setProjectedBaseData(projected);
    setStep('assumptions');

    // Initialize the assumptions sheet (empty entries for now)
    const initialSheet = buildAssumptionsSheet([]);
    setAssumptionsSheetData(initialSheet);

    toast({
      title: `${years} ano${years > 1 ? 's' : ''} adicionado${years > 1 ? 's' : ''}!`,
      description: 'Defina as premissas de projeção.',
    });
  }, [originalRightData, toast]);

  // Step 5a: "Projetar Receita" — apply growth rate to revenue row
  const handleApplyRevenue = useCallback((revenueGrowthRate: number) => {
    if (!projectedBaseData) return;

    const projected = applyRevenueProjection(projectedBaseData, revenueGrowthRate, originalColCount);
    setRightSpreadsheetData(projected);
    setHasAppliedRevenue(true);

    // Update assumptions entries with the revenue growth rate
    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Taxa de Crescimento de Receita'),
      {
        category: 'Receita',
        label: 'Taxa de Crescimento de Receita',
        value: revenueGrowthRate,
        unit: '% a.a.',
      },
    ];
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    toast({
      title: 'Projeção de receita aplicada!',
      description: `Taxa de crescimento: ${revenueGrowthRate}% ao ano`,
    });
  }, [projectedBaseData, originalColCount, assumptionEntries, toast]);

  // Step 5b: "Continuar" — advance to deductions step
  const handleAssumptionsContinue = useCallback(() => {
    setStep('deductions');
    toast({
      title: 'Projeção de receita confirmada!',
      description: 'Defina as deduções sobre a receita bruta.',
    });
  }, [toast]);

  // Step 6a: Back from deductions to assumptions
  const handleDeductionsBack = useCallback(() => {
    setStep('assumptions');
  }, []);

  // Step 6b: Continue from deductions — apply deductions to grid
  const handleDeductionsContinue = useCallback((deductionsPercent: number) => {
    if (!rightSpreadsheetData) return;

    // Apply deductions projection to the spreadsheet
    const updated = applyDeductionsProjection(rightSpreadsheetData, deductionsPercent, originalColCount);
    setRightSpreadsheetData(updated);

    // Update assumptions entries
    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Deduções sobre Receita Bruta'),
      {
        category: 'Deduções',
        label: 'Deduções sobre Receita Bruta',
        value: deductionsPercent,
        unit: '% da Receita Bruta',
      },
    ];
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    toast({
      title: 'Deduções aplicadas!',
      description: `${deductionsPercent}% de deduções projetadas em todas as colunas.`,
    });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  // Left panel tab label & icon based on current step
  const getLeftTabConfig = () => {
    switch (step) {
      case 'modelling':
        return { label: 'Modelagem Financeira', Icon: TrendingUp };
      case 'assumptions':
        return { label: 'Premissas de Projeção', Icon: BarChart3 };
      case 'deductions':
        return { label: 'Deduções de Receita', Icon: BarChart3 };
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
      case 'deductions':
        return (
          <RevenueDeductions
            onBack={handleDeductionsBack}
            onContinue={handleDeductionsContinue}
          />
        );
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
      case 'deductions':
        return 'Receita projetada — Defina as deduções';
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
          {/* Sheet tabs */}
          <div className="flex items-center bg-muted/30 border-b border-border">
            {baseSheetData && (
              <button
                onClick={() => setActiveRightTab('base')}
                className={`px-3 py-1.5 text-xs font-medium border-r border-border flex items-center gap-1.5 transition-colors ${
                  activeRightTab === 'base'
                    ? 'bg-background text-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Table2 className="w-3.5 h-3.5 text-muted-foreground" />
                Base
              </button>
            )}
            <button
              onClick={() => setActiveRightTab('financials')}
              className={`px-3 py-1.5 text-xs font-medium border-r border-border flex items-center gap-1.5 transition-colors ${
                activeRightTab === 'financials'
                  ? 'bg-background text-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-accent" />
              Financials
            </button>
            {assumptionsSheetData && (
              <button
                onClick={() => setActiveRightTab('assumptions')}
                className={`px-3 py-1.5 text-xs font-medium border-r border-border flex items-center gap-1.5 transition-colors ${
                  activeRightTab === 'assumptions'
                    ? 'bg-background text-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                Premissas
              </button>
            )}
            {activeRightTab === 'financials' && rightSpreadsheetData && (
              <span className="text-xs text-muted-foreground ml-2">
                {rightSpreadsheetData.rowCount} linhas × {rightSpreadsheetData.colCount} colunas
              </span>
            )}
            {activeRightTab === 'base' && baseSheetData && (
              <span className="text-xs text-muted-foreground ml-2">
                {baseSheetData.rowCount} linhas × {baseSheetData.colCount} colunas
              </span>
            )}
            {activeRightTab === 'assumptions' && assumptionsSheetData && (
              <span className="text-xs text-muted-foreground ml-2">
                {assumptionEntries.length} premissa{assumptionEntries.length !== 1 ? 's' : ''} configurada{assumptionEntries.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Spreadsheet content */}
          <div className="flex-1 overflow-hidden border-t border-border relative">
            {step === 'confirm' && activeRightTab === 'financials' && (
              <ConfirmationBanner onConfirm={handleConfirm} onReject={handleReject} />
            )}
            {activeRightTab === 'financials' ? (
              rightSpreadsheetData ? (
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
              )
            ) : activeRightTab === 'base' ? (
              baseSheetData && (
                <VirtualizedSpreadsheet
                  data={baseSheetData}
                  totalRows={1000}
                  totalColumns={100}
                />
              )
            ) : (
              assumptionsSheetData && (
                <VirtualizedSpreadsheet
                  data={assumptionsSheetData}
                  totalRows={assumptionsSheetData.rowCount}
                  totalColumns={assumptionsSheetData.colCount}
                />
              )
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
